package com.docvault.documents.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "departments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DepartmentEntity {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private Integer memberCount = 0;

    @CreationTimestamp
    private Instant createdAt;
}
