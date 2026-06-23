package pro.duelme.backend.service;

import org.springframework.stereotype.Service;
import pro.duelme.backend.dto.ProfileRequest;
import pro.duelme.backend.dto.ProfileResponse;
import pro.duelme.backend.exception.ProfileNotFoundException;
import pro.duelme.backend.model.Profile;
import pro.duelme.backend.repository.ProfileRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ProfileService {

    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
    }

    public ProfileResponse getByWalletAddress(String walletAddress) {
        return findByWalletAddress(walletAddress)
            .orElseThrow(() -> new ProfileNotFoundException(walletAddress));
    }

    /**
     * Returns the profile for the address if one exists, or empty otherwise.
     * Used by the "/me" endpoint so a profile-less (but authenticated) user is
     * a normal 204, not a 404 error — keeps the browser console clean.
     */
    public Optional<ProfileResponse> findByWalletAddress(String walletAddress) {
        return repository.findByWalletAddress(walletAddress.toLowerCase())
            .map(ProfileResponse::from);
    }

    public List<ProfileResponse> getByWalletAddresses(List<String> addresses) {
        List<String> normalized = addresses.stream()
            .map(String::toLowerCase)
            .distinct()
            .toList();
        return repository.findByWalletAddressIn(normalized).stream()
            .map(ProfileResponse::from)
            .toList();
    }

    public ProfileResponse upsert(String walletAddress, ProfileRequest request) {
        String normalized = walletAddress.toLowerCase();
        Profile existing = repository.findByWalletAddress(normalized).orElse(null);

        Profile profile;
        if (existing != null) {
            profile = new Profile(
                existing.id(),
                normalized,
                request.nickname(),
                request.status(),
                request.aboutMe(),
                request.games(),
                existing.socialLinks(),
                existing.createdAt(),
                null
            );
        } else {
            profile = new Profile(
                null,
                normalized,
                request.nickname(),
                request.status(),
                request.aboutMe(),
                request.games(),
                null,
                null,
                null
            );
        }

        Profile saved = repository.save(profile);
        return ProfileResponse.from(saved);
    }

    public void delete(String walletAddress) {
        repository.deleteByWalletAddress(walletAddress.toLowerCase());
    }
}
