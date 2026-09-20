package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A one-shot record of a successful testnet faucet claim.
 *
 * <p>The key is {@code walletAddress + tokenAddress}, not {@code walletAddress}
 * alone: every testnet redeploy ships a fresh MockUSDT, and a key without the
 * token lets a claim against a retired token block the claim against the live
 * one — which leaves the faucet dead for exactly the wallets already testing,
 * and silently, since the wallet gets the ordinary "already claimed" answer.
 * {@code tokenAddress} is stored lowercased, as {@code walletAddress} is.
 *
 * <p>This annotation does not create the index — see
 * {@code MongoConfig#ensureFaucetClaimIndexes}, which does.
 */
@Document("faucet_claims")
@CompoundIndex(
    name = FaucetClaim.UNIQUE_INDEX,
    def = "{'walletAddress': 1, 'tokenAddress': 1}",
    unique = true
)
public record FaucetClaim(
    @Id String id,
    String walletAddress,
    String tokenAddress,
    String ethTxHash,
    String usdtTxHash,
    @CreatedDate Instant createdAt
) {
    /** Also the name {@code MongoConfig} creates it under — two spellings would mean two indexes. */
    public static final String UNIQUE_INDEX = "walletAddress_tokenAddress";

    /**
     * The pre-{@code tokenAddress} key, dropped by {@code FaucetClaimIndexMigrationRunner}.
     *
     * <p>Mongo's own generated name, not one we chose: the index was created from a bare
     * {@code Index().on("walletAddress")} with no {@code named(...)}, so it is
     * {@code walletAddress_1} and not {@code walletAddress}. Dropping the wrong spelling
     * would be a no-op that leaves the single-field unique index enforcing the very rule
     * this key exists to relax.
     */
    public static final String LEGACY_UNIQUE_INDEX = "walletAddress_1";
}
