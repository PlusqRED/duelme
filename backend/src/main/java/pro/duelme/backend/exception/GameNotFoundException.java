package pro.duelme.backend.exception;

public class GameNotFoundException extends RuntimeException {

    public GameNotFoundException(String slug) {
        super("Game not found: " + slug);
    }
}
