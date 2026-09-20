package pro.duelme.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pro.duelme.backend.model.FaucetClaim;

import java.util.Optional;

public interface FaucetClaimRepository extends MongoRepository<FaucetClaim, String> {
    Optional<FaucetClaim> findByWalletAddressAndTokenAddress(String walletAddress, String tokenAddress);
}
