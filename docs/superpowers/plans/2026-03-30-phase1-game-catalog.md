# Phase 1: Game Catalog + Duel Metadata — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players select a game when creating duels. A `/games` catalog page shows all games. Duel cards display which game they're for.

**Architecture:** Off-chain game catalog in MongoDB linked to on-chain duels by `duelId + chainId`. Backend provides REST API for game CRUD and duel metadata. Frontend adds game autocomplete to duel creation, new catalog pages, and game badges on duel cards.

**Tech Stack:** Java 25 + Spring Boot 4 + MongoDB (backend), Next.js 16 + React 19 + Tailwind 4 (frontend)

---

## File Structure

### New Backend Files
| File | Responsibility |
|------|---------------|
| `backend/src/main/java/pro/duelme/backend/model/GameCategory.java` | Category enum |
| `backend/src/main/java/pro/duelme/backend/model/Game.java` | Game document |
| `backend/src/main/java/pro/duelme/backend/model/DuelMeta.java` | Duel-to-game link |
| `backend/src/main/java/pro/duelme/backend/dto/GameResponse.java` | Game API response |
| `backend/src/main/java/pro/duelme/backend/dto/DuelMetaRequest.java` | Attach game request |
| `backend/src/main/java/pro/duelme/backend/dto/DuelMetaResponse.java` | Duel meta response |
| `backend/src/main/java/pro/duelme/backend/repository/GameRepository.java` | Game data access |
| `backend/src/main/java/pro/duelme/backend/repository/DuelMetaRepository.java` | DuelMeta data access |
| `backend/src/main/java/pro/duelme/backend/exception/GameNotFoundException.java` | 404 for games |
| `backend/src/main/java/pro/duelme/backend/service/GameService.java` | Game CRUD + auto-create |
| `backend/src/main/java/pro/duelme/backend/service/DuelMetaService.java` | Link games to duels |
| `backend/src/main/java/pro/duelme/backend/controller/GameController.java` | Game REST endpoints |
| `backend/src/main/java/pro/duelme/backend/controller/DuelMetaController.java` | DuelMeta REST endpoints |
| `backend/src/test/java/pro/duelme/backend/controller/GameControllerTest.java` | Game API tests |
| `backend/src/test/java/pro/duelme/backend/controller/DuelMetaControllerTest.java` | DuelMeta API tests |

### New Frontend Files
| File | Responsibility |
|------|---------------|
| `frontend/src/lib/game.ts` | Game types and constants |
| `frontend/src/lib/gameApi.ts` | Backend API client for games |
| `frontend/src/hooks/useGames.ts` | React Query hook — list games |
| `frontend/src/hooks/useGame.ts` | React Query hook — single game |
| `frontend/src/hooks/useDuelMeta.ts` | React Query hook — duel metadata |
| `frontend/src/components/game/GameBadge.tsx` | Inline game badge for duel cards |
| `frontend/src/components/game/GameAutocomplete.tsx` | Autocomplete input for duel creation |
| `frontend/src/components/game/GameCard.tsx` | Card for games catalog grid |
| `frontend/src/app/games/page.tsx` | Games catalog page |
| `frontend/src/app/games/[slug]/page.tsx` | Game detail page |

### Modified Files
| File | Change |
|------|--------|
| `backend/.../config/SecurityConfig.java` | Add game + duelMeta endpoint permissions |
| `backend/.../config/WebConfig.java` | Add POST to CORS allowed methods |
| `backend/.../exception/GlobalExceptionHandler.java` | Add GameNotFoundException handler |
| `frontend/src/components/duel/CreateDuelForm.tsx` | Add game autocomplete field |
| `frontend/src/components/duel/DuelCard.tsx` | Add game badge |
| `frontend/src/components/layout/Header.tsx` | Add Games nav link |
| `frontend/src/app/page.tsx` | Add Popular Games landing section |
| `frontend/src/i18n/translations.ts` | Add game-related keys (EN + RU) |

---

## Task 1: Backend Models + Enum

**Files:**
- Create: `backend/src/main/java/pro/duelme/backend/model/GameCategory.java`
- Create: `backend/src/main/java/pro/duelme/backend/model/Game.java`
- Create: `backend/src/main/java/pro/duelme/backend/model/DuelMeta.java`

- [ ] **Step 1: Create GameCategory enum**

```java
package pro.duelme.backend.model;

public enum GameCategory {
    FPS, MOBA, SPORT, STRATEGY, FIGHTING, RACING, CARD, OTHER
}
```

- [ ] **Step 2: Create Game model**

```java
package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("games")
public record Game(
    @Id String id,
    @Indexed(unique = true) String slug,
    String name,
    String iconUrl,
    GameCategory category,
    long duelCount,
    long totalVolume,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {}
```

- [ ] **Step 3: Create DuelMeta model**

```java
package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("duelMeta")
@CompoundIndex(name = "duelId_chainId", def = "{'duelId': 1, 'chainId': 1}", unique = true)
public record DuelMeta(
    @Id String id,
    long duelId,
    int chainId,
    String gameSlug,
    String creatorAddress,
    @CreatedDate Instant createdAt
) {}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/pro/duelme/backend/model/GameCategory.java backend/src/main/java/pro/duelme/backend/model/Game.java backend/src/main/java/pro/duelme/backend/model/DuelMeta.java
git commit -m "feat: add Game and DuelMeta domain models"
```

---

## Task 2: Backend DTOs

**Files:**
- Create: `backend/src/main/java/pro/duelme/backend/dto/GameResponse.java`
- Create: `backend/src/main/java/pro/duelme/backend/dto/DuelMetaRequest.java`
- Create: `backend/src/main/java/pro/duelme/backend/dto/DuelMetaResponse.java`

- [ ] **Step 1: Create GameResponse**

```java
package pro.duelme.backend.dto;

import pro.duelme.backend.model.GameCategory;

import java.time.Instant;

public record GameResponse(
    String slug,
    String name,
    String iconUrl,
    GameCategory category,
    long duelCount,
    long totalVolume,
    Instant createdAt,
    Instant updatedAt
) {}
```

- [ ] **Step 2: Create DuelMetaRequest**

```java
package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import pro.duelme.backend.model.GameCategory;

public record DuelMetaRequest(
    @NotBlank @Size(max = 50) String gameName,
    @Size(max = 255) String iconUrl,
    GameCategory category
) {}
```

- [ ] **Step 3: Create DuelMetaResponse**

```java
package pro.duelme.backend.dto;

import java.time.Instant;

public record DuelMetaResponse(
    long duelId,
    int chainId,
    String gameSlug,
    String gameName,
    String creatorAddress,
    Instant createdAt
) {}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/pro/duelme/backend/dto/GameResponse.java backend/src/main/java/pro/duelme/backend/dto/DuelMetaRequest.java backend/src/main/java/pro/duelme/backend/dto/DuelMetaResponse.java
git commit -m "feat: add Game and DuelMeta DTOs"
```

---

## Task 3: Backend Repositories + Exception

**Files:**
- Create: `backend/src/main/java/pro/duelme/backend/repository/GameRepository.java`
- Create: `backend/src/main/java/pro/duelme/backend/repository/DuelMetaRepository.java`
- Create: `backend/src/main/java/pro/duelme/backend/exception/GameNotFoundException.java`
- Modify: `backend/src/main/java/pro/duelme/backend/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Create GameRepository**

```java
package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;

import java.util.List;
import java.util.Optional;

public interface GameRepository extends MongoRepository<Game, String> {

    Optional<Game> findBySlug(String slug);

    List<Game> findByCategory(GameCategory category);

    List<Game> findByNameContainingIgnoreCase(String name);

    List<Game> findByCategoryAndNameContainingIgnoreCase(GameCategory category, String name);
}
```

- [ ] **Step 2: Create DuelMetaRepository**

```java
package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.DuelMeta;

import java.util.List;
import java.util.Optional;

public interface DuelMetaRepository extends MongoRepository<DuelMeta, String> {

    Optional<DuelMeta> findByDuelIdAndChainId(long duelId, int chainId);

    List<DuelMeta> findByGameSlug(String gameSlug);
}
```

- [ ] **Step 3: Create GameNotFoundException**

```java
package pro.duelme.backend.exception;

public class GameNotFoundException extends RuntimeException {

    public GameNotFoundException(String slug) {
        super("Game not found: " + slug);
    }
}
```

- [ ] **Step 4: Add handler to GlobalExceptionHandler**

In `backend/src/main/java/pro/duelme/backend/exception/GlobalExceptionHandler.java`, add after the `handleNotFound` method:

```java
@ExceptionHandler(GameNotFoundException.class)
public ResponseEntity<Map<String, String>> handleGameNotFound(GameNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(Map.of("error", ex.getMessage()));
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/pro/duelme/backend/repository/GameRepository.java backend/src/main/java/pro/duelme/backend/repository/DuelMetaRepository.java backend/src/main/java/pro/duelme/backend/exception/GameNotFoundException.java backend/src/main/java/pro/duelme/backend/exception/GlobalExceptionHandler.java
git commit -m "feat: add Game and DuelMeta repositories and exception"
```

---

## Task 4: Backend Services

**Files:**
- Create: `backend/src/main/java/pro/duelme/backend/service/GameService.java`
- Create: `backend/src/main/java/pro/duelme/backend/service/DuelMetaService.java`

- [ ] **Step 1: Create GameService**

```java
package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.GameRepository;

import java.util.List;

@Service
public class GameService {

    private final GameRepository repository;

    public GameService(GameRepository repository) {
        this.repository = repository;
    }

    public GameResponse getBySlug(String slug) {
        Game game = repository.findBySlug(slug.toLowerCase())
            .orElseThrow(() -> new GameNotFoundException(slug));
        return toResponse(game);
    }

    public List<GameResponse> list(GameCategory category, String search) {
        List<Game> games;
        if (category != null && search != null && !search.isBlank()) {
            games = repository.findByCategoryAndNameContainingIgnoreCase(category, search);
        } else if (category != null) {
            games = repository.findByCategory(category);
        } else if (search != null && !search.isBlank()) {
            games = repository.findByNameContainingIgnoreCase(search);
        } else {
            games = repository.findAll();
        }
        return games.stream().map(this::toResponse).toList();
    }

    public GameResponse getOrCreate(String name, String iconUrl, GameCategory category) {
        String slug = toSlug(name);
        return repository.findBySlug(slug)
            .map(this::toResponse)
            .orElseGet(() -> createGame(slug, name, iconUrl, category));
    }

    private GameResponse createGame(String slug, String name, String iconUrl, GameCategory category) {
        Game game = new Game(
            null, slug, name.trim(), iconUrl,
            category != null ? category : GameCategory.OTHER,
            0, 0, null, null
        );
        try {
            Game saved = repository.save(game);
            return toResponse(saved);
        } catch (DuplicateKeyException e) {
            return repository.findBySlug(slug)
                .map(this::toResponse)
                .orElseThrow(() -> new GameNotFoundException(slug));
        }
    }

    static String toSlug(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }

    private GameResponse toResponse(Game game) {
        return new GameResponse(
            game.slug(), game.name(), game.iconUrl(), game.category(),
            game.duelCount(), game.totalVolume(),
            game.createdAt(), game.updatedAt()
        );
    }
}
```

- [ ] **Step 2: Create DuelMetaService**

```java
package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import java.util.List;

@Service
public class DuelMetaService {

    private final DuelMetaRepository repository;
    private final GameService gameService;

    public DuelMetaService(DuelMetaRepository repository, GameService gameService) {
        this.repository = repository;
        this.gameService = gameService;
    }

    public DuelMetaResponse attachGame(long duelId, int chainId, String creatorAddress, DuelMetaRequest request) {
        GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());

        DuelMeta existing = repository.findByDuelIdAndChainId(duelId, chainId).orElse(null);
        DuelMeta meta = new DuelMeta(
            existing != null ? existing.id() : null,
            duelId, chainId, game.slug(), creatorAddress.toLowerCase(), null
        );

        try {
            DuelMeta saved = repository.save(meta);
            return toResponse(saved, game.name());
        } catch (DuplicateKeyException e) {
            DuelMeta found = repository.findByDuelIdAndChainId(duelId, chainId).orElseThrow();
            return toResponse(found, game.name());
        }
    }

    public DuelMetaResponse getByDuel(long duelId, int chainId) {
        return repository.findByDuelIdAndChainId(duelId, chainId)
            .map(meta -> {
                String gameName = gameService.getBySlug(meta.gameSlug()).name();
                return toResponse(meta, gameName);
            })
            .orElse(null);
    }

    public List<DuelMetaResponse> getByGameSlug(String gameSlug) {
        return repository.findByGameSlug(gameSlug).stream()
            .map(meta -> {
                String gameName = gameService.getBySlug(meta.gameSlug()).name();
                return toResponse(meta, gameName);
            })
            .toList();
    }

    private DuelMetaResponse toResponse(DuelMeta meta, String gameName) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.gameSlug(),
            gameName, meta.creatorAddress(), meta.createdAt()
        );
    }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/pro/duelme/backend/service/GameService.java backend/src/main/java/pro/duelme/backend/service/DuelMetaService.java
git commit -m "feat: add GameService and DuelMetaService"
```

---

## Task 5: Backend Controllers + Config

**Files:**
- Create: `backend/src/main/java/pro/duelme/backend/controller/GameController.java`
- Create: `backend/src/main/java/pro/duelme/backend/controller/DuelMetaController.java`
- Modify: `backend/src/main/java/pro/duelme/backend/config/SecurityConfig.java`
- Modify: `backend/src/main/java/pro/duelme/backend/config/WebConfig.java`

- [ ] **Step 1: Create GameController**

```java
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
```

- [ ] **Step 2: Create DuelMetaController**

```java
package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RestController
@RequestMapping("/api/v1/duels")
public class DuelMetaController {

    private final DuelMetaService duelMetaService;

    public DuelMetaController(DuelMetaService duelMetaService) {
        this.duelMetaService = duelMetaService;
    }

    @Operation(summary = "Attach game to a duel", security = @SecurityRequirement(name = "bearer"))
    @PostMapping("/{duelId}/meta")
    public DuelMetaResponse attachGame(
            @PathVariable long duelId,
            @RequestParam int chainId,
            @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress,
            @Valid @RequestBody DuelMetaRequest request) {
        return duelMetaService.attachGame(duelId, chainId, walletAddress, request);
    }

    @Operation(summary = "Get duel metadata")
    @GetMapping("/{duelId}/meta")
    public ResponseEntity<DuelMetaResponse> getDuelMeta(
            @PathVariable long duelId,
            @RequestParam int chainId) {
        DuelMetaResponse meta = duelMetaService.getByDuel(duelId, chainId);
        return meta != null ? ResponseEntity.ok(meta) : ResponseEntity.notFound().build();
    }

    @Operation(summary = "List duels by game")
    @GetMapping("/meta")
    public List<DuelMetaResponse> listByGame(@RequestParam String gameSlug) {
        return duelMetaService.getByGameSlug(gameSlug);
    }
}
```

- [ ] **Step 3: Update SecurityConfig**

In `backend/src/main/java/pro/duelme/backend/config/SecurityConfig.java`, add before `.anyRequest().denyAll()`:

```java
.requestMatchers(HttpMethod.GET, "/api/v1/games").permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/games/{slug}").permitAll()
.requestMatchers(HttpMethod.POST, "/api/v1/duels/{duelId}/meta").authenticated()
.requestMatchers(HttpMethod.GET, "/api/v1/duels/{duelId}/meta").permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/duels/meta").permitAll()
```

- [ ] **Step 4: Update WebConfig — add POST to CORS**

In `backend/src/main/java/pro/duelme/backend/config/WebConfig.java`, change:
```java
.allowedMethods("GET", "PUT", "DELETE", "OPTIONS")
```
to:
```java
.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
```

- [ ] **Step 5: Verify compilation**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/pro/duelme/backend/controller/GameController.java backend/src/main/java/pro/duelme/backend/controller/DuelMetaController.java backend/src/main/java/pro/duelme/backend/config/SecurityConfig.java backend/src/main/java/pro/duelme/backend/config/WebConfig.java
git commit -m "feat: add Game and DuelMeta controllers with security config"
```

---

## Task 6: Backend Tests

**Files:**
- Create: `backend/src/test/java/pro/duelme/backend/controller/GameControllerTest.java`
- Create: `backend/src/test/java/pro/duelme/backend/controller/DuelMetaControllerTest.java`

- [ ] **Step 1: Create GameControllerTest**

```java
package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.GameRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GameRepository gameRepository;

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
    }

    @Test
    void listGamesReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listGamesReturnsAll() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listGamesFiltersByCategory() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games").param("category", "FPS"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("cs2"));
    }

    @Test
    void listGamesSearchesByName() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games").param("search", "val"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("valorant"));
    }

    @Test
    void getGameBySlug() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games/cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.category").value("FPS"));
    }

    @Test
    void getGameBySlugReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/games/nonexistent"))
            .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Create DuelMetaControllerTest**

```java
package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DuelMetaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
    }

    @Test
    void attachGameRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void attachGameCreatesMetaAndGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "Counter-Strike 2", "category": "FPS"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duelId").value(1))
            .andExpect(jsonPath("$.chainId").value(421614))
            .andExpect(jsonPath("$.gameSlug").value("counter-strike-2"))
            .andExpect(jsonPath("$.gameName").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.creatorAddress").value("0xcreator"));

        mockMvc.perform(get("/api/v1/games/counter-strike-2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"));
    }

    @Test
    void getDuelMetaReturnsMetadata() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/5/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "Valorant"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/duels/5/meta").param("chainId", "421614"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameSlug").value("valorant"));
    }

    @Test
    void getDuelMetaReturns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/duels/999/meta").param("chainId", "421614"))
            .andExpect(status().isNotFound());
    }

    @Test
    void listDuelsByGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/duels/2/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/duels/meta").param("gameSlug", "cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void attachGameValidatesBlankName() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": ""}
                    """))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 3: Run all backend tests**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew test`
Expected: All tests pass (including existing ProfileController and ProfileService tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/pro/duelme/backend/controller/GameControllerTest.java backend/src/test/java/pro/duelme/backend/controller/DuelMetaControllerTest.java
git commit -m "test: add Game and DuelMeta controller tests"
```

---

## Task 7: Frontend Types + API Client

**Files:**
- Create: `frontend/src/lib/game.ts`
- Create: `frontend/src/lib/gameApi.ts`

- [ ] **Step 1: Create game types**

```typescript
// frontend/src/lib/game.ts
export type GameCategory = 'FPS' | 'MOBA' | 'SPORT' | 'STRATEGY' | 'FIGHTING' | 'RACING' | 'CARD' | 'OTHER';

export interface Game {
  slug: string;
  name: string;
  iconUrl: string | null;
  category: GameCategory;
  duelCount: number;
  totalVolume: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DuelMeta {
  duelId: number;
  chainId: number;
  gameSlug: string;
  gameName: string;
  creatorAddress: string;
  createdAt: string | null;
}

export const GAME_CATEGORIES: GameCategory[] = [
  'FPS', 'MOBA', 'SPORT', 'STRATEGY', 'FIGHTING', 'RACING', 'CARD', 'OTHER',
];
```

- [ ] **Step 2: Create game API client**

```typescript
// frontend/src/lib/gameApi.ts
import type { Game, GameCategory, DuelMeta } from './game';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export async function fetchGames(category?: GameCategory, search?: string): Promise<Game[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/games${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch games');
  return res.json();
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const res = await fetch(`${API_BASE}/games/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch game');
  return res.json();
}

export async function attachGameToDuel(
  token: string,
  duelId: number,
  chainId: number,
  gameName: string,
  category?: GameCategory,
): Promise<DuelMeta> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?chainId=${chainId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameName, category }),
  });
  if (!res.ok) throw new Error('Failed to attach game');
  return res.json();
}

export async function fetchDuelMeta(duelId: number, chainId: number): Promise<DuelMeta | null> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?chainId=${chainId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch duel metadata');
  return res.json();
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/game.ts frontend/src/lib/gameApi.ts
git commit -m "feat: add game types and API client"
```

---

## Task 8: Frontend Hooks

**Files:**
- Create: `frontend/src/hooks/useGames.ts`
- Create: `frontend/src/hooks/useGame.ts`
- Create: `frontend/src/hooks/useDuelMeta.ts`

- [ ] **Step 1: Create useGames hook**

```typescript
// frontend/src/hooks/useGames.ts
import { useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game, GameCategory } from '@/lib/game';

export function useGames(category?: GameCategory, search?: string) {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: ['games', category ?? null, search ?? null],
    queryFn: () => fetchGames(category, search),
    staleTime: 60_000,
  });
  return { games: data ?? [], isLoading };
}
```

- [ ] **Step 2: Create useGame hook**

```typescript
// frontend/src/hooks/useGame.ts
import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

export function useGame(slug: string) {
  const { data, isLoading } = useQuery<Game | null>({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });
  return { game: data ?? null, isLoading };
}
```

- [ ] **Step 3: Create useDuelMeta hook**

```typescript
// frontend/src/hooks/useDuelMeta.ts
import { useQuery } from '@tanstack/react-query';
import { fetchDuelMeta } from '@/lib/gameApi';
import type { DuelMeta } from '@/lib/game';

export function useDuelMeta(duelId: number | undefined, chainId: number | undefined) {
  const { data, isLoading } = useQuery<DuelMeta | null>({
    queryKey: ['duelMeta', duelId, chainId],
    queryFn: () => fetchDuelMeta(duelId!, chainId!),
    enabled: duelId !== undefined && chainId !== undefined,
    staleTime: 60_000,
  });
  return { meta: data ?? null, isLoading };
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useGames.ts frontend/src/hooks/useGame.ts frontend/src/hooks/useDuelMeta.ts
git commit -m "feat: add useGames, useGame, and useDuelMeta hooks"
```

---

## Task 9: Frontend Components (GameBadge, GameAutocomplete, GameCard)

**Files:**
- Create: `frontend/src/components/game/GameBadge.tsx`
- Create: `frontend/src/components/game/GameAutocomplete.tsx`
- Create: `frontend/src/components/game/GameCard.tsx`

- [ ] **Step 1: Create GameBadge**

```typescript
// frontend/src/components/game/GameBadge.tsx
'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

interface GameBadgeProps {
  gameName: string;
  gameSlug?: string;
}

export function GameBadge({ gameName, gameSlug }: GameBadgeProps) {
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      <Gamepad2 className="h-3 w-3" />
      {gameName}
    </span>
  );

  if (gameSlug) {
    return (
      <Link href={`/games/${gameSlug}`} className="transition-opacity hover:opacity-80">
        {badge}
      </Link>
    );
  }
  return badge;
}
```

- [ ] **Step 2: Create GameAutocomplete**

```typescript
// frontend/src/components/game/GameAutocomplete.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { Gamepad2 } from 'lucide-react';

interface GameAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
}

export function GameAutocomplete({ value, onChange }: GameAutocompleteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { games } = useGames(undefined, debouncedSearch || undefined);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v);
            setSearch(v);
            setOpen(v.length > 0);
          }}
          onFocus={() => { if (value.length > 0) setOpen(true); }}
          placeholder={t('create.gamePlaceholder')}
          maxLength={50}
          className="h-11 border-slate-200 bg-white pl-10"
        />
      </div>
      {open && games.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {games.slice(0, 8).map((game) => (
            <li key={game.slug}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onChange(game.name);
                  setOpen(false);
                }}
              >
                <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{game.name}</span>
                <span className="ml-auto text-xs text-slate-400">{game.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && !open && (
        <p className="mt-1 text-xs text-slate-400">{t('create.gameHint')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create GameCard**

```typescript
// frontend/src/components/game/GameCard.tsx
'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { Game } from '@/lib/game';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {game.name}
          </h3>
          <span className="text-xs text-slate-400">{t(`category.${game.category}` as any)}</span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
        <span>{game.duelCount} {t('games.duelsCount')}</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/game/GameBadge.tsx frontend/src/components/game/GameAutocomplete.tsx frontend/src/components/game/GameCard.tsx
git commit -m "feat: add GameBadge, GameAutocomplete, and GameCard components"
```

---

## Task 10: Frontend Translations

**Files:**
- Modify: `frontend/src/i18n/translations.ts`

- [ ] **Step 1: Add game-related translation keys**

Add to the `en` section (after the existing nav keys):

```typescript
// Navigation
'nav.games': 'Games',
'sidenav.games': 'Games',

// Games catalog
'games.title': 'Game Catalog',
'games.subtitle': 'Browse games that players duel in',
'games.searchPlaceholder': 'Search games...',
'games.noGames': 'No games yet. Create a duel to add the first one!',
'games.noMatches': 'No games found',
'games.allCategories': 'All',
'games.duelsCount': 'duels',

// Game detail
'game.recentDuels': 'Recent Duels',
'game.noDuels': 'No duels for this game yet',

// Category names
'category.FPS': 'FPS',
'category.MOBA': 'MOBA',
'category.SPORT': 'Sport',
'category.STRATEGY': 'Strategy',
'category.FIGHTING': 'Fighting',
'category.RACING': 'Racing',
'category.CARD': 'Card',
'category.OTHER': 'Other',

// Duel creation
'create.game': 'Game',
'create.gamePlaceholder': 'Type game name (e.g. CS2, Valorant)',
'create.gameHint': 'Game will be created automatically if not found',

// Landing
'popularGames.title': 'Popular Games',
'popularGames.subtitle': 'See what people are dueling in',
'popularGames.viewAll': 'View all games',
```

Add the same keys to the `ru` section:

```typescript
'nav.games': 'Игры',
'sidenav.games': 'Игры',

'games.title': 'Каталог игр',
'games.subtitle': 'Игры, в которых дуэлятся игроки',
'games.searchPlaceholder': 'Поиск игр...',
'games.noGames': 'Игр пока нет. Создайте дуэль, чтобы добавить первую!',
'games.noMatches': 'Игры не найдены',
'games.allCategories': 'Все',
'games.duelsCount': 'дуэлей',

'game.recentDuels': 'Последние дуэли',
'game.noDuels': 'Дуэлей по этой игре пока нет',

'category.FPS': 'Шутер',
'category.MOBA': 'MOBA',
'category.SPORT': 'Спорт',
'category.STRATEGY': 'Стратегия',
'category.FIGHTING': 'Файтинг',
'category.RACING': 'Гонки',
'category.CARD': 'Карточная',
'category.OTHER': 'Другое',

'create.game': 'Игра',
'create.gamePlaceholder': 'Введите название игры (напр. CS2, Valorant)',
'create.gameHint': 'Игра будет создана автоматически, если не найдена',

'popularGames.title': 'Популярные игры',
'popularGames.subtitle': 'Смотрите, в чём дуэлятся игроки',
'popularGames.viewAll': 'Все игры',
```

- [ ] **Step 2: Verify lint and types**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit && npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/translations.ts
git commit -m "feat: add game-related translations (EN + RU)"
```

---

## Task 11: Integrate Game into CreateDuelForm

**Files:**
- Modify: `frontend/src/components/duel/CreateDuelForm.tsx`

- [ ] **Step 1: Add game state and import**

At top of file, add imports:
```typescript
import { GameAutocomplete } from '@/components/game/GameAutocomplete';
import { attachGameToDuel } from '@/lib/gameApi';
import { useIdentityToken } from '@privy-io/react-auth';
```

Inside the component, add state:
```typescript
const [gameName, setGameName] = useState('');
const { identityToken } = useIdentityToken();
```

- [ ] **Step 2: Add GameAutocomplete to the form JSX**

Insert the game field section between the message textarea section and the chain selector section. Find the existing message section and add after it:

```tsx
{/* Game */}
<div>
  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
    <Gamepad2 className="h-4 w-4 text-indigo-600" />
    {t('create.game')}
  </label>
  <GameAutocomplete value={gameName} onChange={setGameName} />
</div>
```

Add `Gamepad2` to the lucide-react import at the top of the file.

- [ ] **Step 3: Attach game metadata after duel creation**

In the `useEffect` that handles successful duel creation (the one that parses `DuelCreated` event and calls `router.push`), add after `storeInviteSecret` and before `emitBalanceRefresh`:

```typescript
if (gameName.trim() && identityToken) {
  attachGameToDuel(identityToken, Number(duelId), chainConfig.id, gameName.trim()).catch(() => {
    // Fire-and-forget: duel exists on-chain regardless
  });
}
```

- [ ] **Step 4: Verify lint and types**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/duel/CreateDuelForm.tsx
git commit -m "feat: add game selection to duel creation form"
```

---

## Task 12: Games Catalog Page + Game Detail Page

**Files:**
- Create: `frontend/src/app/games/page.tsx`
- Create: `frontend/src/app/games/[slug]/page.tsx`

- [ ] **Step 1: Create games catalog page**

```typescript
// frontend/src/app/games/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { GameCard } from '@/components/game/GameCard';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { GAME_CATEGORIES, type GameCategory } from '@/lib/game';
import { Search, Gamepad2 } from 'lucide-react';

export default function GamesPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<GameCategory | undefined>(undefined);
  const [search, setSearch] = useState('');
  const { games, isLoading } = useGames(category, search || undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('games.title')}</h1>
        <p className="mt-1 text-slate-500">{t('games.subtitle')}</p>
      </div>

      {/* Search + category filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('games.searchPlaceholder')}
            className="h-10 border-slate-200 bg-white pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('games.allCategories')}
          </button>
          {GAME_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? undefined : cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`category.${cat}` as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Game grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Gamepad2 className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            {search ? t('games.noMatches') : t('games.noGames')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create game detail page**

```typescript
// frontend/src/app/games/[slug]/page.tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n/useTranslation';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t } = useTranslation();
  const { game, isLoading } = useGame(slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-slate-500">Game not found</p>
        <Link href="/games" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('popularGames.viewAll')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.games')}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Gamepad2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{game.name}</h1>
              <span className="text-sm text-white/80">{t(`category.${game.category}` as any)}</span>
            </div>
          </div>
          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-2xl font-bold">{game.duelCount}</p>
              <p className="text-sm text-white/70">{t('games.duelsCount')}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('game.recentDuels')}</h2>
          <p className="text-sm text-slate-500">{t('game.noDuels')}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/games/page.tsx frontend/src/app/games/\[slug\]/page.tsx
git commit -m "feat: add games catalog and game detail pages"
```

---

## Task 13: Header + Landing Page Integration

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Add Games link to Header**

In `frontend/src/components/layout/Header.tsx`, add `Gamepad2` to the lucide-react import.

Find the desktop nav section where "My Duels" link exists and add a Games link before it:

```tsx
<Link
  href="/games"
  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    pathname.startsWith('/games')
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`}
>
  <Gamepad2 className="h-4 w-4" />
  {t('nav.games')}
</Link>
```

Add the same link to the mobile menu section (inside the `mobileMenuOpen` conditional).

- [ ] **Step 2: Add Popular Games section to landing page**

In `frontend/src/app/page.tsx`, add a `PopularGamesSection` between existing sections. Create it as an inline component or import.

Add after `RecentDuelsSection` and before `TrustSection`:

```tsx
<PopularGamesSection />
```

Create the section component (either inline in the file or as a separate file `frontend/src/components/landing/PopularGamesSection.tsx`):

```tsx
'use client';

import Link from 'next/link';
import { GameCard } from '@/components/game/GameCard';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { Gamepad2, ArrowRight } from 'lucide-react';

export function PopularGamesSection() {
  const { t } = useTranslation();
  const { games, isLoading } = useGames();

  if (isLoading || games.length === 0) return null;

  return (
    <section id="games" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('popularGames.title')}</h2>
          <p className="mt-1 text-slate-500">{t('popularGames.subtitle')}</p>
        </div>
        <Link
          href="/games"
          className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
        >
          {t('popularGames.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.slice(0, 6).map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/games"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {t('popularGames.viewAll')} →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit && npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Header.tsx frontend/src/app/page.tsx frontend/src/components/landing/PopularGamesSection.tsx
git commit -m "feat: add Games to header nav and Popular Games landing section"
```

---

## Task 14: DuelCard Game Badge Integration

**Files:**
- Modify: `frontend/src/components/duel/DuelCard.tsx`

- [ ] **Step 1: Add game badge prop and rendering**

Add import at top of DuelCard:
```typescript
import { GameBadge } from '@/components/game/GameBadge';
```

Add `gameName?: string` and `gameSlug?: string` to the `DuelCardProps` interface.

In the JSX, find the info row where the chain badge and wager amount are displayed. Add the game badge next to it:

```tsx
{gameName && <GameBadge gameName={gameName} gameSlug={gameSlug} />}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/duel/DuelCard.tsx
git commit -m "feat: add game badge to DuelCard component"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run all backend tests**

Run: `cd /home/oserver/projects/duelme/backend && ./gradlew test`
Expected: All tests pass

- [ ] **Step 2: Run frontend checks**

Run: `cd /home/oserver/projects/duelme/frontend && npx tsc --noEmit && npm run lint`
Expected: No errors

- [ ] **Step 3: Build frontend**

Run: `cd /home/oserver/projects/duelme/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any remaining fixes**

If any fixes were needed, commit them.

- [ ] **Step 5: Final commit summarizing Phase 1**

```bash
git add -A
git commit -m "feat: complete Phase 1 — game catalog and duel metadata"
```
