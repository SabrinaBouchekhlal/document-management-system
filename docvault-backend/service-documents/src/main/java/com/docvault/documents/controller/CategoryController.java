package com.docvault.documents.controller;

import com.docvault.documents.entity.CategoryEntity;
import com.docvault.documents.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository catRepo;

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(Map.of("success", true, "data", catRepo.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return catRepo.findById(id)
                .map(c -> ResponseEntity.ok(Map.of("success", true, "data", c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody CategoryEntity cat,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        if (catRepo.existsByName(cat.getName()))
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Category already exists"));
        return ResponseEntity.status(201).body(Map.of("success", true, "data", catRepo.save(cat)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        return catRepo.findById(id).map(c -> {
            if (body.containsKey("name"))  c.setName(body.get("name"));
            if (body.containsKey("color")) c.setColor(body.get("color"));
            if (body.containsKey("icon"))  c.setIcon(body.get("icon"));
            return ResponseEntity.ok(Map.of("success", true, "data", catRepo.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", defaultValue = "user") String role) {
        if (!"admin".equals(role))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Admin only"));
        if (!catRepo.existsById(id))
            return ResponseEntity.notFound().build();
        catRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Deleted"));
    }
}
