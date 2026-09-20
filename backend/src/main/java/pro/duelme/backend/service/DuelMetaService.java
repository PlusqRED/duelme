package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.exception.NotAuthorizedException;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DuelMetaService {

    private final DuelMetaRepository repository;
    private final GameService gameService;

    public DuelMetaService(DuelMetaRepository repository, GameService gameService) {
        this.repository = repository;
        this.gameService = gameService;
    }

    public DuelMetaResponse attachGame(
        long duelId, int chainId, String contractAddress, String callerAddress, DuelMetaRequest request) {
        String contract = contractAddress.toLowerCase();
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
        return repository.findByChainIdAndContractAddressAndDuelId(chainId, contractAddress.toLowerCase(), duelId)
            .map(meta -> {
                GameResponse game = gameService.getBySlug(meta.gameSlug());
                return toResponse(meta, game);
            })
            .orElse(null);
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

        Map<String, GameResponse> gamesBySlug = metas.stream()
            .map(DuelMeta::gameSlug)
            .distinct()
            .collect(Collectors.toMap(slug -> slug, gameService::getBySlug));

        return metas.stream()
            .map(meta -> toResponse(meta, gamesBySlug.get(meta.gameSlug())))
            .toList();
    }

    private DuelMetaResponse toResponse(DuelMeta meta, GameResponse game) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.contractAddress(), meta.gameSlug(),
            game.name(), game.category(), meta.creatorAddress(), meta.createdAt()
        );
    }
}
