package com.docvault.esb.repository;

import com.docvault.esb.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, String> {
    Page<AuditLogEntity> findByResourceTypeAndResourceId(
            String resourceType, String resourceId, Pageable pageable);
    Page<AuditLogEntity> findByUserId(String userId, Pageable pageable);
}
