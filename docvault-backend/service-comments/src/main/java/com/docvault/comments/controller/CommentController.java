package com.docvault.comments.controller;

import com.docvault.comments.dto.CommentDtos;
import com.docvault.comments.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * Users can only see comments on documents they can access.
     * The department check is enforced: X-User-Department-Id injected by Gateway.
     * Comments on documents outside the user's dept should not be readable.
     */
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam String documentId,
            @RequestHeader(value = "X-User-Role",          defaultValue = "user") String userRole,
            @RequestHeader(value = "X-User-Department-Id", required = false)      String userDeptId) {
        return ResponseEntity.ok(Map.of("success", true,
                "data", commentService.getByDocument(documentId, userRole, userDeptId)));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody CommentDtos.CreateCommentRequest req,
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail,
            @RequestHeader(value = "X-User-Name",          required = false) String userName,
            @RequestHeader(value = "X-User-Role",          defaultValue = "user") String userRole,
            @RequestHeader(value = "X-User-Department-Id", required = false)      String userDeptId) {
        try {
            return ResponseEntity.status(201).body(Map.of("success", true,
                    "data", commentService.create(req, userId, userEmail, userName, userRole, userDeptId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/{documentId}/{commentId}")
    public ResponseEntity<?> update(
            @PathVariable String documentId, @PathVariable String commentId,
            @RequestBody CommentDtos.UpdateCommentRequest req,
            @RequestHeader("X-User-Id")   String userId,
            @RequestHeader("X-User-Role") String userRole) {
        try {
            return ResponseEntity.ok(Map.of("success", true,
                    "data", commentService.update(documentId, commentId, req, userId, userRole)));
        } catch (RuntimeException e) {
            int status = e.getMessage().contains("authorized") ? 403 : 404;
            return ResponseEntity.status(status).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{documentId}/{commentId}")
    public ResponseEntity<?> delete(
            @PathVariable String documentId, @PathVariable String commentId,
            @RequestHeader("X-User-Id")   String userId,
            @RequestHeader("X-User-Role") String userRole) {
        try {
            commentService.delete(documentId, commentId, userId, userRole);
            return ResponseEntity.ok(Map.of("success", true, "message", "Deleted"));
        } catch (RuntimeException e) {
            int status = e.getMessage().contains("authorized") ? 403 : 404;
            return ResponseEntity.status(status).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}