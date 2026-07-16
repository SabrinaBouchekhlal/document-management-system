package com.docvault.comments.entity;

import lombok.*;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.*;
import java.time.Instant;
import java.util.UUID;

@Table("comments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CommentEntity {

    @PrimaryKeyColumn(name = "document_id", type = PrimaryKeyType.PARTITIONED)
    private String documentId;

    @PrimaryKeyColumn(name = "created_at", type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private Instant createdAt;

    @PrimaryKeyColumn(name = "id", type = PrimaryKeyType.CLUSTERED)
    private UUID id;

    @Column("user_id")    private String userId;
    @Column("user_email") private String userEmail;
    @Column("user_name")  private String userName;
    @Column("content")    private String content;
    @Column("resolved")   private boolean resolved;
}
