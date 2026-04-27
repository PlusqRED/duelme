package pro.duelme.backend.exception;

public class SocialVerificationFailedException extends RuntimeException {

    public SocialVerificationFailedException(String message) {
        super(message);
    }

    public SocialVerificationFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
