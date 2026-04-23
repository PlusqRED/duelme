package pro.duelme.backend.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.OAuthInitiateResponse;
import pro.duelme.backend.dto.ProfileResponse;
import pro.duelme.backend.exception.SocialAccountAlreadyLinkedException;
import pro.duelme.backend.exception.SocialVerificationFailedException;
import pro.duelme.backend.model.InstagramLink;
import pro.duelme.backend.model.Profile;
import pro.duelme.backend.model.SocialLinks;
import pro.duelme.backend.model.SteamLink;
import pro.duelme.backend.model.TelegramLink;
import pro.duelme.backend.repository.ProfileRepository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.function.UnaryOperator;

import static pro.duelme.backend.service.SocialLinkStateService.PLATFORM_STEAM;
import static pro.duelme.backend.service.SocialLinkStateService.PLATFORM_TELEGRAM;

/**
 * Orchestrates Steam / Telegram / Instagram account linking. Verifies
 * each platform's proof, enforces uniqueness, and persists the result
 * onto the player's {@link Profile}.
 *
 * <p>Steam and Telegram link operations always complete via a stateless
 * browser redirect: the wallet address is recovered from a signed state
 * token, not from a Bearer header. Instagram is authenticated directly
 * since it's self-reported and the handle carries no proof of ownership.
 */
@Service
public class SocialLinkService {

    private final ProfileRepository repository;
    private final SocialLinkStateService stateService;
    private final SteamOpenIdService steamService;
    private final SteamProfileFetcher steamProfileFetcher;
    private final TelegramOidcService telegramService;

    public SocialLinkService(
        ProfileRepository repository,
        SocialLinkStateService stateService,
        SteamOpenIdService steamService,
        SteamProfileFetcher steamProfileFetcher,
        TelegramOidcService telegramService
    ) {
        this.repository = repository;
        this.stateService = stateService;
        this.steamService = steamService;
        this.steamProfileFetcher = steamProfileFetcher;
        this.telegramService = telegramService;
    }

    // --- Steam -------------------------------------------------------

    public OAuthInitiateResponse initiateSteamLink(String wallet) {
        String state = stateService.sign(wallet.toLowerCase(), PLATFORM_STEAM, null);
        return new OAuthInitiateResponse(steamService.buildAuthUrl(state));
    }

    public void completeSteamLink(Map<String, String> openIdParams) {
        String state = openIdParams.get("state");
        SocialLinkStateService.StatePayload payload = stateService.verify(state);
        if (!PLATFORM_STEAM.equals(payload.platform())) {
            throw new SocialVerificationFailedException("Platform mismatch");
        }

        String steamId = steamService.verifyCallback(openIdParams);
        assertNotLinkedToOtherWallet(
            repository.findBySocialLinksSteamSteamId(steamId), payload.wallet(), "Steam");

        Optional<SteamProfileFetcher.SteamPlayerSummary> summary = steamProfileFetcher.fetch(steamId);
        SteamLink link = new SteamLink(
            steamId,
            summary.map(SteamProfileFetcher.SteamPlayerSummary::username).orElse(null),
            summary.map(SteamProfileFetcher.SteamPlayerSummary::avatarUrl).orElse(null),
            Instant.now()
        );
        updateProfile(payload.wallet(), links -> withSteam(links, link));
    }

    public void unlinkSteam(String wallet) {
        updateExistingProfile(wallet, links -> withSteam(links, null));
    }

    // --- Telegram ----------------------------------------------------

    public OAuthInitiateResponse initiateTelegramLink(String wallet) {
        String codeVerifier = telegramService.generateCodeVerifier();
        String state = stateService.sign(wallet.toLowerCase(), PLATFORM_TELEGRAM, codeVerifier);
        String url = telegramService.buildAuthUrl(state, codeVerifier);
        return new OAuthInitiateResponse(url);
    }

    public void completeTelegramLink(String code, String state) {
        SocialLinkStateService.StatePayload payload = stateService.verify(state);
        if (!PLATFORM_TELEGRAM.equals(payload.platform())) {
            throw new SocialVerificationFailedException("Platform mismatch");
        }
        if (payload.codeVerifier() == null) {
            throw new SocialVerificationFailedException("Missing PKCE verifier");
        }
        if (code == null || code.isBlank()) {
            throw new SocialVerificationFailedException("Missing authorization code");
        }

        TelegramOidcService.TelegramUserInfo user =
            telegramService.exchangeCode(code, payload.codeVerifier());
        assertNotLinkedToOtherWallet(
            repository.findBySocialLinksTelegramTelegramId(user.telegramId()),
            payload.wallet(), "Telegram");

        TelegramLink link = new TelegramLink(
            user.telegramId(),
            user.username(),
            user.displayName(),
            user.photoUrl(),
            Instant.now()
        );
        updateProfile(payload.wallet(), links -> withTelegram(links, link));
    }

    public void unlinkTelegram(String wallet) {
        updateExistingProfile(wallet, links -> withTelegram(links, null));
    }

    // --- Instagram (self-reported) -----------------------------------

    public ProfileResponse linkInstagram(String wallet, String rawHandle) {
        String normalised;
        try {
            normalised = InstagramHandleValidator.normalise(rawHandle);
        } catch (IllegalArgumentException e) {
            throw new SocialVerificationFailedException(e.getMessage());
        }
        InstagramLink link = new InstagramLink(normalised, Instant.now());
        Profile updated = updateProfile(wallet, links -> withInstagram(links, link));
        return ProfileResponse.from(updated);
    }

    public void unlinkInstagram(String wallet) {
        updateExistingProfile(wallet, links -> withInstagram(links, null));
    }

    // --- Shared helpers ----------------------------------------------

    private static final SocialLinks EMPTY_LINKS = new SocialLinks(null, null, null);

    private Profile updateProfile(String wallet, UnaryOperator<SocialLinks> transform) {
        String normalised = wallet.toLowerCase();
        Profile existing = repository.findByWalletAddress(normalised).orElse(null);
        SocialLinks prev = existing != null && existing.socialLinks() != null
            ? existing.socialLinks()
            : EMPTY_LINKS;
        SocialLinks next = transform.apply(prev);

        Profile profile = existing != null
            ? withSocialLinks(existing, next)
            : newProfileWith(normalised, next);
        try {
            return repository.save(profile);
        } catch (DuplicateKeyException e) {
            throw new SocialAccountAlreadyLinkedException(
                "Social account already linked to another user");
        }
    }

    private void updateExistingProfile(String wallet, UnaryOperator<SocialLinks> transform) {
        String normalised = wallet.toLowerCase();
        repository.findByWalletAddress(normalised)
            .ifPresent(existing -> repository.save(
                withSocialLinks(existing, transform.apply(existingLinks(existing)))));
    }

    private static SocialLinks existingLinks(Profile profile) {
        return profile.socialLinks() != null ? profile.socialLinks() : EMPTY_LINKS;
    }

    private static Profile withSocialLinks(Profile existing, SocialLinks next) {
        return new Profile(
            existing.id(),
            existing.walletAddress(),
            existing.nickname(),
            existing.status(),
            existing.firstName(),
            existing.lastName(),
            existing.gender(),
            existing.aboutMe(),
            existing.games(),
            next,
            existing.createdAt(),
            null
        );
    }

    private static Profile newProfileWith(String wallet, SocialLinks links) {
        return new Profile(
            null, wallet,
            null, null, null, null, null, null, null,
            links,
            null, null
        );
    }

    private static SocialLinks withSteam(SocialLinks prev, SteamLink link) {
        return new SocialLinks(link, prev.telegram(), prev.instagram());
    }

    private static SocialLinks withTelegram(SocialLinks prev, TelegramLink link) {
        return new SocialLinks(prev.steam(), link, prev.instagram());
    }

    private static SocialLinks withInstagram(SocialLinks prev, InstagramLink link) {
        return new SocialLinks(prev.steam(), prev.telegram(), link);
    }

    private static void assertNotLinkedToOtherWallet(
        Optional<Profile> owner, String callerWallet, String platform
    ) {
        if (owner.isPresent() && !callerWallet.equals(owner.get().walletAddress())) {
            throw new SocialAccountAlreadyLinkedException(
                platform + " account already linked to another user");
        }
    }
}
