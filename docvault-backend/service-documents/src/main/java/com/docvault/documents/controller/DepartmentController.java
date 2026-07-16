package com.docvault.documents.controller;

import com.docvault.documents.entity.DepartmentEntity;
import com.docvault.documents.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository deptRepo;

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(Map.of("success", true, "data", deptRepo.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return deptRepo.findById(id)
                .map(d -> ResponseEntity.ok(Map.of("success", true, "data", d)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody DepartmentEntity dept,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        if (deptRepo.existsByName(dept.getName()))
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Department already exists"));
        return ResponseEntity.status(201).body(Map.of("success", true, "data", deptRepo.save(dept)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        return deptRepo.findById(id).map(d -> {
            if (body.containsKey("name"))        d.setName(body.get("name"));
            if (body.containsKey("description")) d.setDescription(body.get("description"));
            return ResponseEntity.ok(Map.of("success", true, "data", deptRepo.save(d)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        if (!deptRepo.existsById(id))
            return ResponseEntity.notFound().build();
        deptRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Deleted"));
    }
}
