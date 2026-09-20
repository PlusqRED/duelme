package pro.duelme.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import pro.duelme.backend.model.DuelMeta;

/**
 * Retires the {@code duelId + chainId} index that predates keying duel metadata by the
 * contract it came from, so the three-field one can take its place.
 *
 * <p>It used to also stamp rows that had no {@code contractAddress} with whatever
 * deployment was configured at boot. That inference held only while no redeploy had
 * happened yet, and on 2026-09-20 it did not: the mainnet redeploy and the release
 * carrying the runner reached prod in the same deploy, so nine duels from May were
 * stamped with a contract that had never seen them. They then sat on duel ids 0..8 of a
 * contract whose own count was zero, and {@code DuelMetaService} answers a duplicate key
 * by returning the row it found — so the first nine real duels would each have shown a
 * stranger's game. No error, just a wrong answer, which is the failure mode CLAUDE.md
 * warns about for exactly this key.
 *
 * <p>So it no longer guesses. A row with no contract address matches no lookup and counts
 * toward no game, which is the right answer for metadata whose deployment is unknown.
 *
 * <p>Idempotent — a second run finds no index — so it is safe on every boot.
 */
@Order(DuelMetaIndexMigrationRunner.ORDER)
@Component
public class DuelMetaIndexMigrationRunner implements ApplicationRunner {

    /**
     * Before {@code MongoConfig#ensureDuelMetaIndexes}, which declares {@code ORDER + 1}.
     * The old {@code duelId_chainId} index has to be gone before the new one goes in:
     * left in place it rejects the very id collisions the contract-keyed index exists to
     * allow, which is what a same-chain redeploy produces on its first duel.
     */
    public static final int ORDER = 0;

    private static final Logger log = LoggerFactory.getLogger(DuelMetaIndexMigrationRunner.class);

    private final MongoTemplate template;

    public DuelMetaIndexMigrationRunner(MongoTemplate template) {
        this.template = template;
    }

    @Override
    public void run(ApplicationArguments args) {
        var ops = template.indexOps(DuelMeta.class);
        boolean present = ops.getIndexInfo().stream()
            .anyMatch(index -> DuelMeta.LEGACY_UNIQUE_INDEX.equals(index.getName()));
        if (present) {
            ops.dropIndex(DuelMeta.LEGACY_UNIQUE_INDEX);
            log.info("Dropped the legacy {} index on duelMeta", DuelMeta.LEGACY_UNIQUE_INDEX);
        }
    }
}
