package pro.duelme.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pro.duelme.backend.service.GameService;

@Configuration
public class GameCatalogConfig {

    /**
     * Writes the catalog's own games ({@link CatalogProperties}) at every boot. Like the index
     * runners in {@link MongoConfig} it may run any number of times: a game already in place is
     * left as it is.
     */
    @Bean
    public ApplicationRunner seedGameCatalog(GameService gameService, CatalogProperties catalog) {
        return args -> gameService.seedCatalog(catalog.games());
    }
}
