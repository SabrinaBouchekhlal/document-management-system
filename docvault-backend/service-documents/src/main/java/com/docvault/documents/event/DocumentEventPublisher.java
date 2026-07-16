package com.docvault.documents.event;

import com.docvault.documents.config.KafkaConfig;
import com.docvault.shared.events.DocumentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentEventPublisher {

    private final KafkaTemplate<String, DocumentEvent> documentEventKafkaTemplate;

    public void publish(DocumentEvent event) {
        CompletableFuture<SendResult<String, DocumentEvent>> future =
                documentEventKafkaTemplate.send(
                        KafkaConfig.DOCUMENT_EVENTS_TOPIC,
                        event.getDocumentId(),   // partition key = documentId
                        event
                );

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish DocumentEvent type={} docId={}: {}",
                        event.getType(), event.getDocumentId(), ex.getMessage());
            } else {
                log.info("Published DocumentEvent type={} docId={} to partition={} offset={}",
                        event.getType(), event.getDocumentId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
