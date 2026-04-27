package pro.duelme.backend.exception;

public class SocialAccountAlreadyLinkedException extends RuntimeException {

    public SocialAccountAlreadyLinkedException(String message) {
        super(message);
    }
}
