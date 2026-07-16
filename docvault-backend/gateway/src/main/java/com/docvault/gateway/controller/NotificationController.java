// gateway/src/main/java/com/docvault/gateway/controller/NotificationController.java
package com.docvault.gateway.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String userId) {
        return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id,
                                    @RequestBody(required = false) Map<?,?> body) {
        return ResponseEntity.ok(Map.of("success", true));
    }
}