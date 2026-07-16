package com.docvault.documents.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "categories")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CategoryEntity {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    private String color;   // hex e.g. "#6366f1"
    private String icon;

    @Builder.Default
    private Integer docCount = 0;

    @CreationTimestamp
    private Instant createdAt;
}
