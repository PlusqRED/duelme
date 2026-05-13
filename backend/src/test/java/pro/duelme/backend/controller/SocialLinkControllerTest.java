package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.InstagramLink;
import pro.duelme.backend.model.Profile;
import pro.duelme.backend.model.SocialLinks;
import pro.duelme.backend.model.SteamLink;
import pro.duelme.backend.model.TelegramLink;
import pro.duelme.backend.repository.ProfileRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;
import pro.duelme.backend.service.SocialLinkStateService;
import pro.duelme.backend.service.SteamOpenIdService;
import pro.duelme.backend.service.SteamProfileFetcher;
import pro.duelme.backend.service.TelegramOidcService;

import java.time.Instant;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SocialLinkControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ProfileRepository profileRepository;
    @Autowired private SocialLinkStateService stateService;

    @MockitoBean private SteamOpenIdService steamService;
    @MockitoBean private SteamProfileFetcher steamProfileFetcher;
    @MockitoBean private TelegramOidcService telegramService;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();
    }

    // --- Initiate (authenticated) -------------------------------------

    @Test
    void initiateSteamReturnsRedirectUrl() throws Exception {
        when(steamService.buildAuthUrl(anyString()))
            .thenReturn("https://steamcommunity.com/openid/login?openid.mode=checkid_setup");

        mvc.perform(post("/api/v1/profiles/me/social/steam/initiate")
                .with(authentication(new WalletAuthenticationToken("0xabc"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.redirectUrl",
                startsWith("https://steamcommunity.com/openid/login")));
    }

    @Test
    void initiateSteamRequiresAuth() throws Exception {
        mvc.perform(post("/api/v1/profiles/me/social/steam/initiate"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void initiateTelegramReturnsRedirectUrl() throws Exception {
        when(telegramService.generateCodeVerifier()).thenReturn("verifier-abc");
        when(telegramService.buildAuthUrl(anyString(), anyString()))
            .thenReturn("https://oauth.telegram.org/auth?client_id=x");

        mvc.perform(post("/api/v1/profiles/me/social/telegram/initiate")
                .with(authentication(new WalletAuthenticationToken("0xabc"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.redirectUrl",
                startsWith("https://oauth.telegram.org/auth")));
    }

    @Test
    void initiateTelegramRequiresAuth() throws Exception {
        mvc.perform(post("/api/v1/profiles/me/social/telegram/initiate"))
            .andExpect(status().isUnauthorized());
    }

    // --- Steam callback (public, state-authenticated) -----------------

    @Test
    void steamCallbackSuccessRedirects() throws Exception {
        String state = stateService.sign(
            "0xabc", SocialLinkStateService.PLATFORM_STEAM, null);
        when(steamService.verifyCallback(any())).thenReturn("76561197960287930");
        when(steamProfileFetcher.fetch(anyString()))
            .thenReturn(Optional.of(new SteamProfileFetcher.SteamPlayerSummary("alice", "https://a.png")));

        mvc.perform(get("/api/v1/profiles/me/social/steam/callback")
                .param("state", state)
                .param("openid.mode", "id_res")
                .param("openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("steam=success")));

        Profile saved = profileRepository.findByWalletAddress("0xabc").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().steam().steamId())
            .isEqualTo("76561197960287930");
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().steam().username())
            .isEqualTo("alice");
    }

    @Test
    void steamCallbackAlreadyLinkedRedirectsWithAlreadyLinked() throws Exception {
        // Pre-populate a different profile owning the same Steam ID.
        profileRepository.save(new Profile(
            null, "0xother", null, null, null, null,
            new SocialLinks(
                new SteamLink("76561197960287930", "other", null, Instant.now()),
                null, null),
            null, null));

        String state = stateService.sign(
            "0xabc", SocialLinkStateService.PLATFORM_STEAM, null);
        when(steamService.verifyCallback(any())).thenReturn("76561197960287930");

        mvc.perform(get("/api/v1/profiles/me/social/steam/callback")
                .param("state", state)
                .param("openid.mode", "id_res")
                .param("openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("steam=alreadyLinked")));
    }

    @Test
    void steamCallbackInvalidStateRedirects() throws Exception {
        mvc.perform(get("/api/v1/profiles/me/social/steam/callback")
                .param("state", "not-a-valid-jwt"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("steam=verificationFailed")));
    }

    // --- Telegram callback ---------------------------------------------

    @Test
    void telegramCallbackSuccessRedirects() throws Exception {
        String state = stateService.sign(
            "0xabc", SocialLinkStateService.PLATFORM_TELEGRAM, "verifier-123");
        when(telegramService.exchangeCode("auth-code", "verifier-123"))
            .thenReturn(new TelegramOidcService.TelegramUserInfo(
                "tg-user-1", "alice_tg", "Alice", "https://t.me/pic"));

        mvc.perform(get("/api/v1/profiles/me/social/telegram/callback")
                .param("state", state)
                .param("code", "auth-code"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("telegram=success")));

        Profile saved = profileRepository.findByWalletAddress("0xabc").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().telegram().telegramId())
            .isEqualTo("tg-user-1");
    }

    @Test
    void telegramCallbackInvalidStateRedirects() throws Exception {
        mvc.perform(get("/api/v1/profiles/me/social/telegram/callback")
                .param("state", "bogus")
                .param("code", "anything"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("telegram=verificationFailed")));
    }

    // --- Instagram -----------------------------------------------------

    @Test
    void linkInstagramValidHandle() throws Exception {
        mvc.perform(put("/api/v1/profiles/me/social/instagram")
                .with(authentication(new WalletAuthenticationToken("0xabc")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"handle\": \"@Alice_IG\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.socialLinks.instagram.handle").value("alice_ig"));
    }

    @Test
    void linkInstagramInvalidHandleReturns400() throws Exception {
        mvc.perform(put("/api/v1/profiles/me/social/instagram")
                .with(authentication(new WalletAuthenticationToken("0xabc")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"handle\": \".invalid\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void linkInstagramEmptyHandleReturns400() throws Exception {
        mvc.perform(put("/api/v1/profiles/me/social/instagram")
                .with(authentication(new WalletAuthenticationToken("0xabc")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"handle\": \"\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void linkInstagramRequiresAuth() throws Exception {
        mvc.perform(put("/api/v1/profiles/me/social/instagram")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"handle\": \"valid\"}"))
            .andExpect(status().isUnauthorized());
    }

    // --- Unlink --------------------------------------------------------

    @Test
    void unlinkSteamReturns204AndClearsLink() throws Exception {
        profileRepository.save(new Profile(
            null, "0xabc", null, null, null, null,
            new SocialLinks(
                new SteamLink("76561197960287930", "alice", null, Instant.now()),
                new TelegramLink("tg1", "a_tg", "A", null, Instant.now()),
                new InstagramLink("a_ig", Instant.now())),
            null, null));

        mvc.perform(delete("/api/v1/profiles/me/social/steam")
                .with(authentication(new WalletAuthenticationToken("0xabc"))))
            .andExpect(status().isNoContent());

        Profile saved = profileRepository.findByWalletAddress("0xabc").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().steam()).isNull();
        // The other links remain.
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().telegram()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(saved.socialLinks().instagram()).isNotNull();
    }

    @Test
    void unlinkTelegramReturns204() throws Exception {
        mvc.perform(delete("/api/v1/profiles/me/social/telegram")
                .with(authentication(new WalletAuthenticationToken("0xabc"))))
            .andExpect(status().isNoContent());
    }

    @Test
    void unlinkInstagramReturns204() throws Exception {
        mvc.perform(delete("/api/v1/profiles/me/social/instagram")
                .with(authentication(new WalletAuthenticationToken("0xabc"))))
            .andExpect(status().isNoContent());
    }

    @Test
    void unlinkRequiresAuth() throws Exception {
        mvc.perform(delete("/api/v1/profiles/me/social/steam"))
            .andExpect(status().isUnauthorized());
    }
}
