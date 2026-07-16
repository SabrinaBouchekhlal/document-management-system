package com.docvault.comments.repository;

import com.docvault.comments.entity.CommentEntity;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends CassandraRepository<CommentEntity, UUID> {

    @Query("SELECT * FROM comments WHERE document_id = ?0")
    List<CommentEntity> findByDocumentId(String documentId);

    @Query("DELETE FROM comments WHERE document_id = ?0 AND created_at = ?1 AND id = ?2")
    void deleteByDocumentIdAndCreatedAtAndId(String documentId, Instant createdAt, UUID id);
}
