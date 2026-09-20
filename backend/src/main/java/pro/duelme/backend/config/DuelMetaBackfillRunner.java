package pro.duelme.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import pro.duelme.backend.model.DuelMeta;

/**
 * Gives pre-existing {@code duelMeta} rows the contract address they were
 * written under, then retires the key that did not have one.
 *
 * <p>Those rows predate the field, so the deployment they belong to is the one
 * that is live on their chain right now — they cannot have been written against
 * a later redeploy that has not happened yet. That inference is only sound
 * before the next redeploy, which is why this ships ahead of it.
 *
 * <p>A runner rather than a script: a script can be forgotten, and the release
 * that forgets it serves every duel page a row keyed on a field nothing sets.
 * Both steps are idempotent — the second run matches no rows and finds no index
 * — so it is safe on every boot and needs no "has this run" marker.
 */
@Order(DuelMetaBackfillRunner.ORDER)
@Component
public class DuelMetaBackfillRunner implements ApplicationRunner {

    /**
     * Before {@code MongoConfig#ensureDuelMetaIndexes}. The order is the point:
     * the new unique index must not exist while legacy rows still share a null
     * {@code contractAddress}, and the old {@code duelId_chainId} index has to be
     * gone before the new one goes in — left in place it would reject the very
     * id collisions this change exists to allow.
     */
    public static final int ORDER = 0;

    private static final Logger log = LoggerFactory.getLogger(DuelMetaBackfillRunner.class);

    private final MongoTemplate template;
    private final ContractProperties contracts;

    public DuelMetaBackfillRunner(MongoTemplate template, ContractProperties contracts) {
        this.template = template;
        this.contracts = contracts;
    }

    @Override
    public void run(ApplicationArguments args) {
        backfillContractAddress();
        dropLegacyIndex();
    }

    private void backfillContractAddress() {
        // Every boot after the first has nothing to stamp, and this is the whole
        // check: one index-bounded query that stops at the first match, instead of
        // an updateMulti per configured chain plus a count, forever.
        var unstamped = new Query(Criteria.where("contractAddress").is(null));
        if (!template.exists(unstamped, DuelMeta.class)) {
            return;
        }

        contracts.duelMe().forEach((chainId, address) -> {
            // `is(null)` matches a missing field as well as an explicit null, which
            // is what rows written before the field existed look like.
            var query = new Query(Criteria.where("chainId").is(chainId)
                .and("contractAddress").is(null));
            long updated = template.updateMulti(query, new Update().set("contractAddress", address),
                DuelMeta.class).getModifiedCount();
            if (updated > 0) {
                log.info("Backfilled contractAddress={} on {} duelMeta rows for chain {}",
                    address, updated, chainId);
            }
        });

        long orphaned = template.count(unstamped, DuelMeta.class);
        if (orphaned > 0) {
            // No deployment is configured for their chain, so there is nothing to
            // infer. They stay invisible to every lookup rather than being guessed at.
            log.warn("{} duelMeta rows are on chains absent from duelme.contracts.duel-me "
                + "and keep a null contractAddress", orphaned);
        }
    }

    private void dropLegacyIndex() {
        var ops = template.indexOps(DuelMeta.class);
        boolean present = ops.getIndexInfo().stream()
            .anyMatch(index -> DuelMeta.LEGACY_UNIQUE_INDEX.equals(index.getName()));
        if (present) {
            ops.dropIndex(DuelMeta.LEGACY_UNIQUE_INDEX);
            log.info("Dropped the legacy {} index on duelMeta", DuelMeta.LEGACY_UNIQUE_INDEX);
        }
    }
}
