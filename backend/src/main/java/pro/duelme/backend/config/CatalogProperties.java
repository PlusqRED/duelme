package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import pro.duelme.backend.model.GameCategory;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * {@code duelme.catalog.games}: the games DuelMe puts into the catalog itself, by category. What
 * belongs there is said beside the list in application.yml.
 *
 * <p>A map of plain names rather than a list of records: it binds in the native image with no hints.
 */
@ConfigurationProperties(prefix = "duelme.catalog")
public record CatalogProperties(Map<GameCategory, List<String>> games) {

    public CatalogProperties {
        var copy = new EnumMap<GameCategory, List<String>>(GameCategory.class);
        (games == null ? Map.<GameCategory, List<String>>of() : games).forEach((category, names) -> {
            for (String name : names) {
                if (name == null || name.isBlank()) {
                    throw new IllegalStateException("duelme.catalog.games." + category + " has a blank name");
                }
            }
            copy.put(category, List.copyOf(names));
        });
        games = Collections.unmodifiableMap(copy);
    }
}
