package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("duelMeta")
@CompoundIndex(name = "duelId_chainId", def = "{'duelId': 1, 'chainId': 1}", unique = true)
public record DuelMeta(
    @Id String id,
    long duelId,
    int chainId,
    String gameSlug,
    String creatorAddress,
    @CreatedDate Instant createdAt
) {}
