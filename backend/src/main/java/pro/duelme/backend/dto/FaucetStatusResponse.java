package pro.duelme.backend.dto;

/**
 * Whether the faucet runs here, what the caller's next claim gives, and whether they already have it
 * from the live MockUSDT. Amounts are in each token's smallest unit, as decimal strings so no client
 * rounds them; the ETH is zero once a claim sent it, since resuming that claim mints only the USDT.
 * Every field but {@code enabled} is null when the faucet is off.
 */
public record FaucetStatusResponse(
    boolean enabled,
    Boolean claimed,
    Long chainId,
    String usdtAmountRaw,
    String ethAmountWei
) {
    public static FaucetStatusResponse disabled() {
        return new FaucetStatusResponse(false, null, null, null, null);
    }
}
