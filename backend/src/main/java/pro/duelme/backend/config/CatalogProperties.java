package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.service.GameService;

import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The games DuelMe puts into the catalog itself, by category: every game the frontend has a guide
 * for, and the names Russian players know some of them by, each a game of its own for players to
 * pick. {@code GameService#seedCatalog} writes them at every boot.
 *
 * <p>A map of plain names rather than a list of records: it binds in the native image with no
 * hints. {@code gameGuides.test.ts} fails when a guide is missing here or sits in another category.
 */
@ConfigurationProperties(prefix = "duelme.catalog")
public record CatalogProperties(Map<GameCategory, List<String>> games) {

    public CatalogProperties {
        var slugs = new HashMap<String, String>();
        var copy = new EnumMap<GameCategory, List<String>>(GameCategory.class);
        (games == null ? Map.<GameCategory, List<String>>of() : games).forEach((category, names) -> {
            for (String name : names) {
                if (name == null || name.isBlank()) {
                    throw new IllegalStateException("duelme.catalog.games." + category + " has a blank name");
                }
                // Two spellings of one game would make the second boot rename it back and forth.
                String earlier = slugs.put(GameService.toSlug(name), name);
                if (earlier != null) {
                    throw new IllegalStateException(
                        "duelme.catalog.games names one game twice: " + earlier + " and " + name);
                }
            }
            copy.put(category, List.copyOf(names));
        });
        games = Collections.unmodifiableMap(copy);
    }
}
