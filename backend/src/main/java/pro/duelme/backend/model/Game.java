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
    @Indexed(unique = true, name = Game.UNIQUE_INDEX) String slug,
    String name,
    String iconUrl,
    GameCategory category,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {
    /**
     * Also the name {@code MongoConfig#ensureGameIndexes} creates it under. Two
     * spellings of one key are not two indexes — Mongo rejects the second with
     * {@code IndexOptionsConflict}, out of an {@code ApplicationRunner}, which
     * takes the boot down with it.
     */
    public static final String UNIQUE_INDEX = "slug";
}
