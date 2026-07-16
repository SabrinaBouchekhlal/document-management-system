package com.docvault.comments.dto;

import lombok.*;
import java.time.Instant;

public class CommentDtos {
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CreateCommentRequest {
        private String documentId;
        private String content;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateCommentRequest {
        private Boolean resolved;
        private String content;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CommentResponse {
        private String id;
        private String documentId;
        private String userId;
        private String userEmail;
        private String userName;
        private String content;
        private boolean resolved;
        private Instant createdAt;
    }
}
