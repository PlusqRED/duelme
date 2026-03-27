package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.ProfileRequest;
import pro.duelme.backend.dto.ProfileResponse;
import pro.duelme.backend.service.ProfileService;

import java.util.Arrays;
import java.util.List;

@Tag(name = "Profiles", description = "Player profile management")
@RestController
@RequestMapping("/api/v1/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @Operation(summary = "Get own profile", security = @SecurityRequirement(name = "bearer"))
    @GetMapping("/me")
    public ProfileResponse getMyProfile(@Parameter(hidden = true) @AuthenticationPrincipal String walletAddress) {
        return profileService.getByWalletAddress(walletAddress);
    }

    @Operation(summary = "Create or update own profile", security = @SecurityRequirement(name = "bearer"))
    @PutMapping("/me")
    public ProfileResponse upsertMyProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress,
            @Valid @RequestBody ProfileRequest request) {
        return profileService.upsert(walletAddress, request);
    }

    @Operation(summary = "Delete own profile", security = @SecurityRequirement(name = "bearer"))
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyProfile(@Parameter(hidden = true) @AuthenticationPrincipal String walletAddress) {
        profileService.delete(walletAddress);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get profile by wallet address")
    @GetMapping("/{walletAddress}")
    public ProfileResponse getProfile(@PathVariable String walletAddress) {
        return profileService.getByWalletAddress(walletAddress);
    }

    @Operation(summary = "Batch lookup profiles by addresses (max 50)")
    @GetMapping
    public List<ProfileResponse> getProfiles(@RequestParam String addresses) {
        List<String> addressList = Arrays.stream(addresses.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .limit(50)
            .toList();
        return profileService.getByWalletAddresses(addressList);
    }
}
