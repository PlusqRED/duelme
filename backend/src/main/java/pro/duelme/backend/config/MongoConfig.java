package pro.duelme.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.Profile;
import pro.duelme.backend.model.SocialOAuthState;

import java.time.Duration;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    /**
     * Spring Data MongoDB does not auto-create indexes declared on the model in
     * Spring Boot 3+, so the unique constraint that enforces "one claim per wallet
     * per token" would be unenforced without this. We create it explicitly at
     * startup; {@code createIndex} is idempotent.
     *
     * <p>Named from the same constant as the annotation, and ordered after
     * {@link FaucetClaimIndexMigrationRunner}: the single-field predecessor has to be
     * gone before this goes in, or it keeps rejecting the second claim that a MockUSDT
     * redeploy is supposed to allow. Declared rather than left to the
     * {@code LOWEST_PRECEDENCE} an unordered runner gets, so that adding an order here
     * later cannot quietly invert it.
     */
    @Order(FaucetClaimIndexMigrationRunner.ORDER + 1)
    @Bean
    public ApplicationRunner ensureFaucetClaimIndexes(MongoTemplate template) {
        return args -> template.indexOps(FaucetClaim.class)
            .createIndex(new Index()
                .on("walletAddress", Sort.Direction.ASC)
                .on("tokenAddress", Sort.Direction.ASC)
                .unique()
                .named(FaucetClaim.UNIQUE_INDEX));
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

    /**
     * TTL index on {@link SocialOAuthState#expiresAt}. {@code Duration.ZERO}
     * tells Mongo to treat the field value itself as the absolute expiry
     * time — the document is deleted once {@code expiresAt < now()}. Mongo
     * runs the TTL monitor every 60s, so a small grace window above the
     * stored expiry is normal and harmless ({@code verify} re-checks expiry
     * in-process).
     */
    @Bean
    public ApplicationRunner ensureSocialOAuthStateIndexes(MongoTemplate template) {
        return args -> template.indexOps(SocialOAuthState.class)
            .createIndex(new Index()
                .on("expiresAt", Sort.Direction.ASC)
                .expire(Duration.ZERO));
    }

    /**
     * The same reason as above, one collection over: {@code DuelMeta}'s
     * {@code @CompoundIndex(unique = true)} is decoration until something
     * creates it. Without this the {@code DuplicateKeyException} branch in
     * {@code DuelMetaService#attachGame} is unreachable, two concurrent writes
     * for one duel leave two rows behind, and every later read of that duel
     * fails with {@code IncorrectResultSizeDataAccessException} — a permanent
     * 500 on that duel's page.
     *
     * <p>Named to match the annotation, for the reason {@link DuelMeta#UNIQUE_INDEX}
     * gives. Ordered after {@link DuelMetaIndexMigrationRunner#ORDER} — see there for why.
     */
    @Order(DuelMetaIndexMigrationRunner.ORDER + 1)
    @Bean
    public ApplicationRunner ensureDuelMetaIndexes(MongoTemplate template) {
        return args -> template.indexOps(DuelMeta.class)
            .createIndex(new Index()
                .on("contractAddress", Sort.Direction.ASC)
                .on("duelId", Sort.Direction.ASC)
                .on("chainId", Sort.Direction.ASC)
                .unique()
                .named(DuelMeta.UNIQUE_INDEX));
    }

    /**
     * {@code Game.slug} carries {@code @Indexed(unique = true)} and had the same
     * defect. {@code GameService#createGame} catches
     * {@code DuplicateKeyException} to make "get or create" idempotent, so
     * without the index two callers naming the same game concurrently each get
     * their own row. Named from the same constant as the annotation, for the
     * reason {@link Game#UNIQUE_INDEX} gives.
     */
    @Bean
    public ApplicationRunner ensureGameIndexes(MongoTemplate template) {
        return args -> template.indexOps(Game.class)
            .createIndex(new Index().on("slug", Sort.Direction.ASC).unique().named(Game.UNIQUE_INDEX));
    }
}
