package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.service.GameService;

import java.util.List;

@Tag(name = "Games", description = "Game catalog")
@RestController
@RequestMapping("/api/v1/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @Operation(summary = "List games with optional category filter and search")
    @GetMapping
    public List<GameResponse> listGames(
            @RequestParam(required = false) GameCategory category,
            @RequestParam(required = false) String search) {
        return gameService.list(category, search);
    }

    @Operation(summary = "Get game by slug")
    @GetMapping("/{slug}")
    public GameResponse getGame(@PathVariable String slug) {
        return gameService.getBySlug(slug);
    }
}
