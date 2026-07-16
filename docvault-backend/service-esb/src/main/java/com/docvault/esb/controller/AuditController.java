package com.docvault.esb.controller;

import com.docvault.esb.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping("/audit")
    public ResponseEntity<?> getAuditLog(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {

        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));

        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt"));
        var result   = auditLogRepository.findAll(pageable);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages()));
    }

    @GetMapping("/audit/document/{docId}")
    public ResponseEntity<?> getByDocument(@PathVariable String docId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt"));
        var result   = auditLogRepository.findByResourceTypeAndResourceId("document", docId, pageable);
        return ResponseEntity.ok(Map.of("success", true, "data", result.getContent(),
                "totalElements", result.getTotalElements()));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "esb"));
    }
}
