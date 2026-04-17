package pro.duelme.backend.exception;

public class FaucetAlreadyClaimedException extends RuntimeException {
    public FaucetAlreadyClaimedException(String walletAddress) {
        // Message kept generic — the caller already knows their wallet; we
        // don't echo it back to avoid leaking it into any proxy/access log
        // that ends up in a shared monitoring stream.
        super("Wallet has already claimed from the faucet");
    }
}
