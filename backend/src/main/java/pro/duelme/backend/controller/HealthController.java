package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.HealthResponse;

@Tag(name = "Health", description = "Liveness and the build that is running")
@RestController
public class HealthController {

    private static final String UNKNOWN = "unknown";

    private final HealthResponse response;

    // APP_RELEASE is baked into the image at build time and APP_ENV is set by the compose file;
    // the deploy compares the release with the commit it just built.
    public HealthController(@Value("${APP_ENV:}") String environment,
                            @Value("${APP_RELEASE:}") String release) {
        this.response = new HealthResponse("ok", orUnknown(environment), orUnknown(release));
    }

    @Operation(summary = "Health check with the environment and release of the running build")
    @ApiResponse(responseCode = "200", description = "Service is healthy; `environment` and `release` "
        + "are `unknown` when the build does not set them")
    @GetMapping("/api/v1/health")
    public HealthResponse health() {
        return response;
    }

    private static String orUnknown(String value) {
        return value == null || value.isBlank() ? UNKNOWN : value;
    }
}
