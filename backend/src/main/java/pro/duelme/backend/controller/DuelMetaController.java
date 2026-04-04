package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.service.DuelMetaService;

import java.util.List;

@Tag(name = "Duel Metadata", description = "Game metadata for duels")
@Validated
@RestController
@RequestMapping("/api/v1/duels")
public class DuelMetaController {

    private final DuelMetaService duelMetaService;

    public DuelMetaController(DuelMetaService duelMetaService) {
        this.duelMetaService = duelMetaService;
    }

    @Operation(summary = "Attach game to a duel", security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Game attached to duel"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
            @ApiResponse(responseCode = "403", description = "Caller is not a participant in this duel")
    })
    @PostMapping("/{duelId}/meta")
    public DuelMetaResponse attachGame(
            @PathVariable long duelId,
            @RequestParam int chainId,
            @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress,
            @Valid @RequestBody DuelMetaRequest request) {
        return duelMetaService.attachGame(duelId, chainId, walletAddress, request);
    }

    @Operation(summary = "Get duel metadata")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Duel metadata found"),
            @ApiResponse(responseCode = "404", description = "No metadata for this duel")
    })
    @GetMapping("/{duelId}/meta")
    public ResponseEntity<DuelMetaResponse> getDuelMeta(
            @PathVariable long duelId,
            @RequestParam int chainId) {
        DuelMetaResponse meta = duelMetaService.getByDuel(duelId, chainId);
        return meta != null ? ResponseEntity.ok(meta) : ResponseEntity.notFound().build();
    }

    @Operation(summary = "List duels by game")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Duel metadata list returned"),
            @ApiResponse(responseCode = "400", description = "Missing or blank gameSlug parameter")
    })
    @GetMapping("/meta")
    public List<DuelMetaResponse> listByGame(
            @RequestParam @NotBlank String gameSlug,
            @RequestParam(defaultValue = "100") int limit) {
        return duelMetaService.getByGameSlug(gameSlug, limit);
    }
}
