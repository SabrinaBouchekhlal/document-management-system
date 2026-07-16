package com.docvault.documents.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents", indexes = {
    @Index(name = "idx_doc_status", columnList = "status"),
    @Index(name = "idx_doc_category", columnList = "categoryId"),
    @Index(name = "idx_doc_uploader", columnList = "uploadedBy")
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String categoryId;
    private String departmentId;
    private String uploadedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private String fileType;
    private Long fileSize;
    private String s3Key;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Column(columnDefinition = "TEXT")
    private String aiSummaryFr;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "document_tags", joinColumns = @JoinColumn(name = "document_id"))
    @Column(name = "tag")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default private Integer currentVersion = 1;
    @Builder.Default private Long views = 0L;
    @Builder.Default private Long downloads = 0L;

    @CreationTimestamp private Instant createdAt;
    @UpdateTimestamp   private Instant updatedAt;

    public enum Status { draft, published, archived }
}
