package pro.duelme.backend.exception;

public class ExternalSocialServiceException extends RuntimeException {

    public ExternalSocialServiceException(String message) {
        super(message);
    }

    public ExternalSocialServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
