package pro.duelme.backend.exception;

public class FaucetDisabledException extends RuntimeException {
    public FaucetDisabledException() {
        super("Faucet is disabled in this environment");
    }
}
