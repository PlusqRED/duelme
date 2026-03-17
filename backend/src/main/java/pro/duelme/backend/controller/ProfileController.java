package pro.duelme.backend.controller;

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

@RestController
@RequestMapping("/api/v1/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileResponse getMyProfile(@AuthenticationPrincipal String walletAddress) {
        return profileService.getByWalletAddress(walletAddress);
    }

    @PutMapping("/me")
    public ProfileResponse upsertMyProfile(
            @AuthenticationPrincipal String walletAddress,
            @Valid @RequestBody ProfileRequest request) {
        return profileService.upsert(walletAddress, request);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyProfile(@AuthenticationPrincipal String walletAddress) {
        profileService.delete(walletAddress);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{walletAddress}")
    public ProfileResponse getProfile(@PathVariable String walletAddress) {
        return profileService.getByWalletAddress(walletAddress);
    }

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
