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
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.exception.NotAuthorizedException;
import pro.duelme.backend.exception.NotLiveDeploymentException;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import java.util.ArrayList;
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
        DuelMeta meta = repository
            .findByChainIdAndContractAddressAndDuelId(chainId, contractAddress.toLowerCase(), duelId)
            .orElse(null);
        if (meta == null) return null;
        GameResponse game = findGame(meta.gameSlug()).orElse(null);
        if (game == null) {
            warnGameMissing(meta);
            return null;
        }
        return toResponse(meta, game);
    }

    public List<DuelMetaResponse> getByGameSlug(String gameSlug, int chainId, String contractAddress, int limit) {
        GameResponse game;
        try {
            game = gameService.getBySlug(gameSlug);
        } catch (GameNotFoundException e) {
            return List.of();
        }
        // game.slug() rather than the raw parameter: the lookup above accepts any
        // casing, and querying on the uncanonicalised spelling would find nothing.
        return repository
            .findByGameSlugAndChainIdAndContractAddressOrderByCreatedAtDesc(
                game.slug(), chainId, contractAddress.toLowerCase(), Limit.of(limit))
            .stream()
            .map(meta -> toResponse(meta, game))
            .toList();
    }

    public List<DuelMetaResponse> getByDuelIds(int chainId, String contractAddress, List<Long> duelIds) {
        if (duelIds.isEmpty()) return List.of();
        List<DuelMeta> metas = repository
            .findByChainIdAndContractAddressAndDuelIdIn(chainId, contractAddress.toLowerCase(), duelIds);
        if (metas.isEmpty()) return List.of();

        Map<String, Optional<GameResponse>> gamesBySlug = metas.stream()
            .map(DuelMeta::gameSlug)
            .distinct()
            .collect(Collectors.toMap(slug -> slug, this::findGame));

        List<DuelMetaResponse> responses = new ArrayList<>(metas.size());
        for (DuelMeta meta : metas) {
            gamesBySlug.get(meta.gameSlug()).ifPresentOrElse(
                game -> responses.add(toResponse(meta, game)),
                () -> warnGameMissing(meta));
        }
        return responses;
    }

    /**
     * A row whose game is gone reads as a row with no metadata. Throwing instead turns one
     * broken row into a 404 for the whole batch, and with it every duel on the page.
     */
    private Optional<GameResponse> findGame(String slug) {
        try {
            return Optional.of(gameService.getBySlug(slug));
        } catch (GameNotFoundException e) {
            return Optional.empty();
        }
    }

    private static void warnGameMissing(DuelMeta meta) {
        log.warn("Game {} of duel {} on chain {} contract {} not found; serving the duel without metadata",
            meta.gameSlug(), meta.duelId(), meta.chainId(), meta.contractAddress());
    }

    private DuelMetaResponse toResponse(DuelMeta meta, GameResponse game) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.contractAddress(), meta.gameSlug(),
            game.name(), game.category(), meta.creatorAddress(), meta.createdAt()
        );
    }
}
