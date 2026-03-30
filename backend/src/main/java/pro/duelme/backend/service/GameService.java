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

    public List<GameResponse> list(GameCategory category, String search, int limit) {
        if (search != null && search.length() > 50) search = search.substring(0, 50);
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
        return games.stream().map(this::toResponse).limit(limit).toList();
    }

    public GameResponse getOrCreate(String name, String iconUrl, GameCategory category) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Game name must not be empty");
        }
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
        String slug = name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
        if (slug.isEmpty()) {
            // Fallback for non-Latin names: use hex hash of lowercased name
            slug = "g-" + Integer.toHexString(name.trim().toLowerCase().hashCode());
        }
        return slug;
    }

    public void incrementStats(String slug, long wagerAmount) {
        repository.findBySlug(slug).ifPresent(game -> {
            Game updated = new Game(
                game.id(), game.slug(), game.name(), game.iconUrl(), game.category(),
                game.duelCount() + 1, game.totalVolume() + wagerAmount,
                game.createdAt(), null
            );
            repository.save(updated);
        });
    }

    private GameResponse toResponse(Game game) {
        return new GameResponse(
            game.slug(), game.name(), game.iconUrl(), game.category(),
            game.duelCount(), game.totalVolume(),
            game.createdAt(), game.updatedAt()
        );
    }
}
