package com.docvault.documents.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Redis caching layer for hot read paths.
 *
 * HOT PATHS cached:
 *   - Individual document lookups (key: doc:{id})
 *   - Department document list page 0 (key: docs:dept:{deptId}:p0)
 *
 * EXPLICIT CACHE INVALIDATION on writes:
 *   - On document CREATE  → invalidate dept list cache
 *   - On document UPDATE  → invalidate both doc cache + dept list cache
 *   - On document DELETE  → invalidate both doc cache + dept list cache
 *   - On AI summary saved → invalidate doc cache so fresh summary is fetched
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentCacheService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper                  objectMapper;

    private static final Duration DOC_TTL  = Duration.ofMinutes(10);
    private static final Duration LIST_TTL = Duration.ofMinutes(5);

    // ── Keys ──────────────────────────────────────────────────────────────────
    private String docKey(String docId)    { return "doc:" + docId; }
    private String listKey(String deptId)  { return "docs:dept:" + deptId + ":p0"; }
    private String adminListKey()          { return "docs:admin:p0"; }

    // ── GET: document by id ───────────────────────────────────────────────────
    public <T> Optional<T> getDocument(String docId, Class<T> type) {
        try {
            String json = redisTemplate.opsForValue().get(docKey(docId));
            if (json != null) {
                log.debug("Cache HIT: doc:{}", docId);
                return Optional.of(objectMapper.readValue(json, type));
            }
        } catch (Exception e) {
            log.warn("Cache read error for doc:{} — {}", docId, e.getMessage());
        }
        log.debug("Cache MISS: doc:{}", docId);
        return Optional.empty();
    }

    // ── PUT: document ─────────────────────────────────────────────────────────
    public void putDocument(String docId, Object doc) {
        try {
            String json = objectMapper.writeValueAsString(doc);
            redisTemplate.opsForValue().set(docKey(docId), json, DOC_TTL);
            log.debug("Cache PUT: doc:{}", docId);
        } catch (Exception e) {
            log.warn("Cache write error for doc:{} — {}", docId, e.getMessage());
        }
    }

    // ── GET: department list (page 0 only — most common read) ─────────────────
    public <T> Optional<T> getDeptList(String deptId, Class<T> type) {
        try {
            String json = redisTemplate.opsForValue().get(listKey(deptId));
            if (json != null) {
                log.debug("Cache HIT: docs:dept:{}", deptId);
                return Optional.of(objectMapper.readValue(json, type));
            }
        } catch (Exception e) {
            log.warn("Cache read error for dept list:{} — {}", deptId, e.getMessage());
        }
        return Optional.empty();
    }

    // ── PUT: department list ──────────────────────────────────────────────────
    public void putDeptList(String deptId, Object list) {
        try {
            String json = objectMapper.writeValueAsString(list);
            redisTemplate.opsForValue().set(listKey(deptId), json, LIST_TTL);
            log.debug("Cache PUT: docs:dept:{}", deptId);
        } catch (Exception e) {
            log.warn("Cache write error for dept list:{} — {}", deptId, e.getMessage());
        }
    }

    // ── INVALIDATE: explicit cache invalidation on writes ─────────────────────

    /** Called on CREATE — invalidate the dept list so next read is fresh */
    public void invalidateOnCreate(String deptId) {
        deleteKey(listKey(deptId));
        deleteKey(adminListKey());
        log.info("Cache INVALIDATED on CREATE: dept:{}", deptId);
    }

    /** Called on UPDATE — invalidate both the doc and its dept list */
    public void invalidateOnUpdate(String docId, String deptId) {
        deleteKey(docKey(docId));
        deleteKey(listKey(deptId));
        deleteKey(adminListKey());
        log.info("Cache INVALIDATED on UPDATE: doc:{} dept:{}", docId, deptId);
    }

    /** Called on DELETE — same as update */
    public void invalidateOnDelete(String docId, String deptId) {
        invalidateOnUpdate(docId, deptId);
        log.info("Cache INVALIDATED on DELETE: doc:{}", docId);
    }

    /** Called after AI summary saved — invalidate doc so UI gets fresh summary */
    public void invalidateOnAiSummary(String docId) {
        deleteKey(docKey(docId));
        log.info("Cache INVALIDATED after AI summary: doc:{}", docId);
    }

    private void deleteKey(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Cache delete error key:{} — {}", key, e.getMessage());
        }
    }
}