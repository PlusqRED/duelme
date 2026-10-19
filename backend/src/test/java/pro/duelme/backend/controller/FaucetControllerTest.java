package pro.duelme.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FaucetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void claimRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/faucet/claim"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void claimReturns503WhenFaucetDisabled() throws Exception {
        // duelme.faucet.enabled defaults to false in application.yml, so the
        // FaucetService bean isn't wired; the controller should respond 503
        // Service Unavailable (the endpoint exists but the feature is off here).
        var auth = new WalletAuthenticationToken("0xfaucettest");

        mockMvc.perform(post("/api/v1/faucet/claim")
                .with(authentication(auth)))
            .andExpect(status().isServiceUnavailable());
    }

    @Test
    void statusRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/faucet/status"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void statusSaysTheFaucetIsOffWhenDisabled() throws Exception {
        // Off is an answer, not an error: the wallet menu reads it to leave the faucet out.
        var auth = new WalletAuthenticationToken("0xfaucettest");

        mockMvc.perform(get("/api/v1/faucet/status")
                .with(authentication(auth)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.claimed").isEmpty())
            .andExpect(jsonPath("$.chainId").isEmpty())
            .andExpect(jsonPath("$.usdtAmountRaw").isEmpty())
            .andExpect(jsonPath("$.ethAmountWei").isEmpty());
    }
}
