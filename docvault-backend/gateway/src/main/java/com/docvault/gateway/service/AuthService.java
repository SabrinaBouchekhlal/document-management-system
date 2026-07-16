package com.docvault.gateway.service;

import com.docvault.gateway.dto.AuthDtos;
import com.docvault.gateway.entity.UserEntity;
import com.docvault.gateway.repository.UserRepository;
import com.docvault.shared.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository   userRepository;
    private final JwtUtil          jwtUtil;
    private final PasswordEncoder  passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;

    private static final long   JWT_EXPIRY_SECONDS = 3600;
    private static final String BLACKLIST_PREFIX   = "jwt:blacklist:";

    // ── C1 / C2: Login ────────────────────────────────────────────────────────
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (user.getStatus() == UserEntity.Status.suspended)
            throw new RuntimeException("Account is suspended");

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new RuntimeException("Invalid credentials");

        // C2: update last_login
        user.setLastLogin(Instant.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(
                user.getId(), user.getEmail(), user.getRole().name());

        // Cache role in Redis for fast gateway lookups
        redisTemplate.opsForValue().set(
                "user:" + user.getId(), user.getRole().name(),
                Duration.ofSeconds(JWT_EXPIRY_SECONDS));

        log.info("User {} logged in [role={}]", user.getEmail(), user.getRole());
        return buildResponse(token, user);
    }

    // ── C2: Register ──────────────────────────────────────────────────────────
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered");

        // C2: explicit BCrypt salt (BCrypt.gensalt())
        String salt       = BCrypt.gensalt(12);
        String hashed     = BCrypt.hashpw(request.getPassword(), salt);

        UserEntity user = userRepository.save(UserEntity.builder()
                .email(request.getEmail())
                .name(request.getName())
                .passwordHash(hashed)
                .salt(salt)
                .role("admin".equals(request.getRole())
                        ? UserEntity.Role.admin : UserEntity.Role.user)
                .status(request.getStatus() != null        // ← add
                        ? UserEntity.Status.valueOf(request.getStatus())
                        : UserEntity.Status.active)
                .departmentId(request.getDepartmentId())   // ← add
                .build());

        String token = jwtUtil.generateToken(
                user.getId(), user.getEmail(), user.getRole().name());

        log.info("Registered new user {} [role={}]", user.getEmail(), user.getRole());
        return buildResponse(token, user);
    }

    // ── Logout — blacklist token ──────────────────────────────────────────────
    public void logout(String userId, String token) {
        redisTemplate.opsForValue().set(
                BLACKLIST_PREFIX + token.hashCode(), "blacklisted",
                Duration.ofSeconds(JWT_EXPIRY_SECONDS));

        // C2: update last_logout
        userRepository.findById(userId).ifPresent(u -> {
            u.setLastLogout(Instant.now());
            userRepository.save(u);
        });
        log.info("User {} logged out, token blacklisted", userId);
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(
                redisTemplate.hasKey(BLACKLIST_PREFIX + token.hashCode()));
    }

    // ── Seed default users (C1-style hardcoded, C2-stored in DB) ─────────────
    public void seedDefaultUsers() {
        if (userRepository.count() == 0) {
            // admin → ROLE_ADMIN + ROLE_USER
            String adminSalt = BCrypt.gensalt(12);
            userRepository.save(UserEntity.builder()
                    .email("admin@docvault.com").name("Alice Admin")
                    .passwordHash(BCrypt.hashpw("admin123", adminSalt))
                    .salt(adminSalt)
                    .role(UserEntity.Role.admin)
                    .status(UserEntity.Status.active).build());

            // user → ROLE_USER only
            String userSalt = BCrypt.gensalt(12);
            userRepository.save(UserEntity.builder()
                    .email("bob@docvault.com").name("Bob Builder")
                    .passwordHash(BCrypt.hashpw("user123", userSalt))
                    .salt(userSalt)
                    .role(UserEntity.Role.user)
                    .status(UserEntity.Status.active).build());

            log.info("Seeded default users (admin + user)");
        }
    }

    private AuthDtos.AuthResponse buildResponse(String token, UserEntity user) {
        return AuthDtos.AuthResponse.builder()
                .accessToken(token).tokenType("Bearer")
                .expiresIn(JWT_EXPIRY_SECONDS)
                .user(AuthDtos.UserDto.builder()
                        .id(user.getId()).name(user.getName())
                        .email(user.getEmail()).role(user.getRole().name())
                        .springRoles(user.getSpringRoles())
                        .status(user.getStatus().name())
                        .departmentId(user.getDepartmentId()).build())
                .build();
    }
}
