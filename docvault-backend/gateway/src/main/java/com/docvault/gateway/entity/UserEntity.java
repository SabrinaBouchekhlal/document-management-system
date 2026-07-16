package com.docvault.gateway.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    /** BCrypt embeds the salt — kept for explicit audit/compliance */
    @Column
    private String salt;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private String departmentId;

    /** C2: track last login / logout timestamps */
    private Instant lastLogin;
    private Instant lastLogout;

    @CreationTimestamp private Instant createdAt;
    @UpdateTimestamp   private Instant updatedAt;

    public enum Role   { user, admin }
    public enum Status { active, suspended }

    /** C1: hardcoded seed users — role helpers */
    public Set<String> getSpringRoles() {
        Set<String> roles = new HashSet<>();
        roles.add("ROLE_USER");
        if (this.role == Role.admin) roles.add("ROLE_ADMIN");
        return roles;
    }
}
