package com.docvault.esb.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_resource",  columnList = "resourceType,resourceId"),
    @Index(name = "idx_audit_user",      columnList = "userId"),
    @Index(name = "idx_audit_occurred",  columnList = "occurredAt")
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLogEntity {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false) private String eventType;
    @Column(nullable = false) private String resourceType;
    private String resourceId;
    private String resourceTitle;
    private String userId;
    private String userEmail;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    private Instant occurredAt;
}
