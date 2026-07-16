package com.docvault.shared.events;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CommentEvent {
    public enum Type { CREATED, DELETED, RESOLVED }

    private String eventId;
    private Type type;
    private String commentId;
    private String documentId;
    private String userId;
    private String userEmail;
    private String content;
    private Instant occurredAt;
}
