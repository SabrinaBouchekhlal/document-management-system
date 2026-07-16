package com.docvault.documents.repository;

import com.docvault.documents.entity.DocumentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentEntity, String> {

    // ── C3 Part 2: filter by allowed department list ──────────────────────────
    Page<DocumentEntity> findByStatusAndDepartmentIdIn(
            DocumentEntity.Status status,
            List<String> departmentIds,
            Pageable pageable);

    @Query("SELECT d FROM DocumentEntity d WHERE d.status = :status " +
           "AND d.departmentId IN :departmentIds " +
           "AND (LOWER(d.title) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(d.description) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<DocumentEntity> searchByStatusAndDepartmentIdsAndQuery(
            DocumentEntity.Status status,
            List<String> departmentIds,
            String q,
            Pageable pageable);

    @Query("SELECT d FROM DocumentEntity d WHERE d.status = :status " +
           "AND d.categoryId = :categoryId " +
           "AND d.departmentId IN :departmentIds")
    Page<DocumentEntity> findByStatusAndCategoryIdAndDepartmentIdIn(
            DocumentEntity.Status status,
            String categoryId,
            List<String> departmentIds,
            Pageable pageable);

    // Admin: unrestricted queries
    Page<DocumentEntity> findByStatus(DocumentEntity.Status status, Pageable pageable);

    @Query("SELECT d FROM DocumentEntity d WHERE d.status = :status " +
           "AND (LOWER(d.title) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(d.description) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<DocumentEntity> searchByStatusAndQuery(
            DocumentEntity.Status status, String q, Pageable pageable);

    @Modifying
    @Query("UPDATE DocumentEntity d SET d.views = d.views + 1 WHERE d.id = :id")
    void incrementViews(String id);

    @Modifying
    @Query("UPDATE DocumentEntity d SET d.downloads = d.downloads + 1 WHERE d.id = :id")
    void incrementDownloads(String id);

    @Modifying
    @Query("UPDATE DocumentEntity d SET d.aiSummary = :summary, d.aiSummaryFr = :summaryFr WHERE d.id = :id")
    void updateAiSummary(String id, String summary, String summaryFr);
}
