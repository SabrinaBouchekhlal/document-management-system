package com.docvault.documents.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

public class DocumentDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CreateDocumentRequest {
        private String title;
        private String description;
        private String categoryId;
        private String departmentId;
        private String fileType;
        private Long   fileSize;
        private List<String> tags;
        private String status;
        private String s3Key;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UpdateDocumentRequest {
        private String title;
        private String description;
        private String categoryId;
        private String departmentId;
        private List<String> tags;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DocumentResponse {
        private String id;
        private String title;
        private String description;
        private String categoryId;
        private String departmentId;
        private String uploadedBy;
        private String status;
        private String fileType;
        private Long   fileSize;
        private String s3Key;
        private List<String> tags;
        private Integer currentVersion;
        private Long views;
        private Long downloads;
        private String aiSummary;
        private String aiSummaryFr;
        private String downloadUrl;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VersionResponse {
        private String id;
        private String documentId;
        private Integer version;
        private String uploadedBy;
        private String changelog;
        private Long fileSize;
        private Instant createdAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PresignedUrlRequest {
        private String documentId;
        private String fileName;
        private String contentType;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PresignedUrlResponse {
        private String s3Key;
        private String uploadUrl;
        private long   expiresInMinutes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NewVersionRequest {
        private String changelog;
        private String s3Key;
        private Long   fileSize;
    }
}
