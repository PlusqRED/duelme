package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.dto.ProfileRequest;
import pro.duelme.backend.dto.ProfileResponse;
import pro.duelme.backend.exception.ProfileNotFoundException;
import pro.duelme.backend.repository.ProfileRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ProfileServiceTest {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private ProfileRepository profileRepository;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();
    }

    @Test
    void upsertCreatesNewProfile() {
        var request = new ProfileRequest("testuser", "active", "About me", List.of("chess"));

        ProfileResponse response = profileService.upsert("0xABC123", request);

        assertThat(response.walletAddress()).isEqualTo("0xabc123");
        assertThat(response.nickname()).isEqualTo("testuser");
        assertThat(response.games()).containsExactly("chess");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void upsertUpdatesExistingProfile() {
        profileService.upsert("0xABC123", new ProfileRequest("user1", null, null, null));

        var update = new ProfileRequest("user1-updated", "new status", null, null);
        ProfileResponse response = profileService.upsert("0xABC123", update);

        assertThat(response.nickname()).isEqualTo("user1-updated");
        assertThat(response.status()).isEqualTo("new status");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void getByWalletAddressThrowsWhenNotFound() {
        assertThatThrownBy(() -> profileService.getByWalletAddress("0xnonexistent"))
            .isInstanceOf(ProfileNotFoundException.class);
    }

    @Test
    void getByWalletAddressesReturnsBatch() {
        profileService.upsert("0xAAA", new ProfileRequest("user-a", null, null, null));
        profileService.upsert("0xBBB", new ProfileRequest("user-b", null, null, null));

        List<ProfileResponse> results = profileService.getByWalletAddresses(List.of("0xaaa", "0xbbb", "0xccc"));

        assertThat(results).hasSize(2);
    }

    @Test
    void deleteRemovesProfile() {
        profileService.upsert("0xDEL", new ProfileRequest("to-delete", null, null, null));

        profileService.delete("0xDEL");

        assertThatThrownBy(() -> profileService.getByWalletAddress("0xDEL"))
            .isInstanceOf(ProfileNotFoundException.class);
    }
}
