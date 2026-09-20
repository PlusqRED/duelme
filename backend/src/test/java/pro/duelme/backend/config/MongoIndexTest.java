package pro.duelme.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.FaucetClaimRepository;
import pro.duelme.backend.repository.GameRepository;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static pro.duelme.backend.support.TestContracts.REDEPLOYED_CONTRACT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A unique index declared with {@code @CompoundIndex} / {@code @Indexed} is
 * inert unless {@link MongoConfig} creates it — Spring Boot stopped
 * auto-creating them. Nothing caught that, because every duplicate-key branch
 * in the services is a {@code catch} that simply never fired. These tests fail
 * if the constraint goes back to being decoration.
 */
@SpringBootTest
@ActiveProfiles("test")
class MongoIndexTest {

    private static final String WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final String TOKEN = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    /** The MockUSDT a later testnet deploy shipped, which must not collide with the first. */
    private static final String REDEPLOYED_TOKEN = "0xcccccccccccccccccccccccccccccccccccccccc";

    @Autowired
    private MongoTemplate template;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private FaucetClaimRepository faucetClaimRepository;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
        faucetClaimRepository.deleteAll();
    }

    @Test
    void duelMetaUniqueIndexExistsUnderTheNameTheAnnotationDeclares() {
        assertThat(template.indexOps(DuelMeta.class).getIndexInfo())
            .filteredOn(index -> DuelMeta.UNIQUE_INDEX.equals(index.getName()))
            .singleElement()
            .satisfies(index -> {
                assertThat(index.isUnique()).isTrue();
                assertThat(index.getIndexFields()).extracting(field -> field.getKey())
                    .containsExactly("contractAddress", "duelId", "chainId");
            });
    }

    @Test
    void duelMetaRejectsASecondRowForTheSameDuel() {
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xcreator", null));

        assertThatThrownBy(() -> duelMetaRepository.save(
            new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "valorant", "0xcreator", null)))
            .isInstanceOf(DuplicateKeyException.class);

        assertThat(duelMetaRepository.findAll()).hasSize(1);
    }

    @Test
    void duelMetaAllowsTheSameDuelIdUnderAnotherDeployment() {
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xcreator", null));

        assertThatCode(() -> duelMetaRepository.save(
            new DuelMeta(null, REDEPLOYED_CONTRACT, 1, CHAIN_ID, "valorant", "0xother", null)))
            .doesNotThrowAnyException();

        assertThat(duelMetaRepository.findAll()).hasSize(2);
    }

    @Test
    void faucetClaimUniqueIndexExistsUnderTheNameTheAnnotationDeclares() {
        assertThat(template.indexOps(FaucetClaim.class).getIndexInfo())
            .filteredOn(index -> FaucetClaim.UNIQUE_INDEX.equals(index.getName()))
            .singleElement()
            .satisfies(index -> {
                assertThat(index.isUnique()).isTrue();
                assertThat(index.getIndexFields()).extracting(field -> field.getKey())
                    .containsExactly("walletAddress", "tokenAddress");
            });
    }

    @Test
    void faucetClaimRejectsASecondClaimAgainstTheSameToken() {
        faucetClaimRepository.save(new FaucetClaim(null, WALLET, TOKEN, "0xeth", "0xusdt", null));

        assertThatThrownBy(() -> faucetClaimRepository.save(
            new FaucetClaim(null, WALLET, TOKEN, "0xeth2", "0xusdt2", null)))
            .isInstanceOf(DuplicateKeyException.class);

        assertThat(faucetClaimRepository.findAll()).hasSize(1);
    }

    @Test
    void faucetClaimAllowsTheSameWalletAgainstARedeployedToken() {
        faucetClaimRepository.save(new FaucetClaim(null, WALLET, TOKEN, "0xeth", "0xusdt", null));

        assertThatCode(() -> faucetClaimRepository.save(
            new FaucetClaim(null, WALLET, REDEPLOYED_TOKEN, "0xeth2", "0xusdt2", null)))
            .doesNotThrowAnyException();

        assertThat(faucetClaimRepository.findAll()).hasSize(2);
    }

    @Test
    void gameRejectsADuplicateSlug() {
        gameRepository.save(new Game(null, "cs2", "CS2", null, GameCategory.FPS, null, null));

        assertThatThrownBy(() -> gameRepository.save(
            new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null)))
            .isInstanceOf(DuplicateKeyException.class);

        assertThat(gameRepository.findAll()).hasSize(1);
    }
}
