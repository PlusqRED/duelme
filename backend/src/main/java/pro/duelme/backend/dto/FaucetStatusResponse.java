package pro.duelme.backend.dto;

/**
 * Whether the faucet runs here, what one claim gives, and whether the caller already has it from the
 * live MockUSDT. Amounts are in each token's smallest unit, as decimal strings so no client rounds
 * them. Every field but {@code enabled} is null when the faucet is off.
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
