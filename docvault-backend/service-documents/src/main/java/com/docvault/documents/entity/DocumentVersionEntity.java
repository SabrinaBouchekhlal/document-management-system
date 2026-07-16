package com.docvault.documents.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "document_versions", indexes = {
    @Index(name = "idx_version_doc", columnList = "documentId")
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentVersionEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false) private String documentId;
    @Column(nullable = false) private Integer version;
    private String uploadedBy;

    @Column(columnDefinition = "TEXT")
    private String changelog;

    private Long fileSize;
    private String s3Key;

    @CreationTimestamp private Instant createdAt;
}
