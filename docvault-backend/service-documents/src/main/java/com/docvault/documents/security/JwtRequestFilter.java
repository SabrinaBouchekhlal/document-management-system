package com.docvault.documents.security;

import com.docvault.shared.jwt.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtRequestFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        // ── Path 1: request came through the gateway (headers already injected) ──
        String userId = request.getHeader("X-User-Id");
        if (userId != null && !userId.isBlank()) {
            String role  = request.getHeader("X-User-Role");
            String email = request.getHeader("X-User-Email");

            // ★ THIS WAS MISSING — set authentication so Spring Security allows the request
            setAuthentication(userId, email, role);

            log.debug("JWT filter docs – trusted gateway path, userId={}, role={}", userId, role);
            chain.doFilter(request, response);
            SecurityContextHolder.clearContext();
            return;
        }

        // ── Path 2: direct call, validate JWT ourselves ───────────────────────
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "Missing Authorization header");
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            sendUnauthorized(response, "Invalid or expired JWT");
            return;
        }

        Claims claims = jwtUtil.validateAndParse(token);
        String claimUserId = claims.getSubject();
        String claimEmail  = claims.get("email", String.class);
        String claimRole   = claims.get("role",  String.class);

        // ★ THIS WAS MISSING — set authentication so Spring Security allows the request
        setAuthentication(claimUserId, claimEmail, claimRole);

        // Wrap request so controllers read headers uniformly
        HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
            @Override
            public String getHeader(String name) {
                return switch (name) {
                    case "X-User-Id"    -> claimUserId;
                    case "X-User-Email" -> claimEmail;
                    case "X-User-Role"  -> claimRole;
                    default             -> super.getHeader(name);
                };
            }
        };

        log.debug("JWT filter docs – direct path, userId={}, role={}", claimUserId, claimRole);
        chain.doFilter(wrapped, response);
        SecurityContextHolder.clearContext();
    }

    private void setAuthentication(String userId, String email, String role) {
        String springRole = (role != null && !role.startsWith("ROLE_"))
                ? "ROLE_" + role.toUpperCase()
                : role;
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority(springRole))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void sendUnauthorized(HttpServletResponse response, String msg) throws IOException {
        response.setStatus(401);
        response.setContentType("application/json");
        response.getWriter().write("{\"success\":false,\"message\":\"" + msg + "\"}");
    }
}