package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Health")
@RestController
public class HealthController {

    @Operation(summary = "Health check")
    @ApiResponse(responseCode = "200", description = "Service is healthy")
    @GetMapping("/api/v1/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
