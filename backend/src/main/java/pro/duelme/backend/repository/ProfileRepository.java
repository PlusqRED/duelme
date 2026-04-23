package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.Profile;

import java.util.List;
import java.util.Optional;

public interface ProfileRepository extends MongoRepository<Profile, String> {

    Optional<Profile> findByWalletAddress(String walletAddress);

    List<Profile> findByWalletAddressIn(List<String> walletAddresses);

    void deleteByWalletAddress(String walletAddress);

    Optional<Profile> findBySocialLinksSteamSteamId(String steamId);

    Optional<Profile> findBySocialLinksTelegramTelegramId(String telegramId);
}
