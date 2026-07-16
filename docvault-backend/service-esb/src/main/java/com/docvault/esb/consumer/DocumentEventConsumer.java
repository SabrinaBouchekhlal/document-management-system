package com.docvault.esb.consumer;

import com.docvault.esb.entity.AuditLogEntity;
import com.docvault.esb.repository.AuditLogRepository;
import com.docvault.shared.events.DocumentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentEventConsumer {

    private final AuditLogRepository auditLogRepository;

    @KafkaListener(
        topics = "document-events",
        groupId = "esb-document-audit",
        containerFactory = "documentKafkaListenerContainerFactory"
    )
    public void onDocumentEvent(
            @Payload DocumentEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("[ESB] DocumentEvent received: type={} docId={} partition={} offset={}",
                event.getType(), event.getDocumentId(), partition, offset);

        try {
            auditLogRepository.save(AuditLogEntity.builder()
                    .eventType("DOCUMENT_" + event.getType().name())
                    .resourceType("document")
                    .resourceId(event.getDocumentId())
                    .resourceTitle(event.getDocumentTitle())
                    .userId(event.getUserId())
                    .userEmail(event.getUserEmail())
                    .metadata(String.format(
                        "{\"eventId\":\"%s\",\"fileType\":\"%s\",\"fileSize\":%d}",
                        event.getEventId(),
                        event.getFileType() != null ? event.getFileType() : "",
                        event.getFileSize() != null ? event.getFileSize() : 0))
                    .occurredAt(event.getOccurredAt())
                    .build());

            log.info("[ESB] Audit log written for document event {}", event.getEventId());
        } catch (Exception e) {
            log.error("[ESB] Failed to write audit log for document event: {}", e.getMessage());
            throw e; // rethrow so Kafka retries
        }
    }
}
