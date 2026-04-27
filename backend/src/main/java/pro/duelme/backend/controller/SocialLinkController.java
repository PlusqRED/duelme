package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.dto.InstagramLinkRequest;
import pro.duelme.backend.dto.OAuthInitiateResponse;
import pro.duelme.backend.dto.ProfileResponse;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialAccountAlreadyLinkedException;
import pro.duelme.backend.exception.SocialVerificationFailedException;
import pro.duelme.backend.service.SocialLinkService;

import java.net.URI;
import java.util.Map;

@Tag(name = "Social Links", description = "Link external social accounts to a profile")
@RestController
@RequestMapping("/api/v1/profiles/me/social")
public class SocialLinkController {

    private static final Logger log = LoggerFactory.getLogger(SocialLinkController.class);

    private final SocialLinkService service;
    private final SocialLinkProperties props;

    public SocialLinkController(SocialLinkService service, SocialLinkProperties props) {
        this.service = service;
        this.props = props;
    }

    // --- Steam ---------------------------------------------------------

    @Operation(
        summary = "Start Steam link flow",
        description = "Returns the Steam OpenID 2.0 redirect URL the browser should navigate to.",
        security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Redirect URL returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @PostMapping("/steam/initiate")
    public OAuthInitiateResponse initiateSteam(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        return service.initiateSteamLink(walletAddress);
    }

    @Operation(
        summary = "Steam OpenID callback",
        description = "Handled by the browser after Steam authentication. Redirects to /profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "302", description = "Redirect to /profile?steam=ok|error")
    })
    @GetMapping("/steam/callback")
    public ResponseEntity<Void> steamCallback(@RequestParam Map<String, String> params) {
        // Steam signals "user cancelled / declined" by redirecting with
        // openid.mode=cancel. Handle that before hitting the service so
        // we can surface a "cancelled" toast distinct from a real failure.
        if ("cancel".equals(params.get("openid.mode"))) {
            return redirect("steam", "cancelled");
        }
        String status;
        try {
            service.completeSteamLink(params);
            status = "success";
        } catch (SocialAccountAlreadyLinkedException e) {
            status = "alreadyLinked";
        } catch (SocialVerificationFailedException e) {
            status = "verificationFailed";
        } catch (ExternalSocialServiceException e) {
            status = "unavailable";
        } catch (RuntimeException e) {
            log.warn("Unexpected error in Steam callback", e);
            status = "error";
        }
        return redirect("steam", status);
    }

    @Operation(summary = "Unlink Steam", security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Unlinked"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @DeleteMapping("/steam")
    public ResponseEntity<Void> unlinkSteam(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        service.unlinkSteam(walletAddress);
        return ResponseEntity.noContent().build();
    }

    // --- Telegram ------------------------------------------------------

    @Operation(
        summary = "Start Telegram link flow",
        description = "Returns the Telegram OIDC redirect URL (includes PKCE challenge).",
        security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Redirect URL returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @PostMapping("/telegram/initiate")
    public OAuthInitiateResponse initiateTelegram(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        return service.initiateTelegramLink(walletAddress);
    }

    @Operation(
        summary = "Telegram OIDC callback",
        description = "Handled by the browser after Telegram authentication. Redirects to /profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "302", description = "Redirect to /profile?telegram=ok|error")
    })
    @GetMapping("/telegram/callback")
    public ResponseEntity<Void> telegramCallback(
        @RequestParam(value = "code", required = false) String code,
        @RequestParam(value = "state", required = false) String state,
        @RequestParam(value = "error", required = false) String error
    ) {
        // OAuth 2.0 §4.1.2.1: the authorization endpoint returns ?error=...
        // when the request failed or was denied. access_denied specifically
        // means the user cancelled the consent screen.
        if (error != null) {
            return redirect("telegram",
                "access_denied".equals(error) ? "cancelled" : "verificationFailed");
        }
        String status;
        try {
            service.completeTelegramLink(code, state);
            status = "success";
        } catch (SocialAccountAlreadyLinkedException e) {
            status = "alreadyLinked";
        } catch (SocialVerificationFailedException e) {
            status = "verificationFailed";
        } catch (ExternalSocialServiceException e) {
            status = "unavailable";
        } catch (RuntimeException e) {
            log.warn("Unexpected error in Telegram callback", e);
            status = "error";
        }
        return redirect("telegram", status);
    }

    @Operation(summary = "Unlink Telegram", security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Unlinked"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @DeleteMapping("/telegram")
    public ResponseEntity<Void> unlinkTelegram(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        service.unlinkTelegram(walletAddress);
        return ResponseEntity.noContent().build();
    }

    // --- Instagram (self-reported) -------------------------------------

    @Operation(
        summary = "Set self-reported Instagram handle",
        security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Instagram handle saved"),
        @ApiResponse(responseCode = "400", description = "Invalid handle format"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @PutMapping("/instagram")
    public ProfileResponse linkInstagram(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress,
        @Valid @RequestBody InstagramLinkRequest request
    ) {
        return service.linkInstagram(walletAddress, request.handle());
    }

    @Operation(summary = "Unlink Instagram", security = @SecurityRequirement(name = "bearer"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Unlinked"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    })
    @DeleteMapping("/instagram")
    public ResponseEntity<Void> unlinkInstagram(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        service.unlinkInstagram(walletAddress);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<Void> redirect(String platform, String status) {
        URI target = UriComponentsBuilder.fromUriString(props.appBaseUrl())
            .replacePath("/profile")
            .replaceQuery(null)
            .queryParam(platform, status)
            .build()
            .toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(target).build();
    }
}
