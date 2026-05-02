package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.repository.ProfileRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();
    }

    @Test
    void upsertAndGetProfile() throws Exception {
        var auth = new WalletAuthenticationToken("0xtest123");

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nickname": "gamer1", "status": "ready to duel"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nickname").value("gamer1"))
            .andExpect(jsonPath("$.walletAddress").value("0xtest123"));

        mockMvc.perform(get("/api/v1/profiles/0xtest123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nickname").value("gamer1"));
    }

    @Test
    void getMyProfile() throws Exception {
        var auth = new WalletAuthenticationToken("0xme");

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nickname": "myself"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/profiles/me")
                .with(authentication(auth)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nickname").value("myself"));
    }

    @Test
    void getProfileReturns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/0xnonexistent"))
            .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedPutReturns401() throws Exception {
        mockMvc.perform(put("/api/v1/profiles/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nickname": "hacker"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedGetMeReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void batchLookup() throws Exception {
        var auth = new WalletAuthenticationToken("0xbatch1");

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nickname": "batch-user"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/profiles?addresses=0xbatch1,0xbatch2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].nickname").value("batch-user"));
    }

    @Test
    void deleteProfile() throws Exception {
        var auth = new WalletAuthenticationToken("0xdelete");

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nickname": "soon-gone"}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/profiles/me")
                .with(authentication(auth)))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/profiles/0xdelete"))
            .andExpect(status().isNotFound());
    }

    @Test
    void validationRejectsTooLongNickname() throws Exception {
        var auth = new WalletAuthenticationToken("0xvalid");
        String longNickname = "a".repeat(31);

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\": \"" + longNickname + "\"}"))
            .andExpect(status().isBadRequest());
    }
}
