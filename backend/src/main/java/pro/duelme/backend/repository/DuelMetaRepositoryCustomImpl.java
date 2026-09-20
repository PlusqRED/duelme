package pro.duelme.backend.repository;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import pro.duelme.backend.model.DuelMeta;

import java.util.HashMap;
import java.util.Map;

/**
 * Spring Data wires this to {@link DuelMetaRepository} by the {@code Impl} suffix —
 * the name is load-bearing, renaming the class silently drops the fragment.
 */
public class DuelMetaRepositoryCustomImpl implements DuelMetaRepositoryCustom {

    private final MongoTemplate template;

    public DuelMetaRepositoryCustomImpl(MongoTemplate template) {
        this.template = template;
    }

    @Override
    public Map<String, Long> countByGameSlugForDeployments(Map<Integer, String> deployments) {
        if (deployments.isEmpty()) {
            return Map.of();
        }
        var aggregation = Aggregation.newAggregation(
            Aggregation.match(liveDeployments(deployments)),
            Aggregation.group("gameSlug").count().as("count")
        );
        var counts = new HashMap<String, Long>();
        template.aggregate(aggregation, DuelMeta.class, org.bson.Document.class)
            .forEach(row -> {
                // group("gameSlug") emits the key as _id; a row written before the field
                // existed would carry null and belongs to no game.
                Object slug = row.get("_id");
                if (slug != null) {
                    counts.put(slug.toString(), ((Number) row.get("count")).longValue());
                }
            });
        return counts;
    }

    @Override
    public long countForDeployments(String gameSlug, Map<Integer, String> deployments) {
        if (deployments.isEmpty()) {
            return 0;
        }
        var criteria = new Criteria().andOperator(
            Criteria.where("gameSlug").is(gameSlug),
            liveDeployments(deployments)
        );
        return template.count(new Query(criteria), DuelMeta.class);
    }

    /**
     * A row counts only when its chain and contract are a pair that is deployed now.
     * Matching on the chain alone would keep every previous deployment's duels in the
     * total, which is the whole thing this exists to stop.
     */
    private static Criteria liveDeployments(Map<Integer, String> deployments) {
        Criteria[] pairs = deployments.entrySet().stream()
            .map(entry -> Criteria.where("chainId").is(entry.getKey())
                .and("contractAddress").is(entry.getValue()))
            .toArray(Criteria[]::new);
        return new Criteria().orOperator(pairs);
    }
}
