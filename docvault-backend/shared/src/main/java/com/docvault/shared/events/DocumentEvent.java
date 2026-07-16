package com.docvault.shared.events;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentEvent {
    public enum Type { CREATED, UPDATED, DELETED, DOWNLOADED, VIEWED }

    private String eventId;
    private Type type;
    private String documentId;
    private String documentTitle;
    private String documentDescription;
    private String categoryId;
    private String fileType;
    private Long fileSize;
    private String s3Key;
    private String userId;
    private String userEmail;
    private Instant occurredAt;
}
