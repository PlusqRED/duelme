package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;

import java.util.List;
import java.util.Optional;

public interface GameRepository extends MongoRepository<Game, String> {

    Optional<Game> findBySlug(String slug);

    List<Game> findByCategory(GameCategory category);

    List<Game> findByNameContainingIgnoreCase(String name);

    List<Game> findByCategoryAndNameContainingIgnoreCase(GameCategory category, String name);
}
