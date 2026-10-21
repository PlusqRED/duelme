package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.repository.FaucetClaimRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import java.time.Instant;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The faucet's status over HTTP where it runs; FaucetControllerTest covers it switched off. */
@SpringBootTest
@AutoConfigureMockMvc
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
class FaucetStatusEnabledControllerTest {

    private static final String WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final String TOKEN = "0xbf345834d808a058e1278b50f3844ad86686f401";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FaucetClaimRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void statusOffersTheAmountsAsDecimalStrings() throws Exception {
        // Strings, so a client reading JSON numbers as doubles cannot round the wei.
        mockMvc.perform(get("/api/v1/faucet/status")
                .with(authentication(new WalletAuthenticationToken(WALLET))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.claimed").value(false))
            .andExpect(jsonPath("$.chainId").value(421614))
            .andExpect(jsonPath("$.usdtAmountRaw").value("100000000"))
            .andExpect(jsonPath("$.ethAmountWei").value("1000000000000000"));
    }

    @Test
    void statusSaysClaimedForTheCallersFinishedClaim() throws Exception {
        repository.save(new FaucetClaim(null, WALLET, TOKEN, "0xeth", "0xusdt", Instant.now()));

        mockMvc.perform(get("/api/v1/faucet/status")
                .with(authentication(new WalletAuthenticationToken(WALLET))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.claimed").value(true));
    }
}
