package com.docvault.gateway.filter;

import com.docvault.gateway.repository.UserRepository;
import com.docvault.gateway.service.AuthService;
import com.docvault.shared.jwt.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component("JwtAuthFilter")
@Slf4j
public class JwtAuthFilter extends AbstractGatewayFilterFactory<JwtAuthFilter.Config> {

    private final JwtUtil        jwtUtil;
    private final AuthService    authService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, AuthService authService,
                         UserRepository userRepository) {
        super(Config.class);
        this.jwtUtil        = jwtUtil;
        this.authService    = authService;
        this.userRepository = userRepository;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {

            log.info("========== JWT FILTER ==========");
            log.info("PATH = {}", exchange.getRequest().getPath());

            String authHeader = exchange.getRequest().getHeaders()
                    .getFirst(HttpHeaders.AUTHORIZATION);

            log.info("AUTH HEADER = {}", authHeader);

            if (authHeader == null || !authHeader.startsWith("Bearer "))
                return unauthorized(exchange, "Missing Authorization header");

            String token = authHeader.substring(7);

            

            log.info("TOKEN RECEIVED = {}", token);
            log.info("VALID TOKEN ? = {}", jwtUtil.isValid(token));
            log.info("TOKEN = {}", token);

            if (!jwtUtil.isValid(token))
                return unauthorized(exchange, "Invalid or expired token");

            if (authService.isTokenBlacklisted(token))
                return unauthorized(exchange, "Token revoked");

            String userId = jwtUtil.extractUserId(token);
            String email  = jwtUtil.extractEmail(token);
            String role   = jwtUtil.extractRole(token);

            log.info("USER ID = {}", userId);
            log.info("EMAIL = {}", email);
            log.info("ROLE FROM TOKEN = {}", role);

            String departmentId = userRepository.findById(userId)
                    .map(u -> u.getDepartmentId() != null ? u.getDepartmentId() : "")
                    .orElse("");

            log.info("DEPARTMENT ID = {}", departmentId);

            ServerWebExchange mutated = exchange.mutate()
                    .request(r -> r.headers(h -> {
                        h.remove("X-User-Role");
                        h.add("X-User-Role", role);

                        h.remove("X-User-Id");
                        h.add("X-User-Id", userId);

                        h.remove("X-User-Email");
                        h.add("X-User-Email", email);

                        h.remove("X-User-Department-Id");
                        h.add("X-User-Department-Id", departmentId);
                    })).build();

            log.info("HEADERS INJECTED SUCCESSFULLY");

            return chain.filter(mutated);
        };
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        log.warn("Unauthorized: {}", message);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        byte[] body = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes();
        return exchange.getResponse()
                .writeWith(Mono.just(exchange.getResponse()
                        .bufferFactory().wrap(body)));
    }

    public static class Config {}
}
