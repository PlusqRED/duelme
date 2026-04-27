package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 * Dev-only testnet faucet configuration. The service bean only initializes
 * when {@code duelme.faucet.enabled=true} so prod never opens an RPC
 * connection and never loads the signer key.
 *
 * <p>Security: {@link #toString()} deliberately omits {@link #privateKey()}
 * and {@link #rpcUrl()} (which may carry an API key) so accidental logging
 * of the record never leaks the signer.
 */
@ConfigurationProperties(prefix = "duelme.faucet")
public record FaucetProperties(
    boolean enabled,
    String privateKey,
    String rpcUrl,
    long chainId,
    String mockUsdtAddress,
    BigDecimal ethAmountEth,
    BigInteger usdtAmountRaw
) {
    @Override
    public String toString() {
        return "FaucetProperties[enabled=" + enabled
            + ", privateKey=***MASKED***"
            + ", rpcUrl=***MASKED***"
            + ", chainId=" + chainId
            + ", mockUsdtAddress=" + mockUsdtAddress
            + ", ethAmountEth=" + ethAmountEth
            + ", usdtAmountRaw=" + usdtAmountRaw
            + "]";
    }
}
