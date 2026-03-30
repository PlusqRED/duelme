package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("games")
public record Game(
    @Id String id,
    @Indexed(unique = true) String slug,
    String name,
    String iconUrl,
    GameCategory category,
    long duelCount,
    long totalVolume,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {}
