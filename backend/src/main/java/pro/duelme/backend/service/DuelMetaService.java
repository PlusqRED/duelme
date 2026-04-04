package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import java.util.List;

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
            return toResponse(saved, game.name());
        }

        GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());
        DuelMeta meta = new DuelMeta(null, duelId, chainId, game.slug(), normalizedCaller, null);

        try {
            DuelMeta saved = repository.save(meta);
            return toResponse(saved, game.name());
        } catch (DuplicateKeyException e) {
            DuelMeta found = repository.findByDuelIdAndChainId(duelId, chainId).orElseThrow();
            return toResponse(found, game.name());
        }
    }

    public DuelMetaResponse getByDuel(long duelId, int chainId) {
        return repository.findByDuelIdAndChainId(duelId, chainId)
            .map(meta -> {
                String gameName = gameService.getBySlug(meta.gameSlug()).name();
                return toResponse(meta, gameName);
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
            .map(meta -> toResponse(meta, game.name()))
            .limit(limit)
            .toList();
    }

    private DuelMetaResponse toResponse(DuelMeta meta, String gameName) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.gameSlug(),
            gameName, meta.creatorAddress(), meta.createdAt()
        );
    }
}
