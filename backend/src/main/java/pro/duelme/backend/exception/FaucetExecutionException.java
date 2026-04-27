package pro.duelme.backend.exception;

public class FaucetExecutionException extends RuntimeException {
    public FaucetExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
