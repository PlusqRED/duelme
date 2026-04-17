package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A one-shot record of a successful testnet faucet claim. The unique
 * {@code walletAddress} index is what enforces "one claim per wallet".
 */
@Document("faucet_claims")
public record FaucetClaim(
    @Id String id,
    @Indexed(unique = true) String walletAddress,
    String ethTxHash,
    String usdtTxHash,
    @CreatedDate Instant createdAt
) {}
