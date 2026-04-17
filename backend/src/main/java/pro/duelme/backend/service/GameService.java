package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

@Service
public class GameService {

    private final GameRepository repository;
    private final DuelMetaRepository duelMetaRepository;

    public GameService(GameRepository repository, DuelMetaRepository duelMetaRepository) {
        this.repository = repository;
        this.duelMetaRepository = duelMetaRepository;
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
        return games.stream()
            .map(this::toResponse)
            .sorted(Comparator.comparingLong(GameResponse::duelCount).reversed())
            .limit(limit)
            .toList();
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
            null, null
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
            // Fallback for non-Latin names: 12-hex-char SHA-256 prefix of the
            // normalized name. SHA-256 is collision-resistant where String.hashCode
            // is not, so distinct Cyrillic / CJK names produce distinct slugs.
            slug = "g-" + sha256Prefix(name.trim().toLowerCase(), 12);
        }
        return slug;
    }

    private static String sha256Prefix(String input, int hexChars) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, hexChars);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 must be available on every JVM", e);
        }
    }

    private GameResponse toResponse(Game game) {
        long count = duelMetaRepository.countByGameSlug(game.slug());
        return new GameResponse(
            game.slug(), game.name(), game.iconUrl(), game.category(),
            count, game.createdAt(), game.updatedAt()
        );
    }
}
