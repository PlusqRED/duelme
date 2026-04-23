package pro.duelme.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.model.Profile;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    /**
     * Spring Data MongoDB does not auto-create indexes declared via
     * {@code @Indexed} in Spring Boot 3+, so the unique constraint on
     * {@link FaucetClaim#walletAddress} would be unenforced without this.
     * We create it explicitly at startup; {@code createIndex} is idempotent.
     */
    @Bean
    public ApplicationRunner ensureFaucetClaimIndexes(MongoTemplate template) {
        return args -> template.indexOps(FaucetClaim.class)
            .createIndex(new Index().on("walletAddress", Sort.Direction.ASC).unique());
    }

    /**
     * Profile.walletAddress uniqueness + sparse unique indexes on linked
     * social accounts. Sparse is required: most profiles have no social
     * links, and without sparse the index would treat every missing value
     * as the same {@code null} and reject all but one such document.
     */
    @Bean
    public ApplicationRunner ensureProfileIndexes(MongoTemplate template) {
        return args -> {
            var ops = template.indexOps(Profile.class);
            ops.createIndex(new Index()
                .on("walletAddress", Sort.Direction.ASC).unique());
            ops.createIndex(new Index()
                .on("socialLinks.steam.steamId", Sort.Direction.ASC).unique().sparse());
            ops.createIndex(new Index()
                .on("socialLinks.telegram.telegramId", Sort.Direction.ASC).unique().sparse());
        };
    }
}
