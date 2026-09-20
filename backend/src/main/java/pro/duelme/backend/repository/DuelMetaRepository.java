package pro.duelme.backend.repository;

import org.springframework.data.domain.Limit;
import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.DuelMeta;

import java.util.List;
import java.util.Optional;

public interface DuelMetaRepository extends MongoRepository<DuelMeta, String> {

    Optional<DuelMeta> findByChainIdAndContractAddressAndDuelId(
        int chainId, String contractAddress, long duelId);

    List<DuelMeta> findByChainIdAndContractAddressAndDuelIdIn(
        int chainId, String contractAddress, List<Long> duelIds);

    /**
     * The cap is a query argument rather than a {@code limit()} on the result:
     * applied afterwards it truncates before the deployment filter, so a game
     * whose first rows all belong to another chain came back empty.
     *
     * <p>Newest first, because the cap has to cut something: in insertion order
     * a game with more duels than the cap would serve its first hundred forever
     * and never show the ones that are still live.
     */
    List<DuelMeta> findByGameSlugAndChainIdAndContractAddressOrderByCreatedAtDesc(
        String gameSlug, int chainId, String contractAddress, Limit limit);

    /**
     * Deliberately not scoped to a deployment: this is the game catalog's
     * popularity badge, and a duel played on a previous deployment still
     * happened. The listing above is the one that must be scoped, because its
     * ids get hydrated against one contract.
     */
    long countByGameSlug(String gameSlug);
}
