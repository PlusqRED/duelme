package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.CreateGameRequest;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.service.GameService;

import java.util.List;

@Tag(name = "Games", description = "Game catalog")
@Validated
@RestController
@RequestMapping("/api/v1/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @Operation(summary = "List games with optional category filter and search")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Games returned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid category or limit parameter")
    })
    @GetMapping
    public List<GameResponse> listGames(
            @RequestParam(required = false) GameCategory category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "100") @Min(0) int limit) {
        return gameService.list(category, search, limit);
    }

    @Operation(summary = "Get game by slug")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Game found"),
            @ApiResponse(responseCode = "404", description = "Game not found")
    })
    @GetMapping("/{slug}")
    public GameResponse getGame(@PathVariable String slug) {
        return gameService.getBySlug(slug);
    }

    @Operation(
            summary = "Create a game or return the existing game with the same slug",
            security = @SecurityRequirement(name = "bearer")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Game created or existing game returned"),
            @ApiResponse(responseCode = "400", description = "Invalid name or category"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @PostMapping
    public GameResponse createGame(
            @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress,
            @Valid @RequestBody CreateGameRequest request) {
        // Auth required to prevent anonymous catalog spam, but the wallet address is
        // intentionally not persisted: games are a communal catalog with no owner.
        // Idempotent on slug — same name from any caller returns the same Game.
        return gameService.getOrCreate(request.name(), null, request.category());
    }
}
