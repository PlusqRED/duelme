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

    public DuelMetaResponse attachGame(long duelId, int chainId, String creatorAddress, DuelMetaRequest request) {
        GameResponse game = gameService.getOrCreate(request.gameName(), request.iconUrl(), request.category());

        DuelMeta existing = repository.findByDuelIdAndChainId(duelId, chainId).orElse(null);
        if (existing != null && !existing.creatorAddress().equals(creatorAddress.toLowerCase())) {
            return toResponse(existing, gameService.getBySlug(existing.gameSlug()).name());
        }
        DuelMeta meta = new DuelMeta(
            existing != null ? existing.id() : null,
            duelId, chainId, game.slug(), creatorAddress.toLowerCase(), null
        );

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

    public List<DuelMetaResponse> getByGameSlug(String gameSlug) {
        return repository.findByGameSlug(gameSlug).stream()
            .map(meta -> {
                String gameName = gameService.getBySlug(meta.gameSlug()).name();
                return toResponse(meta, gameName);
            })
            .toList();
    }

    private DuelMetaResponse toResponse(DuelMeta meta, String gameName) {
        return new DuelMetaResponse(
            meta.duelId(), meta.chainId(), meta.gameSlug(),
            gameName, meta.creatorAddress(), meta.createdAt()
        );
    }
}
