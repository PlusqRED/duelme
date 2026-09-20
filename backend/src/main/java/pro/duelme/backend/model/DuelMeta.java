package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Game metadata a duel's creator attached to one duel.
 *
 * <p>The key is {@code contractAddress + duelId + chainId}, not {@code duelId +
 * chainId}: duel ids come from the contract's {@code duelCount} and restart at
 * zero on every redeploy, so a redeploy to the same chain would otherwise make
 * each old row match a brand-new, unrelated duel that took the same id.
 * {@code contractAddress} is stored lowercased.
 *
 * <p>This annotation does not create the index — see
 * {@code MongoConfig#ensureDuelMetaIndexes}, which does.
 */
@Document("duelMeta")
@CompoundIndex(
    name = DuelMeta.UNIQUE_INDEX,
    def = "{'contractAddress': 1, 'duelId': 1, 'chainId': 1}",
    unique = true
)
public record DuelMeta(
    @Id String id,
    String contractAddress,
    long duelId,
    int chainId,
    String gameSlug,
    String creatorAddress,
    @CreatedDate Instant createdAt
) {
    /** Also the name {@code MongoConfig} creates it under — two spellings would mean two indexes. */
    public static final String UNIQUE_INDEX = "contractAddress_duelId_chainId";

    /** The pre-{@code contractAddress} key, dropped by {@code DuelMetaIndexMigrationRunner}. */
    public static final String LEGACY_UNIQUE_INDEX = "duelId_chainId";
}
