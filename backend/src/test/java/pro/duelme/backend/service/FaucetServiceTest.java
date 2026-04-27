package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import pro.duelme.backend.exception.FaucetAlreadyClaimedException;
import pro.duelme.backend.exception.FaucetExecutionException;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.repository.FaucetClaimRepository;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises duplicate-claim locking and address validation. The happy-path
 * signing call is not covered here because it would hit a real RPC endpoint;
 * that path is validated manually against the dev-env testnet.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "duelme.faucet.enabled=true",
    // Valid-but-throwaway key for deterministic Credentials construction.
    "duelme.faucet.private-key=0x0000000000000000000000000000000000000000000000000000000000000001",
    "duelme.faucet.rpc-url=http://127.0.0.1:1",
    "duelme.faucet.chain-id=421614",
    "duelme.faucet.mock-usdt-address=0xbf345834d808a058e1278b50f3844aD86686f401",
    "duelme.faucet.eth-amount-eth=0.001",
    "duelme.faucet.usdt-amount-raw=100000000"
})
class FaucetServiceTest {

    private static final String WALLET_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final String WALLET_A_MIXED = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";

    @Autowired
    private FaucetService faucetService;

    @Autowired
    private FaucetClaimRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void rejectsRepeatClaimForSameWallet() {
        repository.save(new FaucetClaim(null, WALLET_A, "0xeth", "0xusdt", Instant.now()));

        assertThatThrownBy(() -> faucetService.claim(WALLET_A))
            .isInstanceOf(FaucetAlreadyClaimedException.class);
    }

    @Test
    void normalisesWalletAddressBeforeLookup() {
        repository.save(new FaucetClaim(null, WALLET_A, "0xeth", "0xusdt", Instant.now()));

        assertThatThrownBy(() -> faucetService.claim(WALLET_A_MIXED))
            .isInstanceOf(FaucetAlreadyClaimedException.class);
    }

    @Test
    void resumesWhenPriorAttemptLeftUsdtUnminted() {
        // ETH was sent in a previous request but USDT mint failed (e.g. base
        // fee race). The retry must NOT throw AlreadyClaimed — resume logic
        // should carry the call through to the RPC layer, where it fails with
        // ExecutionException because the test RPC endpoint is unreachable.
        // @CreatedDate stamps the insert, so read the actual value back
        // before calling the service and assert it survives the resume.
        repository.save(new FaucetClaim(null, WALLET_A, "0xpriorEth", null, null));
        Instant originalCreatedAt = repository.findByWalletAddress(WALLET_A).orElseThrow().createdAt();

        assertThatThrownBy(() -> faucetService.claim(WALLET_A))
            .isInstanceOf(FaucetExecutionException.class);

        // ETH hash and createdAt must survive — a retry needs to skip the
        // ETH send (no double-drain) and keep the original audit timestamp.
        var persisted = repository.findByWalletAddress(WALLET_A).orElseThrow();
        assertThat(persisted.ethTxHash()).isEqualTo("0xpriorEth");
        assertThat(persisted.usdtTxHash()).isNull();
        assertThat(persisted.createdAt()).isEqualTo(originalCreatedAt);
    }

    @Test
    void rejectsMalformedAddress() {
        assertThatThrownBy(() -> faucetService.claim("0xnothex"))
            .isInstanceOf(FaucetExecutionException.class);
    }

    @Test
    void rejectsMissingHexPrefix() {
        assertThatThrownBy(() -> faucetService.claim("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))
            .isInstanceOf(FaucetExecutionException.class);
    }

    @Test
    void rejectsTooShortAddress() {
        assertThatThrownBy(() -> faucetService.claim("0xabc"))
            .isInstanceOf(FaucetExecutionException.class);
    }

    @Test
    void rejectsNullAddress() {
        assertThatThrownBy(() -> faucetService.claim(null))
            .isInstanceOf(FaucetExecutionException.class);
    }
}
