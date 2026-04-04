package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.DuelMeta;

import java.util.List;
import java.util.Optional;

public interface DuelMetaRepository extends MongoRepository<DuelMeta, String> {

    Optional<DuelMeta> findByDuelIdAndChainId(long duelId, int chainId);

    List<DuelMeta> findByGameSlug(String gameSlug);

    List<DuelMeta> findByChainIdAndDuelIdIn(int chainId, List<Long> duelIds);

    long countByGameSlug(String gameSlug);
}
