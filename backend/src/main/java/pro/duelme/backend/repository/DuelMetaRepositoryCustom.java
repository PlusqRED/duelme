package pro.duelme.backend.repository;

import java.util.Map;

/**
 * Duel counts restricted to the deployments that are live right now.
 *
 * <p>Separate from the derived queries because the restriction is an OR over
 * {@code (chainId, contractAddress)} pairs, which method-name derivation cannot
 * express, and because the listing form has to be one pass rather than a query
 * per game.
 */
public interface DuelMetaRepositoryCustom {

    /**
     * Counts per game slug across {@code deployments}, as a single aggregation —
     * the catalog listing needs every game's count at once, and a query per game
     * turns the landing page into N round trips against an unindexed field.
     *
     * <p>Games with no duel on a live deployment are absent, not zero: callers
     * default them, which is also what makes a redeploy reset every badge.
     */
    Map<String, Long> countByGameSlugForDeployments(Map<Integer, String> deployments);

    /** The same count for one game, for the paths that only ever need one. */
    long countForDeployments(String gameSlug, Map<Integer, String> deployments);
}
