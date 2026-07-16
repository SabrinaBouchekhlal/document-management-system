package com.docvault.gateway.controller;

import com.docvault.gateway.dto.AuthDtos;
import com.docvault.gateway.entity.UserEntity;
import com.docvault.gateway.repository.UserRepository;
import com.docvault.gateway.service.AuthService;
import com.docvault.shared.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService    authService;
    private final JwtUtil        jwtUtil;
    private final UserRepository userRepository;

    /** C1 + C2: Login — returns JWT */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthDtos.LoginRequest req) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", authService.login(req)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** C2: Register new user */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthDtos.RegisterRequest req) {
        try {
            return ResponseEntity.status(201)
                    .body(Map.of("success", true, "data", authService.register(req)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** Logout — blacklists token */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader("Authorization") String auth,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        String token = auth.substring(7);
        String uid   = userId != null ? userId : jwtUtil.extractUserId(token);
        authService.logout(uid, token);
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
    }

    /** Validate a token — used by downstream services */
    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader("Authorization") String auth) {
        try {
            String token  = auth.substring(7);
            if (!jwtUtil.isValid(token) || authService.isTokenBlacklisted(token))
                return ResponseEntity.status(401).body(Map.of("valid", false));
            var claims = jwtUtil.validateAndParse(token);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "userId", claims.getSubject(),
                    "email",  claims.get("email"),
                    "role",   claims.get("role")));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", e.getMessage()));
        }
    }

    /** Admin: list all users */
    @GetMapping("/users")
    public ResponseEntity<?> listUsers(
            @RequestHeader(value = "Authorization", required = false) String auth) {

        System.out.println("AUTH HEADER = " + auth);

        if (auth == null || !auth.startsWith("Bearer "))
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Missing token"));

        String role = jwtUtil.extractRole(auth.substring(7));

        System.out.println("ROLE = " + role);

        if (!"admin".equals(role))
            return ResponseEntity.status(403)
                    .body(Map.of("success", false, "message", "Admin only"));

        List<AuthDtos.UserDto> users = userRepository.findAll().stream()
                .map(u -> AuthDtos.UserDto.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .role(u.getRole().name())
                        .springRoles(u.getSpringRoles())
                        .status(u.getStatus().name())
                        .departmentId(u.getDepartmentId())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", users
        ));
    }

    @PatchMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(
            @PathVariable String userId,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer "))
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Missing token"));
        String role = jwtUtil.extractRole(auth.substring(7));
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));

        return userRepository.findById(userId).map(u -> {
            if (body.containsKey("departmentId"))
                u.setDepartmentId((String) body.get("departmentId"));
            if (body.containsKey("name"))
                u.setName((String) body.get("name"));
            if (body.containsKey("status"))
                u.setStatus(UserEntity.Status.valueOf((String) body.get("status")));
            if (body.containsKey("role"))
                u.setRole(UserEntity.Role.valueOf((String) body.get("role")));
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("success", true, "message", "User updated"));
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUser(
            @PathVariable String userId,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer "))
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Missing token"));
        return userRepository.findById(userId).map(u ->
            ResponseEntity.ok(Map.of("success", true, "data", AuthDtos.UserDto.builder()
                .id(u.getId()).name(u.getName()).email(u.getEmail())
                .role(u.getRole().name()).springRoles(u.getSpringRoles())
                .status(u.getStatus().name()).departmentId(u.getDepartmentId()).build()))
        ).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(
            @PathVariable String userId,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer "))
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Missing token"));
        String role = jwtUtil.extractRole(auth.substring(7));
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        if (!userRepository.existsById(userId))
            return ResponseEntity.notFound().build();
        userRepository.deleteById(userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "User deleted"));
    }

    /** Admin: assign user to department */
    @PatchMapping("/users/{userId}/department")
    public ResponseEntity<?> assignDepartment(
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String auth) {  // ← fix this
        if (auth == null || !auth.startsWith("Bearer "))
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Missing token"));
        String role = jwtUtil.extractRole(auth.substring(7));
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        return userRepository.findById(userId).map(u -> {
            u.setDepartmentId(body.get("departmentId"));
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("success", true, "message", "Department assigned"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "auth-gateway"));
    }
}
