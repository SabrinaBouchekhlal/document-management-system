package com.docvault.documents.controller;

import com.docvault.documents.dto.DocumentDtos;
import com.docvault.documents.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "published") String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoryId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Role",         defaultValue = "user") String userRole,
            @RequestHeader(value = "X-User-Department-Id",required = false)      String userDeptId) {

        System.out.println("ROLE HEADER = " + userRole);

        Page<DocumentDtos.DocumentResponse> result =
                documentService.listDocuments(status, q, categoryId, page, size, userRole, userDeptId);
        return ResponseEntity.ok(Map.of(
                "success", true, "data", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(), "page", page));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role",         defaultValue = "user") String userRole,
            @RequestHeader(value = "X-User-Department-Id",required = false)      String userDeptId) {

        System.out.println("ROLE HEADER = " + userRole);
        try {
            return ResponseEntity.ok(Map.of("success", true,
                    "data", documentService.getDocument(id, userRole, userDeptId)));
        } catch (DocumentService.ForbiddenException e) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody DocumentDtos.CreateDocumentRequest req,
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail,
            @RequestHeader(value = "X-User-Department-Id", required = false) String userDeptId) {
        try {
            return ResponseEntity.status(201).body(Map.of("success", true,
                    "data", documentService.createDocument(req, userId, userEmail, userDeptId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody DocumentDtos.UpdateDocumentRequest req,
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail) {
        try {
            return ResponseEntity.ok(Map.of("success", true,
                    "data", documentService.updateDocument(id, req, userId, userEmail)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail) {
        try {
            documentService.deleteDocument(id, userId, userEmail);
            return ResponseEntity.ok(Map.of("success", true, "message", "Deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable String id) {
        try {
            String url = documentService.generateDownloadUrl(id);
            return ResponseEntity.ok(Map.of("success", true,
                    "data", Map.of("downloadUrl", url, "expiresInMinutes", 60)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** Called by Python AI consumer to save summary */
    @PostMapping("/{id}/ai-summary")
    public ResponseEntity<?> saveAiSummary(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        documentService.saveAiSummary(id, body.get("summary"), body.get("summaryFr"));
        return ResponseEntity.ok(Map.of("success", true));
    }
}
