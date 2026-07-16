package com.docvault.esb.consumer;

import com.docvault.esb.entity.AuditLogEntity;
import com.docvault.esb.repository.AuditLogRepository;
import com.docvault.shared.events.CommentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class CommentEventConsumer {

    private final AuditLogRepository auditLogRepository;
    private final RedisTemplate<String, String> redisTemplate;

    @KafkaListener(
        topics = "comment-events",
        groupId = "esb-comment-audit",
        containerFactory = "commentKafkaListenerContainerFactory"
    )
    public void onCommentEvent(@Payload CommentEvent event) {
        log.info("[ESB] CommentEvent received: type={} commentId={} docId={}",
                event.getType(), event.getCommentId(), event.getDocumentId());

        // 1. Audit log
        try {
            auditLogRepository.save(AuditLogEntity.builder()
                    .eventType("COMMENT_" + event.getType().name())
                    .resourceType("comment")
                    .resourceId(event.getCommentId())
                    .resourceTitle("Comment on document " + event.getDocumentId())
                    .userId(event.getUserId())
                    .userEmail(event.getUserEmail())
                    .metadata(String.format(
                        "{\"eventId\":\"%s\",\"documentId\":\"%s\"}",
                        event.getEventId(), event.getDocumentId()))
                    .occurredAt(event.getOccurredAt() != null ? event.getOccurredAt() : Instant.now())
                    .build());
        } catch (Exception e) {
            log.error("[ESB] Audit log write failed: {}", e.getMessage());
        }

        // 2. Redis pub/sub fan-out for real-time notifications
        if (event.getType() == CommentEvent.Type.CREATED) {
            String channel = "notifications:" + event.getDocumentId();
            String payload = String.format(
                "{\"type\":\"COMMENT_ADDED\",\"documentId\":\"%s\",\"userId\":\"%s\",\"commentId\":\"%s\"}",
                event.getDocumentId(), event.getUserId(), event.getCommentId());

            try {
                redisTemplate.convertAndSend(channel, payload);

                // Also store in Redis list for polling (24h TTL)
                String listKey = "notif:doc:" + event.getDocumentId();
                redisTemplate.opsForList().leftPush(listKey, payload);
                redisTemplate.expire(listKey, Duration.ofHours(24));

                log.info("[ESB] Notification published to channel={}", channel);
            } catch (Exception e) {
                log.error("[ESB] Redis notification failed: {}", e.getMessage());
            }
        }
    }
}
