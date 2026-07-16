CREATE KEYSPACE IF NOT EXISTS docvault
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
  AND durable_writes = true;

USE docvault;

CREATE TABLE IF NOT EXISTS comments (
    document_id  TEXT,
    created_at   TIMESTAMP,
    id           UUID,
    user_id      TEXT,
    user_email   TEXT,
    user_name    TEXT,
    content      TEXT,
    resolved     BOOLEAN,
    PRIMARY KEY ((document_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);
