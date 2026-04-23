package pro.duelme.backend.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({ProfileNotFoundException.class, GameNotFoundException.class})
    public ResponseEntity<Map<String, String>> handleNotFound(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(NotAuthorizedException.class)
    public ResponseEntity<Map<String, String>> handleNotAuthorized(NotAuthorizedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> Map.of(
                "field", e.getField(),
                "message", e.getDefaultMessage() != null ? e.getDefaultMessage() : "invalid"))
            .toList();
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Validation failed", "details", errors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation(ConstraintViolationException ex) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(FaucetDisabledException.class)
    public ResponseEntity<Map<String, String>> handleFaucetDisabled(FaucetDisabledException ex) {
        // 503 — the endpoint exists but the feature is deliberately disabled
        // in this environment. Avoids conflating with "route not found" which
        // would confuse docs discovery and uptime monitors.
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(FaucetAlreadyClaimedException.class)
    public ResponseEntity<Map<String, String>> handleFaucetAlreadyClaimed(FaucetAlreadyClaimedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(FaucetExecutionException.class)
    public ResponseEntity<Map<String, String>> handleFaucetExecution(FaucetExecutionException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(SocialVerificationFailedException.class)
    public ResponseEntity<Map<String, String>> handleSocialVerificationFailed(
        SocialVerificationFailedException ex
    ) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(SocialAccountAlreadyLinkedException.class)
    public ResponseEntity<Map<String, String>> handleSocialAlreadyLinked(
        SocialAccountAlreadyLinkedException ex
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ExternalSocialServiceException.class)
    public ResponseEntity<Map<String, String>> handleExternalSocialService(
        ExternalSocialServiceException ex
    ) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(Map.of("error", ex.getMessage()));
    }
}
