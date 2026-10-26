package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.config.ContractProperties;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GameService {

    private final GameRepository repository;
    private final DuelMetaRepository duelMetaRepository;
    private final ContractProperties contracts;

    public GameService(
        GameRepository repository,
        DuelMetaRepository duelMetaRepository,
        ContractProperties contracts
    ) {
        this.repository = repository;
        this.duelMetaRepository = duelMetaRepository;
        this.contracts = contracts;
    }

    public GameResponse getBySlug(String slug) {
        return findBySlug(slug).orElseThrow(() -> new GameNotFoundException(slug));
    }

    public Optional<GameResponse> findBySlug(String slug) {
        return repository.findBySlug(slug.toLowerCase()).map(this::withLiveDuelCount);
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
        // One aggregation for the whole catalog, not a count per game: the badge is
        // wanted for every row before the sort can happen, and gameSlug carries no index.
        Map<String, Long> counts = duelMetaRepository.countByGameSlugForDeployments(contracts.duelMe());
        return games.stream()
            .map(game -> toResponse(game, counts.getOrDefault(game.slug(), 0L)))
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
            .map(this::withLiveDuelCount)
            .orElseGet(() -> createGame(slug, name, iconUrl, category));
    }

    /**
     * Puts the catalog's own games ({@code duelme.catalog.games}) in place, each under its category,
     * with one read for them all. A game already there keeps its id and duels and takes the catalog's
     * name and category: that is how a game moves to a new category.
     */
    public void seedCatalog(Map<GameCategory, List<String>> catalog) {
        Map<String, Game> wanted = new LinkedHashMap<>();
        catalog.forEach((category, names) -> names.forEach(name -> {
            Game game = new Game(null, toSlug(name), name.trim(), null, category, null, null);
            Game earlier = wanted.putIfAbsent(game.slug(), game);
            // Two spellings of one game would make every boot rename it from one to the other.
            if (earlier != null) {
                throw new IllegalStateException(
                    "duelme.catalog.games names one game twice: " + earlier.name() + " and " + game.name());
            }
        }));
        Map<String, Game> known = repository.findBySlugIn(wanted.keySet()).stream()
            .collect(Collectors.toMap(Game::slug, Function.identity()));
        List<Game> writes = new ArrayList<>();
        for (Game game : wanted.values()) {
            Game held = known.get(game.slug());
            if (held == null) {
                writes.add(game);
            } else if (!held.name().equals(game.name()) || held.category() != game.category()) {
                writes.add(new Game(
                    held.id(), held.slug(), game.name(), held.iconUrl(), game.category(), held.createdAt(), held.updatedAt()
                ));
            }
        }
        repository.saveAll(writes);
    }

    private GameResponse createGame(String slug, String name, String iconUrl, GameCategory category) {
        Game game = new Game(
            null, slug, name.trim(), iconUrl,
            category != null ? category : GameCategory.OTHER,
            null, null
        );
        try {
            Game saved = repository.save(game);
            // Brand new, so nothing can reference it yet — no need to go and count zero.
            return toResponse(saved, 0);
        } catch (DuplicateKeyException e) {
            return repository.findBySlug(slug)
                .map(this::withLiveDuelCount)
                .orElseThrow(() -> new GameNotFoundException(slug));
        }
    }

    static String toSlug(String name) {
        String slug = name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
        if (slug.isEmpty() || hasNonLatinLetter(name)) {
            // Fallback for non-Latin names: 12-hex-char SHA-256 prefix of the
            // normalized name. SHA-256 is collision-resistant where String.hashCode
            // is not, so distinct Cyrillic / CJK names produce distinct slugs. A name
            // that mixes scripts takes it too: the Latin rule keeps only what is left
            // of it, and «Дота 2» and «КС 2» were both "2", one game.
            slug = "g-" + sha256Prefix(name.trim().toLowerCase(), 12);
        }
        return slug;
    }

    private static boolean hasNonLatinLetter(String name) {
        return name.codePoints().anyMatch(codePoint ->
            Character.isLetter(codePoint) && Character.UnicodeScript.of(codePoint) != Character.UnicodeScript.LATIN);
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

    private GameResponse withLiveDuelCount(Game game) {
        return toResponse(game, duelMetaRepository.countForDeployments(game.slug(), contracts.duelMe()));
    }

    /**
     * The count is passed in rather than fetched here: the listing resolves every game's
     * in one aggregation, and a method that quietly queried per game would undo that.
     */
    private GameResponse toResponse(Game game, long duelCount) {
        return new GameResponse(
            game.slug(), game.name(), game.iconUrl(), game.category(),
            duelCount, game.createdAt(), game.updatedAt()
        );
    }
}
