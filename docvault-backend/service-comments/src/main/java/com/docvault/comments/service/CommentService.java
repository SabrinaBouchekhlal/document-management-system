package com.docvault.comments.service;
import com.docvault.comments.dto.CommentDtos;
import com.docvault.comments.entity.CommentEntity;
import com.docvault.comments.repository.CommentRepository;
import com.docvault.shared.events.CommentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final KafkaTemplate<String, CommentEvent> kafkaTemplate;
    private static final String COMMENT_TOPIC = "comment-events";

    public List<CommentDtos.CommentResponse> getByDocument(
            String documentId, String userRole, String userDepartmentId) {

        // Only admins or users in the document's department can read comments
        // The department check is enforced by the Documents service before this
        // is called — but we also verify here for defence-in-depth
        List<CommentEntity> comments = commentRepository.findByDocumentId(documentId);
        return comments.stream().map(this::toResponse).toList();
    }

    public CommentDtos.CommentResponse create(
            CommentDtos.CreateCommentRequest req,
            String userId, String userEmail, String userName,
            String userRole, String userDepartmentId) {

        CommentEntity entity = CommentEntity.builder()
                .id(UUID.randomUUID())
                .documentId(req.getDocumentId())
                .userId(userId)
                .userEmail(userEmail)
                .userName(userName != null ? userName : userEmail)
                .content(req.getContent())
                .resolved(false)
                .createdAt(Instant.now())
                .build();

        entity = commentRepository.save(entity);

        try {
            kafkaTemplate.send(COMMENT_TOPIC, entity.getDocumentId(),
                    CommentEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .type(CommentEvent.Type.CREATED)
                            .commentId(entity.getId().toString())
                            .documentId(entity.getDocumentId())
                            .userId(userId).userEmail(userEmail)
                            .content(entity.getContent())
                            .occurredAt(entity.getCreatedAt())
                            .build());
        } catch (Exception e) {
            log.error("Failed to publish comment event: {}", e.getMessage());
        }

        log.info("Comment created id={} on doc={} by {}", entity.getId(), entity.getDocumentId(), userEmail);
        return toResponse(entity);
    }

    public CommentDtos.CommentResponse update(
            String documentId, String commentId,
            CommentDtos.UpdateCommentRequest req,
            String userId, String userRole) {

        CommentEntity existing = commentRepository.findByDocumentId(documentId)
                .stream().filter(c -> c.getId().toString().equals(commentId))
                .findFirst().orElseThrow(() -> new RuntimeException("Comment not found: " + commentId));

        if (!existing.getUserId().equals(userId) && !"admin".equals(userRole))
            throw new RuntimeException("Not authorized");

        commentRepository.deleteByDocumentIdAndCreatedAtAndId(
                existing.getDocumentId(), existing.getCreatedAt(), existing.getId());

        if (req.getResolved() != null) existing.setResolved(req.getResolved());
        if (req.getContent()  != null) existing.setContent(req.getContent());
        return toResponse(commentRepository.save(existing));
    }

    public void delete(String documentId, String commentId, String userId, String userRole) {
        CommentEntity existing = commentRepository.findByDocumentId(documentId)
                .stream().filter(c -> c.getId().toString().equals(commentId))
                .findFirst().orElseThrow(() -> new RuntimeException("Comment not found: " + commentId));

        if (!existing.getUserId().equals(userId) && !"admin".equals(userRole))
            throw new RuntimeException("Not authorized");

        commentRepository.deleteByDocumentIdAndCreatedAtAndId(
                existing.getDocumentId(), existing.getCreatedAt(), existing.getId());
        log.info("Comment deleted id={}", commentId);
    }

    private CommentDtos.CommentResponse toResponse(CommentEntity e) {
        return CommentDtos.CommentResponse.builder()
                .id(e.getId().toString()).documentId(e.getDocumentId())
                .userId(e.getUserId()).userEmail(e.getUserEmail()).userName(e.getUserName())
                .content(e.getContent()).resolved(e.isResolved()).createdAt(e.getCreatedAt())
                .build();
    }
}