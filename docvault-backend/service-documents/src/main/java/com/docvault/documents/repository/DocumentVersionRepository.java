package com.docvault.documents.repository;

import com.docvault.documents.entity.DocumentVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersionEntity, String> {
    List<DocumentVersionEntity> findByDocumentIdOrderByVersionDesc(String documentId);
}
