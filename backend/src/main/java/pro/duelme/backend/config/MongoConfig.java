package pro.duelme.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import pro.duelme.backend.model.FaucetClaim;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    /**
     * Spring Data MongoDB does not auto-create indexes declared via
     * {@code @Indexed} in Spring Boot 3+, so the unique constraint on
     * {@link FaucetClaim#walletAddress} would be unenforced without this.
     * We create it explicitly at startup; {@code ensureIndex} is idempotent.
     */
    @Bean
    public ApplicationRunner ensureFaucetClaimIndexes(MongoTemplate template) {
        return args -> template.indexOps(FaucetClaim.class)
            .ensureIndex(new Index().on("walletAddress", Sort.Direction.ASC).unique());
    }
}
