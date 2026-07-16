package com.docvault.documents.service;

import com.docvault.documents.dto.DocumentDtos;
import com.docvault.documents.entity.DocumentEntity;
import com.docvault.documents.entity.DocumentVersionEntity;
import com.docvault.documents.event.DocumentEventPublisher;
import com.docvault.documents.repository.DocumentRepository;
import com.docvault.documents.repository.DocumentVersionRepository;
import com.docvault.shared.events.DocumentEvent;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository        documentRepo;
    private final DocumentVersionRepository versionRepo;
    private final S3Service                 s3Service;
    private final DocumentEventPublisher    eventPublisher;

    // ── C3 Part 2: list filtered by user's departments ────────────────────────
    public Page<DocumentDtos.DocumentResponse> listDocuments(
            String status, String q, String categoryId,
            int page, int size,
            String userRole, String userDepartmentId) {

        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "updatedAt"));
        DocumentEntity.Status statusEnum = parseStatus(status);

        // Admin sees everything regardless of department
        if ("admin".equals(userRole)) {
            if (q != null && !q.isBlank())
                return documentRepo.searchByStatusAndQuery(statusEnum, q, pageable).map(this::toResponse);
            return documentRepo.findByStatus(statusEnum, pageable).map(this::toResponse);
        }

        // C3 Part 2: regular users see only their department's documents
        // If user has no department assigned → empty list
        if (userDepartmentId == null || userDepartmentId.isBlank()) {
            log.info("User has no department assigned - returning empty document list");
            return Page.empty(pageable);
        }

        List<String> allowedDepts = List.of(userDepartmentId);

        if (q != null && !q.isBlank())
            return documentRepo.searchByStatusAndDepartmentIdsAndQuery(
                    statusEnum, allowedDepts, q, pageable).map(this::toResponse);

        if (categoryId != null && !categoryId.isBlank())
            return documentRepo.findByStatusAndCategoryIdAndDepartmentIdIn(
                    statusEnum, categoryId, allowedDepts, pageable).map(this::toResponse);

        return documentRepo.findByStatusAndDepartmentIdIn(
                statusEnum, allowedDepts, pageable).map(this::toResponse);
    }

    // ── C3 Part 2: get by id with department check ────────────────────────────
    public DocumentDtos.DocumentResponse getDocument(String id,
            String userRole, String userDepartmentId) {
        DocumentEntity doc = findOrThrow(id);

        // Admin bypasses department check
        if ("admin".equals(userRole)) return toResponse(doc);

        // C3 Part 2: 403 (not 404) if user not in document's department
        if (doc.getDepartmentId() != null && !doc.getDepartmentId().isBlank()) {
            if (!doc.getDepartmentId().equals(userDepartmentId)) {
                throw new ForbiddenException(
                    "Access denied: document belongs to a different department. " +
                    "403 is used (not 404) deliberately — revealing that a resource exists " +
                    "is intentional here; hiding it would not improve security since the id " +
                    "is already known to the caller.");
            }
        }
        return toResponse(doc);
    }

    // ── CREATE — owner_id from JWT, never from body (C3 Part 1) ──────────────
    @Transactional
    public DocumentDtos.DocumentResponse createDocument(
            DocumentDtos.CreateDocumentRequest req,
            String userId, String userEmail, String userDepartmentId) {

        // C3 Part 1: owner_id comes from JWT (userId param), request body is ignored
        DocumentEntity doc = documentRepo.save(DocumentEntity.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .categoryId(req.getCategoryId())
                // C3 Part 2: if no departmentId in body, use user's own department
                .departmentId(req.getDepartmentId() != null
                        ? req.getDepartmentId() : userDepartmentId)
                .uploadedBy(userId)   // ← from JWT, not request body
                .status(req.getStatus() != null
                        ? DocumentEntity.Status.valueOf(req.getStatus())
                        : DocumentEntity.Status.published)
                .fileType(req.getFileType())
                .fileSize(req.getFileSize())
                .s3Key(req.getS3Key())
                .tags(req.getTags() != null ? req.getTags() : List.of())
                .currentVersion(1)
                .views(0L).downloads(0L)
                .build());

        versionRepo.save(DocumentVersionEntity.builder()
                .documentId(doc.getId()).version(1)
                .uploadedBy(userId).changelog("Initial upload")
                .fileSize(req.getFileSize()).s3Key(req.getS3Key())
                .build());

        eventPublisher.publish(DocumentEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .type(DocumentEvent.Type.CREATED)
                .documentId(doc.getId())
                .documentTitle(doc.getTitle())
                .documentDescription(doc.getDescription())
                .categoryId(doc.getCategoryId())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .s3Key(doc.getS3Key())
                .userId(userId).userEmail(userEmail)
                .occurredAt(Instant.now())
                .build());

        log.info("Document created id={} owner={} dept={}", doc.getId(), userId, doc.getDepartmentId());
        return toResponse(doc);
    }

    @Transactional
    public DocumentDtos.DocumentResponse updateDocument(
            String id, DocumentDtos.UpdateDocumentRequest req,
            String userId, String userEmail) {

        DocumentEntity doc = findOrThrow(id);
        if (req.getTitle()        != null) doc.setTitle(req.getTitle());
        if (req.getDescription()  != null) doc.setDescription(req.getDescription());
        if (req.getCategoryId()   != null) doc.setCategoryId(req.getCategoryId());
        if (req.getDepartmentId() != null) doc.setDepartmentId(req.getDepartmentId());
        if (req.getTags()         != null) doc.setTags(req.getTags());
        if (req.getStatus()       != null) doc.setStatus(DocumentEntity.Status.valueOf(req.getStatus()));
        doc = documentRepo.save(doc);

        eventPublisher.publish(DocumentEvent.builder()
                .eventId(UUID.randomUUID().toString()).type(DocumentEvent.Type.UPDATED)
                .documentId(doc.getId()).documentTitle(doc.getTitle())
                .userId(userId).userEmail(userEmail).occurredAt(Instant.now()).build());
        return toResponse(doc);
    }

    @Transactional
    public void deleteDocument(String id, String userId, String userEmail) {
        DocumentEntity doc = findOrThrow(id);
        versionRepo.findByDocumentIdOrderByVersionDesc(id)
                .forEach(v -> { if (v.getS3Key() != null) s3Service.deleteFile(v.getS3Key()); });
        if (doc.getS3Key() != null) s3Service.deleteFile(doc.getS3Key());
        versionRepo.deleteAll(versionRepo.findByDocumentIdOrderByVersionDesc(id));
        documentRepo.deleteById(id);

        eventPublisher.publish(DocumentEvent.builder()
                .eventId(UUID.randomUUID().toString()).type(DocumentEvent.Type.DELETED)
                .documentId(id).documentTitle(doc.getTitle())
                .userId(userId).userEmail(userEmail).occurredAt(Instant.now()).build());
    }

    
    public DocumentDtos.PresignedUrlResponse generateUploadUrl(DocumentDtos.PresignedUrlRequest req) {
        S3Service.PresignedUpload result = s3Service.generateUploadUrl(
                req.getDocumentId() != null ? req.getDocumentId() : UUID.randomUUID().toString(),
                req.getFileName(), req.getContentType());
        return DocumentDtos.PresignedUrlResponse.builder()
                .s3Key(result.s3Key()).uploadUrl(result.uploadUrl()).expiresInMinutes(60).build();
    }

    @Transactional 
    public String generateDownloadUrl(String id) {
        DocumentEntity doc = findOrThrow(id);
        documentRepo.incrementDownloads(id);
        if (doc.getS3Key() == null) throw new RuntimeException("No file attached");
        return s3Service.generateDownloadUrl(doc.getS3Key());
    }

    public List<DocumentDtos.VersionResponse> getVersions(String documentId) {
        return versionRepo.findByDocumentIdOrderByVersionDesc(documentId)
                .stream().map(this::toVersionResponse).toList();
    }

    @Transactional
    public DocumentDtos.VersionResponse createVersion(
            String documentId, DocumentDtos.NewVersionRequest req,
            String userId, String userEmail) {
        DocumentEntity doc = findOrThrow(documentId);
        int newVer = doc.getCurrentVersion() + 1;
        DocumentVersionEntity v = versionRepo.save(DocumentVersionEntity.builder()
                .documentId(documentId).version(newVer).uploadedBy(userId)
                .changelog(req.getChangelog()).fileSize(req.getFileSize()).s3Key(req.getS3Key()).build());
        doc.setCurrentVersion(newVer);
        if (req.getS3Key() != null) doc.setS3Key(req.getS3Key());
        documentRepo.save(doc);
        return toVersionResponse(v);
    }

    @Transactional
    public void saveAiSummary(String documentId, String summary, String summaryFr) {
        documentRepo.updateAiSummary(documentId, summary, summaryFr);
        log.info("AI summary saved for document {}", documentId);
    }

    private DocumentEntity findOrThrow(String id) {
        return documentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
    }

    private DocumentEntity.Status parseStatus(String s) {
        try { return DocumentEntity.Status.valueOf(s); }
        catch (Exception e) { return DocumentEntity.Status.published; }
    }

    private DocumentDtos.DocumentResponse toResponse(DocumentEntity d) {
        return DocumentDtos.DocumentResponse.builder()
                .id(d.getId()).title(d.getTitle()).description(d.getDescription())
                .categoryId(d.getCategoryId()).departmentId(d.getDepartmentId())
                .uploadedBy(d.getUploadedBy()).status(d.getStatus().name())
                .fileType(d.getFileType()).fileSize(d.getFileSize())
                .s3Key(d.getS3Key()).tags(d.getTags())
                .currentVersion(d.getCurrentVersion())
                .views(d.getViews()).downloads(d.getDownloads())
                .aiSummary(d.getAiSummary()).aiSummaryFr(d.getAiSummaryFr())
                .createdAt(d.getCreatedAt()).updatedAt(d.getUpdatedAt())
                .build();
    }

    private DocumentDtos.VersionResponse toVersionResponse(DocumentVersionEntity v) {
        return DocumentDtos.VersionResponse.builder()
                .id(v.getId()).documentId(v.getDocumentId()).version(v.getVersion())
                .uploadedBy(v.getUploadedBy()).changelog(v.getChangelog())
                .fileSize(v.getFileSize()).createdAt(v.getCreatedAt()).build();
    }

    // Inner exception for 403 handling
    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String msg) { super(msg); }
    }
}
