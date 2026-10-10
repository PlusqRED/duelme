package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static pro.duelme.backend.support.TestContracts.REDEPLOYED_CONTRACT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DuelMetaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
    }

    private void attach(long duelId, String contract, String body) throws Exception {
        mockMvc.perform(post("/api/v1/duels/" + duelId + "/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", contract)
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    @Test
    void attachGameRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void attachGameCreatesMetaAndGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "Counter-Strike 2", "category": "FPS"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duelId").value(1))
            .andExpect(jsonPath("$.chainId").value(421614))
            .andExpect(jsonPath("$.contractAddress").value(CONTRACT))
            .andExpect(jsonPath("$.gameSlug").value("counter-strike-2"))
            .andExpect(jsonPath("$.gameName").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.category").value("FPS"))
            .andExpect(jsonPath("$.creatorAddress").value("0xcreator"));

        mockMvc.perform(get("/api/v1/games/counter-strike-2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"));
    }

    @Test
    void attachGameRejectsAMalformedContractAddress() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", "not-an-address")
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void attachGameRejectsAContractThatIsNotLiveOnTheChain() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", REDEPLOYED_CONTRACT)
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());

        assertThat(duelMetaRepository.count()).isZero();
        assertThat(gameRepository.count()).isZero();
    }

    @Test
    void attachGameRejectsTheLiveContractOnAnotherChain() throws Exception {
        // 42161 has a deployment of its own in application.yml, and this is not it.
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "42161")
                .param("contractAddress", CONTRACT)
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());

        assertThat(duelMetaRepository.count()).isZero();
        assertThat(gameRepository.count()).isZero();
    }

    @Test
    void attachGameRequiresAContractAddress() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2"}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getDuelMetaReturnsMetadata() throws Exception {
        attach(5, CONTRACT, """
            {"gameName": "Valorant"}
            """);

        mockMvc.perform(get("/api/v1/duels/5/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameSlug").value("valorant"));
    }

    @Test
    void getDuelMetaReturns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/duels/999/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT))
            .andExpect(status().isNotFound());
    }

    @Test
    void getDuelMetaReturns404ForAnotherDeployment() throws Exception {
        attach(5, CONTRACT, """
            {"gameName": "Valorant"}
            """);

        mockMvc.perform(get("/api/v1/duels/5/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", REDEPLOYED_CONTRACT))
            .andExpect(status().isNotFound());
    }

    @Test
    void listDuelsByGame() throws Exception {
        attach(1, CONTRACT, """
            {"gameName": "CS2"}
            """);
        attach(2, CONTRACT, """
            {"gameName": "CS2"}
            """);

        mockMvc.perform(get("/api/v1/duels/meta")
                .param("gameSlug", "cs2")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listDuelsByGameExcludesOtherDeployments() throws Exception {
        attach(1, CONTRACT, """
            {"gameName": "CS2"}
            """);
        // Written while that deployment was live; POST refuses it now.
        duelMetaRepository.save(new DuelMeta(null, REDEPLOYED_CONTRACT, 2, CHAIN_ID, "cs2", "0xcreator", null));

        mockMvc.perform(get("/api/v1/duels/meta")
                .param("gameSlug", "cs2")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", REDEPLOYED_CONTRACT))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].duelId").value(2));
    }

    @Test
    void listDuelsByGameRejectsALimitOutOfRange() throws Exception {
        mockMvc.perform(get("/api/v1/duels/meta")
                .param("gameSlug", "cs2")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("limit", "0"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void batchByDuelIdsReturnsMatchingMetas() throws Exception {
        attach(1, CONTRACT, """
            {"gameName": "CS2", "category": "FPS"}
            """);
        attach(3, CONTRACT, """
            {"gameName": "Dota 2", "category": "MOBA"}
            """);

        mockMvc.perform(get("/api/v1/duels/meta/batch")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("duelIds", "1", "2", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].gameName").exists())
            .andExpect(jsonPath("$[0].category").exists());
    }

    @Test
    void batchByDuelIdsLeavesOutARowWhoseGameIsGone() throws Exception {
        attach(1, CONTRACT, """
            {"gameName": "CS2"}
            """);
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "vanished-game", "0xcreator", null));
        attach(3, CONTRACT, """
            {"gameName": "Dota 2"}
            """);

        mockMvc.perform(get("/api/v1/duels/meta/batch")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("duelIds", "1", "2", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.duelId == 2)]").isEmpty());
    }

    @Test
    void getDuelMetaAnswersARowWhoseGameIsGoneAsNoMetadata() throws Exception {
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "vanished-game", "0xcreator", null));

        // The same empty 404 as a duel that never had metadata, not GameNotFound's error body.
        mockMvc.perform(get("/api/v1/duels/2/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT))
            .andExpect(status().isNotFound())
            .andExpect(content().string(""));
    }

    @Test
    void batchByDuelIdsReturnsEmptyForNoMatches() throws Exception {
        mockMvc.perform(get("/api/v1/duels/meta/batch")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("duelIds", "999", "998"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void batchByDuelIdsDoesNotRequireAuth() throws Exception {
        mockMvc.perform(get("/api/v1/duels/meta/batch")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("duelIds", "1"))
            .andExpect(status().isOk());
    }

    @Test
    void batchByDuelIdsReturnsEmptyForEmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/duels/meta/batch")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .param("duelIds", ""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void attachGameValidatesBlankName() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", String.valueOf(CHAIN_ID))
                .param("contractAddress", CONTRACT)
                .with(authentication(new WalletAuthenticationToken("0xcreator")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": ""}
                    """))
            .andExpect(status().isBadRequest());
    }
}
