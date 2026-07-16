package com.docvault.gateway.dto;

import lombok.*;
import java.util.Set;

public class AuthDtos {

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }

    /** C2: register endpoint */
    
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        private String name;
        private String email;
        private String password;
        private String role;
        private String departmentId;  // ← add
        private String status;        // ← add
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        private String accessToken;
        private String tokenType;
        private long   expiresIn;
        private UserDto user;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserDto {
        private String      id;
        private String      name;
        private String      email;
        private String      role;
        private Set<String> springRoles;   // ROLE_USER, ROLE_ADMIN
        private String      status;
        private String      departmentId;
    }
}
