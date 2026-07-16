package com.docvault.documents.controller;

import com.docvault.documents.dto.DocumentDtos;
import com.docvault.documents.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PresignedAndVersionController {

    private final DocumentService documentService;

    @PostMapping("/api/presigned/upload")
    public ResponseEntity<?> uploadUrl(@RequestBody DocumentDtos.PresignedUrlRequest req) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data",
                    documentService.generateUploadUrl(req)));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/api/versions")
    public ResponseEntity<?> listVersions(@RequestParam String documentId) {
        return ResponseEntity.ok(Map.of("success", true,
                "data", documentService.getVersions(documentId)));
    }

    @PostMapping("/api/versions")
    public ResponseEntity<?> createVersion(
            @RequestBody DocumentDtos.NewVersionRequest req,
            @RequestParam String documentId,
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail) {
        try {
            return ResponseEntity.status(201).body(Map.of("success", true,
                    "data", documentService.createVersion(documentId, req, userId, userEmail)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
