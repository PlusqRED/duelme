package pro.duelme.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import pro.duelme.backend.config.ContractProperties;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.NotAuthorizedException;
import pro.duelme.backend.exception.NotLiveDeploymentException;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DuelMetaService {

    private static final Logger log = LoggerFactory.getLogger(DuelMetaService.class);

    private final DuelMetaRepository repository;
    private final GameService gameService;
    private final ContractProperties contracts;

    public DuelMetaService(DuelMetaRepository repository, GameService gameService, ContractProperties contracts) {
        this.repository = repository;
        this.gameService = gameService;
        this.contracts = contracts;
    }

    /**
     * Writes only for the deployment live on {@code chainId}. Reads still take any address,
     * because rows of a retired deployment stay valid history; a write for a contract we do
     * not run has no duel behind it and would only leave rows in {@code duelMeta} and
     * {@code games} for strangers' contracts.
     */
    public DuelMetaResponse attachGame(
        long duelId, int chainId, String contractAddress, String callerAddress, DuelMetaRequest request) {
        String contract = contractAddress.toLowerCase();
        if (!contract.equals(contracts.duelMe().get(chainId))) {
            throw new NotLiveDeploymentException(chainId, contract);
        }
        String normalizedCaller = callerAddress.toLowerCase();

        DuelMeta existing = repository
            .findByChainIdAndContractAddressAndDuelId(chainId, contract, duelId)
            .orElse(null);
        if (existing != null) {
            if (!existing.creatorAddress().equals(normalizedCaller)) {
                throw new NotAuthorizedException("Only the duel creator can modify game metadata");
            }
            GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());
            DuelMeta updated = new DuelMeta(
                existing.id(), contract, duelId, chainId, game.slug(), normalizedCaller, existing.createdAt()
            );
            DuelMeta saved = repository.save(updated);
            return toResponse(saved, game);
        }

        GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());
        DuelMeta meta = new DuelMeta(null, contract, duelId, chainId, game.slug(), normalizedCaller, null);

        try {
            DuelMeta saved = repository.save(meta);
            return toResponse(saved, game);
        } catch (DuplicateKeyException e) {
            DuelMeta found = repository
                .findByChainIdAndContractAddressAndDuelId(chainId, contract, duelId)
                .orElseThrow();
            return toResponse(found, game);
        }
    }

    public DuelMetaResponse getByDuel(long duelId, int chainId, String contractAddress) {
        return repository
            .findByChainIdAndContractAddressAndDuelId(chainId, contractAddress.toLowerCase(), duelId)
            .flatMap(meta -> withGame(meta, gameService.findBySlug(meta.gameSlug())))
            .orElse(null);
    }

    public List<DuelMetaResponse> getByGameSlug(String gameSlug, int chainId, String contractAddress, int limit) {
        // game.slug() rather than the raw parameter: the lookup accepts any casing, and
        // querying on the uncanonicalised spelling would find nothing.
        return gameService.findBySlug(gameSlug)
            .map(game -> repository
                .findByGameSlugAndChainIdAndContractAddressOrderByCreatedAtDesc(
                    game.slug(), chainId, contractAddress.toLowerCase(), Limit.of(limit))
                .stream()
                .map(meta -> toResponse(meta, game))
                .toList())
            .orElse(List.of());
    }

    public List<DuelMetaResponse> getByDuelIds(int chainId, String contractAddress, List<Long> duelIds) {
        if (duelIds.isEmpty()) return List.of();
        List<DuelMeta> metas = repository
            .findByChainIdAndContractAddressAndDuelIdIn(chainId, contractAddress.toLowerCase(), duelIds);
        if (metas.isEmpty()) return List.of();

        Map<String, Optional<GameResponse>> gamesBySlug = metas.stream()
            .map(DuelMeta::gameSlug)
            .distinct()
            .collect(Collectors.toMap(slug -> slug, gameService::findBySlug));

        return metas.stream()
            .flatMap(meta -> withGame(meta, gamesBySlug.get(meta.gameSlug())).stream())
            .toList();
    }

    /**
     * A row whose game is gone reads as a row with no metadata. Throwing instead turns one
     * broken row into a 404 for the whole batch, and with it every duel on the page.
     */
    private Optional<DuelMetaResponse> withGame(DuelMeta meta, Optional<GameResponse> game) {
        if (game.isEmpty()) {
            log.warn("Game {} of duel {} on chain {} contract {} not found; serving the duel without metadata",
                meta.gameSlug(), meta.duelId(), meta.chainId(), meta.contractAddress());
        }
        return game.map(found -> toResponse(meta, found));
    }

    private DuelMetaResponse toResponse(DuelMeta meta, GameResponse game) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.contractAddress(), meta.gameSlug(),
            game.name(), game.category(), meta.creatorAddress(), meta.createdAt()
        );
    }
}
