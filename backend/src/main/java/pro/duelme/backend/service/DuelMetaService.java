package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.dto.GameResponse;
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

    public DuelMetaResponse attachGame(long duelId, int chainId, String callerAddress, DuelMetaRequest request) {
        String normalizedCaller = callerAddress.toLowerCase();

        DuelMeta existing = repository.findByDuelIdAndChainId(duelId, chainId).orElse(null);
        if (existing != null) {
            if (!existing.creatorAddress().equals(normalizedCaller)) {
                throw new pro.duelme.backend.exception.NotAuthorizedException(
                    "Only the duel creator can modify game metadata");
            }
            GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());
            DuelMeta updated = new DuelMeta(
                existing.id(), duelId, chainId, game.slug(), normalizedCaller, existing.createdAt()
            );
            DuelMeta saved = repository.save(updated);
            return toResponse(saved, game);
        }

        GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());
        DuelMeta meta = new DuelMeta(null, duelId, chainId, game.slug(), normalizedCaller, null);

        try {
            DuelMeta saved = repository.save(meta);
            return toResponse(saved, game);
        } catch (DuplicateKeyException e) {
            DuelMeta found = repository.findByDuelIdAndChainId(duelId, chainId).orElseThrow();
            return toResponse(found, game);
        }
    }

    public DuelMetaResponse getByDuel(long duelId, int chainId) {
        return repository.findByDuelIdAndChainId(duelId, chainId)
            .map(meta -> {
                GameResponse game = gameService.getBySlug(meta.gameSlug());
                return toResponse(meta, game);
            })
            .orElse(null);
    }

    public List<DuelMetaResponse> getByGameSlug(String gameSlug, int limit) {
        GameResponse game;
        try {
            game = gameService.getBySlug(gameSlug);
        } catch (pro.duelme.backend.exception.GameNotFoundException e) {
            return List.of();
        }
        return repository.findByGameSlug(gameSlug).stream()
            .map(meta -> toResponse(meta, game))
            .limit(limit)
            .toList();
    }

    public List<DuelMetaResponse> getByDuelIds(int chainId, List<Long> duelIds) {
        if (duelIds.isEmpty()) return List.of();
        List<DuelMeta> metas = repository.findByChainIdAndDuelIdIn(chainId, duelIds);
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
            meta.duelId(), meta.chainId(), meta.gameSlug(),
            game.name(), game.category(), meta.creatorAddress(), meta.createdAt()
        );
    }
}
