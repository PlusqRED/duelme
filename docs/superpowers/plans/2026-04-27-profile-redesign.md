# Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the user profile (`/profile` and `/profile/[walletAddress]`) into a fight-identity-first, anonymity-friendly, mobile-first surface with auto-titles, embedded duel history, and a tasteful animation layer — per spec at `docs/superpowers/specs/2026-04-27-profile-redesign-design.md`.

**Architecture:** Backend Profile schema reshape (drop firstName/lastName/gender/status, add battleCry/pronouns/region/lookingForDuel) → frontend types and i18n updates → pure utilities (identicon, auto-titles engine) → reusable UI building blocks → composite Hero and tab components → page rewrites → adjacent public-duels filter → e2e tests + final polish.

**Tech Stack:** Backend: Java 25 + Spring Boot 4, MongoDB, JUnit 5. Frontend: Next.js 16, React 19, wagmi 3, TanStack Query 5, Tailwind 4, framer-motion (NEW), Vitest 4, Playwright 1.58. Smart contract not touched.

## Project conventions (read once, apply throughout)

- **Pre-launch project**: drop & re-init Mongo collection if needed, no migration code, no backwards-compat shims.
- **Git rule**: never run `git add` / `git commit` / `git push` — at every "checkpoint" step, stop, run `git diff --stat`, report changes to the user, and wait for explicit per-action authorization.
- **No file > 300 lines**: split into focused units when approaching the limit.
- **Mobile-first**: every UI task must verify the layout at 360–640px viewport before being considered done.
- **No emojis written into code unless the design calls for them** (the spec explicitly uses ⚔️ 🟢 🏆 🔒 🆕 🆕 ✏️ — these are intentional and stay).
- **i18n discipline**: every user-visible string goes through `useTranslation`. Add EN + RU keys together.
- **Type-strict**: no `any`, no unchecked `as` casts. Validate at system boundaries only.
- **TDD where pure logic**: identicon generator, auto-titles engine, validation helpers — write the failing test first.

---

## Phase A — Backend (Java)

### Task 1: Reshape backend Profile schema (atomic change)

Java compilation is whole-module: changing the `Profile` record breaks every consumer until they're all updated. Treat this as one atomic task.

**Files:**
- Modify: `backend/src/main/java/pro/duelme/backend/model/Profile.java`
- Modify: `backend/src/main/java/pro/duelme/backend/dto/ProfileRequest.java`
- Modify: `backend/src/main/java/pro/duelme/backend/dto/ProfileResponse.java`
- Modify: `backend/src/main/java/pro/duelme/backend/service/ProfileService.java`
- Modify: `backend/src/test/java/pro/duelme/backend/service/ProfileServiceTest.java`
- Modify: `backend/src/test/java/pro/duelme/backend/controller/ProfileControllerTest.java`

- [ ] **Step 1.1: Replace `Profile.java` record body**

```java
package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document("profiles")
public record Profile(
    @Id String id,
    @Indexed(unique = true) String walletAddress,
    String nickname,
    String battleCry,
    String aboutMe,
    String pronouns,
    String region,
    Boolean lookingForDuel,
    List<String> games,
    SocialLinks socialLinks,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {}
```

- [ ] **Step 1.2: Replace `ProfileRequest.java`**

```java
package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProfileRequest(
    @Size(max = 30) String nickname,
    @Size(max = 100) String battleCry,
    @Size(max = 500) String aboutMe,
    @Size(max = 16) String pronouns,
    @Size(max = 30) String region,
    Boolean lookingForDuel,
    @Size(max = 20) List<@NotBlank @Size(max = 30) String> games
) {}
```

- [ ] **Step 1.3: Replace `ProfileResponse.java`**

```java
package pro.duelme.backend.dto;

import pro.duelme.backend.model.Profile;

import java.time.Instant;
import java.util.List;

public record ProfileResponse(
    String walletAddress,
    String nickname,
    String battleCry,
    String aboutMe,
    String pronouns,
    String region,
    Boolean lookingForDuel,
    List<String> games,
    SocialLinksResponse socialLinks,
    Instant createdAt,
    Instant updatedAt
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.walletAddress(),
            profile.nickname(),
            profile.battleCry(),
            profile.aboutMe(),
            profile.pronouns(),
            profile.region(),
            profile.lookingForDuel() != null && profile.lookingForDuel(),
            profile.games(),
            SocialLinksResponse.from(profile.socialLinks()),
            profile.createdAt(),
            profile.updatedAt()
        );
    }
}
```

- [ ] **Step 1.4: Update `ProfileService.upsert(...)` constructor calls to match new record positional order**

In `ProfileService.java`, replace both `new Profile(...)` blocks inside `upsert(...)`:

```java
public ProfileResponse upsert(String walletAddress, ProfileRequest request) {
    String normalized = walletAddress.toLowerCase();
    Profile existing = repository.findByWalletAddress(normalized).orElse(null);

    Profile profile;
    if (existing != null) {
        profile = new Profile(
            existing.id(),
            normalized,
            request.nickname(),
            request.battleCry(),
            request.aboutMe(),
            request.pronouns(),
            request.region(),
            request.lookingForDuel(),
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
            request.battleCry(),
            request.aboutMe(),
            request.pronouns(),
            request.region(),
            request.lookingForDuel(),
            request.games(),
            null,
            null,
            null
        );
    }

    Profile saved = repository.save(profile);
    return ProfileResponse.from(saved);
}
```

- [ ] **Step 1.5: Rewrite `ProfileServiceTest.java`**

Replace the file contents:

```java
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
        var request = new ProfileRequest(
            "testuser",
            "git gud or die trying",
            "About me",
            "she/her",
            "EU evenings",
            true,
            List.of("chess")
        );

        ProfileResponse response = profileService.upsert("0xABC123", request);

        assertThat(response.walletAddress()).isEqualTo("0xabc123");
        assertThat(response.nickname()).isEqualTo("testuser");
        assertThat(response.battleCry()).isEqualTo("git gud or die trying");
        assertThat(response.pronouns()).isEqualTo("she/her");
        assertThat(response.region()).isEqualTo("EU evenings");
        assertThat(response.lookingForDuel()).isTrue();
        assertThat(response.games()).containsExactly("chess");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void upsertUpdatesExistingProfile() {
        profileService.upsert("0xABC123",
            new ProfileRequest("user1", null, null, null, null, null, null));

        var update = new ProfileRequest(
            "user1-updated", "new cry", null, null, null, false, null);
        ProfileResponse response = profileService.upsert("0xABC123", update);

        assertThat(response.nickname()).isEqualTo("user1-updated");
        assertThat(response.battleCry()).isEqualTo("new cry");
        assertThat(response.lookingForDuel()).isFalse();
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void lookingForDuelDefaultsToFalseWhenNull() {
        profileService.upsert("0xCAFE",
            new ProfileRequest("u", null, null, null, null, null, null));

        ProfileResponse response = profileService.getByWalletAddress("0xCAFE");

        assertThat(response.lookingForDuel()).isFalse();
    }

    @Test
    void getByWalletAddressThrowsWhenNotFound() {
        assertThatThrownBy(() -> profileService.getByWalletAddress("0xnonexistent"))
            .isInstanceOf(ProfileNotFoundException.class);
    }

    @Test
    void getByWalletAddressesReturnsBatch() {
        profileService.upsert("0xAAA",
            new ProfileRequest("user-a", null, null, null, null, null, null));
        profileService.upsert("0xBBB",
            new ProfileRequest("user-b", null, null, null, null, null, null));

        List<ProfileResponse> results =
            profileService.getByWalletAddresses(List.of("0xaaa", "0xbbb", "0xccc"));

        assertThat(results).hasSize(2);
    }

    @Test
    void deleteRemovesProfile() {
        profileService.upsert("0xDEL",
            new ProfileRequest("to-delete", null, null, null, null, null, null));

        profileService.delete("0xDEL");

        assertThatThrownBy(() -> profileService.getByWalletAddress("0xDEL"))
            .isInstanceOf(ProfileNotFoundException.class);
    }
}
```

- [ ] **Step 1.6: Update `ProfileControllerTest.java` — drop old-field tests, add new-field tests**

Replace the file contents:

```java
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
                    {
                      "nickname": "gamer1",
                      "battleCry": "git gud",
                      "pronouns": "they/them",
                      "region": "EU evenings",
                      "lookingForDuel": true
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nickname").value("gamer1"))
            .andExpect(jsonPath("$.battleCry").value("git gud"))
            .andExpect(jsonPath("$.pronouns").value("they/them"))
            .andExpect(jsonPath("$.region").value("EU evenings"))
            .andExpect(jsonPath("$.lookingForDuel").value(true))
            .andExpect(jsonPath("$.walletAddress").value("0xtest123"));

        mockMvc.perform(get("/api/v1/profiles/0xtest123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nickname").value("gamer1"))
            .andExpect(jsonPath("$.lookingForDuel").value(true));
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
            .andExpect(jsonPath("$.nickname").value("myself"))
            .andExpect(jsonPath("$.lookingForDuel").value(false));
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

    @Test
    void validationRejectsTooLongBattleCry() throws Exception {
        var auth = new WalletAuthenticationToken("0xvalid");
        String tooLong = "x".repeat(101);

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"battleCry\": \"" + tooLong + "\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void validationRejectsTooLongPronouns() throws Exception {
        var auth = new WalletAuthenticationToken("0xvalid");
        String tooLong = "p".repeat(17);

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pronouns\": \"" + tooLong + "\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void validationRejectsTooLongRegion() throws Exception {
        var auth = new WalletAuthenticationToken("0xvalid");
        String tooLong = "r".repeat(31);

        mockMvc.perform(put("/api/v1/profiles/me")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"region\": \"" + tooLong + "\"}"))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 1.7: Build and run backend tests**

Run: `cd backend && ./gradlew build`
Expected: BUILD SUCCESSFUL, all tests green.

If `ProfileControllerTest`'s OpenAPI/swagger annotation tests reference the removed fields, fix them inline.

- [ ] **Step 1.8: Stop and report diff**

Run: `git diff --stat backend/`
Report the touched files to the user. Do NOT run `git add` or `git commit`. Wait for explicit user authorization to commit.

---

## Phase B — Frontend types and i18n

### Task 2: Update `lib/profile.ts`

**Files:**
- Modify: `frontend/src/lib/profile.ts`
- Modify: `frontend/src/lib/__tests__/profile.test.ts` (existing — do not break Instagram-handle tests)

- [ ] **Step 2.1: Replace the Profile/ProfileRequest/PROFILE_LIMITS section**

Edit `frontend/src/lib/profile.ts`:

Keep the social link interfaces (`SteamLink`, `TelegramLink`, `InstagramLink`, `SocialLinks`, `SocialPlatform`) and the Instagram-handle helpers unchanged.

Replace `Profile`, `ProfileRequest`, and `PROFILE_LIMITS`:

```typescript
export interface Profile {
  walletAddress: string;
  nickname: string | null;
  battleCry: string | null;
  aboutMe: string | null;
  pronouns: string | null;
  region: string | null;
  lookingForDuel: boolean;
  games: string[] | null;
  socialLinks: SocialLinks | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileRequest {
  nickname?: string | null;
  battleCry?: string | null;
  aboutMe?: string | null;
  pronouns?: string | null;
  region?: string | null;
  lookingForDuel?: boolean | null;
  games?: string[] | null;
}

export const PROFILE_LIMITS = {
  nickname: 30,
  battleCry: 100,
  aboutMe: 500,
  pronouns: 16,
  region: 30,
  gameTag: 30,
  gamesMax: 20,
  instagramHandle: 30,
} as const;
```

- [ ] **Step 2.2: Run typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: numerous errors in `app/profile/page.tsx`, `app/profile/[walletAddress]/page.tsx`, `useMyProfile.ts`, etc., referencing deleted fields. These will be fixed in later tasks. Confirm errors are only in profile-related files (no surprise breakage elsewhere).

- [ ] **Step 2.3: Add `PROFILE_LIMITS` regression test**

Edit `frontend/src/lib/__tests__/profile.test.ts`. At the end of the file, append:

```typescript
import { PROFILE_LIMITS } from '../profile';

describe('PROFILE_LIMITS', () => {
  it('exposes expected text limits', () => {
    expect(PROFILE_LIMITS.nickname).toBe(30);
    expect(PROFILE_LIMITS.battleCry).toBe(100);
    expect(PROFILE_LIMITS.aboutMe).toBe(500);
    expect(PROFILE_LIMITS.pronouns).toBe(16);
    expect(PROFILE_LIMITS.region).toBe(30);
    expect(PROFILE_LIMITS.gameTag).toBe(30);
    expect(PROFILE_LIMITS.gamesMax).toBe(20);
  });
});
```

- [ ] **Step 2.4: Run unit tests for profile.ts**

Run: `cd frontend && npm run test -- src/lib/__tests__/profile.test.ts`
Expected: All tests pass.

- [ ] **Step 2.5: Stop and report diff**

Run: `git diff --stat frontend/src/lib/`. Report. Do NOT commit.

---

### Task 3: Replace profile-related i18n keys

**Files:**
- Modify: `frontend/src/i18n/translations/profileGames.ts`

- [ ] **Step 3.1: Replace `profile.*` keys block (delete removed keys, add new keys, leave `rep.*` and `games.*` blocks untouched)**

Open `frontend/src/i18n/translations/profileGames.ts`. Replace the block of EN keys from `'profile.title'` through `'toast.profileSaveFailed'` (inclusive) with the new set:

EN block (replace existing):

```typescript
'profile.title': 'My Profile',
'profile.publicTitle': '{nickname}\'s Profile',
'profile.publicTitleFallback': 'Player Profile',
'profile.editYours': '✏️ Edit profile',
'profile.editProfile': '✏️ Edit profile',
'profile.nickname': 'Nickname',
'profile.nicknamePlaceholder': 'Choose a nickname',
'profile.battleCry': 'Battle cry',
'profile.battleCryPlaceholder': 'Add a battle cry...',
'profile.aboutMe': 'About',
'profile.aboutMePlaceholder': 'Tell the world who you are (or don\'t, that\'s cool too)',
'profile.pronouns': 'Pronouns',
'profile.pronounsPlaceholder': 'she/her · he/him · they/them...',
'profile.region': 'Region',
'profile.regionPlaceholder': 'EU evenings · PST nights...',
'profile.tookUpArms': 'Took up arms',
'profile.openForDuels': 'Open for duels',
'profile.openForDuelsHint': 'Other duelists will see you\'re up for a fight.',
'profile.freshMeat': '🆕 Fresh meat — no duels yet',
'profile.games': 'Games',
'profile.gamesPlaceholder': 'e.g. CS2, Valorant, Dota 2',
'profile.addGame': 'Add game',
'profile.save': 'Save',
'profile.cancel': 'Cancel',
'profile.saving': 'Saving...',
'profile.signInToEdit': 'Sign in to set up your profile.',
'profile.charCount': '{count}/{max}',
'profile.tabs.battles': 'Battles',
'profile.tabs.about': 'About',
'profile.tabs.reachOut': 'Reach out',
'profile.tabs.trophies': 'Trophies',
'profile.empty.battles': 'No duels yet — fresh meat 🆕',
'profile.empty.about': 'Identity classified. Some duelists prefer it that way.',
'profile.empty.reachOut': 'No connected accounts. Anonymity respected.',
'profile.empty.trophies': 'No trophies yet. The arena awaits.',
'profile.stats.recordLabel': 'W-L',
'profile.stats.volumeLabel': 'Volume',
'profile.stats.repLabel': 'Rep',
'profile.cta.challenge': '⚔️ Challenge to a duel',
'profile.cta.share': 'Share',
'profile.cta.viewAllBattles': 'View all battles →',
'profile.trophies.earned': 'EARNED',
'profile.trophies.notYet': 'NOT YET',
'profile.trophies.cowardlyHint': '(probably for the best, eh?)',
'profile.trophies.progress': '{current} / {target}',
'toast.profileSaved': 'Profile saved!',
'toast.profileSaveFailed': 'Failed to save profile.',
'toast.profileLinkCopied': 'Profile link copied!',
// trophy.*
'trophy.firstBlood.label': 'First Blood',
'trophy.firstBlood.desc': 'Won your first duel. Auspicious start.',
'trophy.firstBlood.hint': 'Win your first duel.',
'trophy.cardinalSin.label': 'Cardinal Sin',
'trophy.cardinalSin.desc': 'Lost your first duel. We\'ve all been there.',
'trophy.cardinalSin.hint': '',
'trophy.rookie.label': 'Rookie',
'trophy.rookie.desc': 'Less than 5 duels. Just getting started.',
'trophy.rookie.hint': '',
'trophy.veteran.label': 'Veteran',
'trophy.veteran.desc': 'Over 50 duels. The arena knows your name.',
'trophy.veteran.hint': 'Play 50+ duels.',
'trophy.legend.label': 'Legend',
'trophy.legend.desc': 'Over 200 duels. Reserved for those who never put down the sword.',
'trophy.legend.hint': 'Play 200+ duels.',
'trophy.ironHand.label': 'Iron Hand',
'trophy.ironHand.desc': '100% claim-rate. Never leaves a USDT behind.',
'trophy.ironHand.hint': 'Claim every win you\'ve earned.',
'trophy.theBrave.label': 'The Brave',
'trophy.theBrave.desc': 'Accepts more than 80% of incoming challenges.',
'trophy.theBrave.hint': 'Accept 80%+ of incoming duels (5+ invites).',
'trophy.stageFright.label': 'Stage Fright',
'trophy.stageFright.desc': 'Declined 5+ incoming duels. Not every fight is your fight.',
'trophy.stageFright.hint': '',
'trophy.theCoward.label': 'The Coward',
'trophy.theCoward.desc': 'Abandoned 5+ duels by timeout. Maybe try chess?',
'trophy.theCoward.hint': '',
'trophy.friendlyFire.label': 'Friendly Fire',
'trophy.friendlyFire.desc': 'Half your duels are with the same opponent. Brothers in arms.',
'trophy.friendlyFire.hint': 'Duel the same friend over and over.',
'trophy.theWhale.label': 'The Whale',
'trophy.theWhale.desc': 'Total volume over 1000 USDT. Respect.',
'trophy.theWhale.hint': 'Wager 1000+ USDT total.',
'trophy.thePenny.label': 'The Penny',
'trophy.thePenny.desc': 'Average wager under 1 USDT. Humble bettor.',
'trophy.thePenny.hint': 'Keep average wagers under 1 USDT (5+ duels).',
'trophy.hotStreak.label': 'Hot Streak',
'trophy.hotStreak.desc': '5+ wins in a row. On fire.',
'trophy.hotStreak.hint': 'Win 5 duels in a row.',
'trophy.coldStreak.label': 'Cold Streak',
'trophy.coldStreak.desc': '5+ losses in a row. It\'s just variance, surely.',
'trophy.coldStreak.hint': '',
'trophy.theMysterious.label': 'The Mysterious',
'trophy.theMysterious.desc': 'No nickname, no bio, no socials. Respect the silence.',
'trophy.theMysterious.hint': 'Leave nickname, bio, and socials all empty.',
'trophy.theInfluencer.label': 'The Influencer',
'trophy.theInfluencer.desc': 'All three social accounts connected. Out and about.',
'trophy.theInfluencer.hint': 'Connect Steam, Telegram, and Instagram.',
```

RU block (replace existing):

```typescript
'profile.title': 'Мой профиль',
'profile.publicTitle': 'Профиль {nickname}',
'profile.publicTitleFallback': 'Профиль игрока',
'profile.editYours': '✏️ Редактировать профиль',
'profile.editProfile': '✏️ Редактировать профиль',
'profile.nickname': 'Никнейм',
'profile.nicknamePlaceholder': 'Выбери никнейм',
'profile.battleCry': 'Боевой клич',
'profile.battleCryPlaceholder': 'Добавь боевой клич...',
'profile.aboutMe': 'О себе',
'profile.aboutMePlaceholder': 'Расскажи миру, кто ты (или нет, это тоже норм)',
'profile.pronouns': 'Местоимения',
'profile.pronounsPlaceholder': 'она/её · он/его · они/их...',
'profile.region': 'Регион',
'profile.regionPlaceholder': 'EU вечером · MSK ночью...',
'profile.tookUpArms': 'Вышел на арену',
'profile.openForDuels': 'Открыт к дуэлям',
'profile.openForDuelsHint': 'Другие увидят, что ты готов биться.',
'profile.freshMeat': '🆕 Свежее мясо — дуэлей ещё не было',
'profile.games': 'Игры',
'profile.gamesPlaceholder': 'напр. CS2, Valorant, Dota 2',
'profile.addGame': 'Добавить игру',
'profile.save': 'Сохранить',
'profile.cancel': 'Отмена',
'profile.saving': 'Сохраняем...',
'profile.signInToEdit': 'Войди, чтобы настроить профиль.',
'profile.charCount': '{count}/{max}',
'profile.tabs.battles': 'Бои',
'profile.tabs.about': 'О себе',
'profile.tabs.reachOut': 'Связаться',
'profile.tabs.trophies': 'Трофеи',
'profile.empty.battles': 'Дуэлей пока нет — свежее мясо 🆕',
'profile.empty.about': 'Личность засекречена. Некоторые дуэлянты предпочитают так.',
'profile.empty.reachOut': 'Нет привязанных аккаунтов. Анонимность уважается.',
'profile.empty.trophies': 'Трофеев пока нет. Арена ждёт.',
'profile.stats.recordLabel': 'П-П',
'profile.stats.volumeLabel': 'Объём',
'profile.stats.repLabel': 'Реп',
'profile.cta.challenge': '⚔️ Вызвать на дуэль',
'profile.cta.share': 'Поделиться',
'profile.cta.viewAllBattles': 'Все бои →',
'profile.trophies.earned': 'ПОЛУЧЕНО',
'profile.trophies.notYet': 'ПОКА НЕТ',
'profile.trophies.cowardlyHint': '(оно и к лучшему, согласен?)',
'profile.trophies.progress': '{current} / {target}',
'toast.profileSaved': 'Профиль сохранён!',
'toast.profileSaveFailed': 'Не удалось сохранить профиль.',
'toast.profileLinkCopied': 'Ссылка на профиль скопирована!',
// trophy.*
'trophy.firstBlood.label': 'Первая кровь',
'trophy.firstBlood.desc': 'Выиграл первую дуэль. Благоприятное начало.',
'trophy.firstBlood.hint': 'Выиграй первую дуэль.',
'trophy.cardinalSin.label': 'Смертный грех',
'trophy.cardinalSin.desc': 'Слил первую дуэль. Все мы с этого начинали.',
'trophy.cardinalSin.hint': '',
'trophy.rookie.label': 'Новобранец',
'trophy.rookie.desc': 'Меньше 5 дуэлей. Только начинаешь.',
'trophy.rookie.hint': '',
'trophy.veteran.label': 'Ветеран',
'trophy.veteran.desc': 'Больше 50 дуэлей. Арена знает твоё имя.',
'trophy.veteran.hint': 'Сыграй 50+ дуэлей.',
'trophy.legend.label': 'Легенда',
'trophy.legend.desc': 'Больше 200 дуэлей. Только для тех, кто не выпускает меча.',
'trophy.legend.hint': 'Сыграй 200+ дуэлей.',
'trophy.ironHand.label': 'Железная рука',
'trophy.ironHand.desc': '100% claim-rate. Не оставляешь USDT в контракте.',
'trophy.ironHand.hint': 'Забирай каждый честно выигранный USDT.',
'trophy.theBrave.label': 'Храбрец',
'trophy.theBrave.desc': 'Принимает больше 80% входящих вызовов.',
'trophy.theBrave.hint': 'Принимай 80%+ входящих дуэлей (минимум 5).',
'trophy.stageFright.label': 'Сценический страх',
'trophy.stageFright.desc': 'Отказался от 5+ боёв. Не каждый бой — твой бой.',
'trophy.stageFright.hint': '',
'trophy.theCoward.label': 'Трус',
'trophy.theCoward.desc': 'Бросил 5+ дуэлей по таймауту. Может, лучше шахматы?',
'trophy.theCoward.hint': '',
'trophy.friendlyFire.label': 'Дружеский огонь',
'trophy.friendlyFire.desc': 'Половина дуэлей — с одним оппонентом. Братья по оружию.',
'trophy.friendlyFire.hint': 'Дуэлься с одним и тем же чаще остальных.',
'trophy.theWhale.label': 'Кит',
'trophy.theWhale.desc': 'Прокрутил больше 1000 USDT. Уважение.',
'trophy.theWhale.hint': 'Накрути 1000+ USDT суммарного банка.',
'trophy.thePenny.label': 'Копейка',
'trophy.thePenny.desc': 'Средний банк меньше 1 USDT. Скромно и со вкусом.',
'trophy.thePenny.hint': 'Держи средний банк ниже 1 USDT (минимум 5 дуэлей).',
'trophy.hotStreak.label': 'Горячая серия',
'trophy.hotStreak.desc': '5+ побед подряд. В ударе.',
'trophy.hotStreak.hint': 'Выиграй 5 дуэлей подряд.',
'trophy.coldStreak.label': 'Холодная серия',
'trophy.coldStreak.desc': '5+ поражений подряд. Это просто дисперсия, конечно.',
'trophy.coldStreak.hint': '',
'trophy.theMysterious.label': 'Незнакомец',
'trophy.theMysterious.desc': 'Ни ника, ни био, ни соц-линков. Уважаем тишину.',
'trophy.theMysterious.hint': 'Оставь ник, био и соц-линки пустыми.',
'trophy.theInfluencer.label': 'Инфлюэнсер',
'trophy.theInfluencer.desc': 'Все три соц-аккаунта подключены. Открытая книга.',
'trophy.theInfluencer.hint': 'Привяжи Steam, Telegram и Instagram.',
```

The keys removed from both EN and RU blocks: `profile.noProfileYet`, `profile.status`, `profile.statusPlaceholder`, `profile.firstName`, `profile.lastName`, `profile.gender`, `profile.memberSince`, `profile.lastUpdated`. Make sure they are gone after the edit.

- [ ] **Step 3.2: Run typecheck — confirm broken references are scoped to profile pages**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors in `app/profile/page.tsx` and `app/profile/[walletAddress]/page.tsx` referencing removed translation keys. These get fixed when those pages are rewritten in Phase G.

- [ ] **Step 3.3: Stop and report diff**

Run: `git diff --stat frontend/src/i18n/`. Report. Do NOT commit.

---

## Phase C — Pure utilities and hooks

### Task 4: Identicon generator (TDD)

**Files:**
- Create: `frontend/src/lib/identicon.ts`
- Create: `frontend/src/lib/__tests__/identicon.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `frontend/src/lib/__tests__/identicon.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateIdenticon } from '../identicon';

describe('generateIdenticon', () => {
  it('returns an SVG data URL', () => {
    const out = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(out).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('is deterministic — same input yields same output', () => {
    const a = generateIdenticon('0xabc1234567890123456789012345678901234567');
    const b = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(a).toBe(b);
  });

  it('different inputs yield different output', () => {
    const a = generateIdenticon('0xaaa1234567890123456789012345678901234567');
    const b = generateIdenticon('0xbbb1234567890123456789012345678901234567');
    expect(a).not.toBe(b);
  });

  it('is case-insensitive on the address', () => {
    const lower = generateIdenticon('0xabcdef1234567890123456789012345678901234');
    const upper = generateIdenticon('0xABCDEF1234567890123456789012345678901234');
    expect(lower).toBe(upper);
  });

  it('returns a 5×5 mirrored grid encoded as path commands', () => {
    const out = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(out).toContain('viewBox=\'0 0 5 5\'');
  });
});
```

- [ ] **Step 4.2: Run failing tests**

Run: `cd frontend && npm run test -- src/lib/__tests__/identicon.test.ts`
Expected: All tests fail — module not found.

- [ ] **Step 4.3: Implement the generator**

Create `frontend/src/lib/identicon.ts`:

```typescript
/**
 * Deterministic 5×5 mirrored pixel-art identicon from a wallet address.
 * Inspired by GitHub's identicon: hash → split → mirror horizontally → SVG.
 *
 * Hand-rolled so we avoid the @dicebear runtime dependency.
 */

const PALETTE = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#ef4444', // red-500
  '#f97316', // orange-500
];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function pickColor(hash: number): string {
  return PALETTE[hash % PALETTE.length];
}

export function generateIdenticon(walletAddress: string): string {
  const seed = walletAddress.toLowerCase();
  const baseHash = fnv1a(seed);
  const color = pickColor(baseHash);

  // Build 5×5 grid: 3 left columns derived from hash bits, mirrored to right.
  // Use a second hash with a salt to get more bits than fnv1a gives us alone.
  const bitsHash = fnv1a(seed + ':bits');
  const combined = baseHash ^ (bitsHash * 0x9e3779b1);

  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col; // 15 bits total
      const filled = ((combined >>> bitIndex) & 1) === 1;
      cells.push(filled);
    }
  }

  let path = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (cells[row * 3 + col]) {
        path += `M${col} ${row}h1v1h-1z`;
        if (col < 2) {
          // mirror to right
          const mirroredCol = 4 - col;
          path += `M${mirroredCol} ${row}h1v1h-1z`;
        }
      }
    }
  }

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 5' shape-rendering='crispEdges'>` +
    `<rect width='5' height='5' fill='#f1f5f9'/>` +
    `<path d='${path}' fill='${color}'/>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
```

- [ ] **Step 4.4: Run tests**

Run: `cd frontend && npm run test -- src/lib/__tests__/identicon.test.ts`
Expected: All 5 tests pass.

- [ ] **Step 4.5: Stop and report diff**

Run: `git diff --stat frontend/src/lib/`. Report. Do NOT commit.

---

### Task 5: `useAvatarUrl` hook

**Files:**
- Create: `frontend/src/hooks/useAvatarUrl.ts`

- [ ] **Step 5.1: Implement the hook**

Create `frontend/src/hooks/useAvatarUrl.ts`:

```typescript
'use client';

import { useMemo } from 'react';
import { generateIdenticon } from '@/lib/identicon';
import type { Profile } from '@/lib/profile';

/**
 * Avatar resolution cascade per profile-redesign spec:
 *   Steam avatar → Telegram photo → identicon.
 */
export function useAvatarUrl(walletAddress: string, profile: Profile | null): string {
  return useMemo(() => {
    const steam = profile?.socialLinks?.steam?.avatarUrl;
    if (steam) return steam;

    const telegram = profile?.socialLinks?.telegram?.photoUrl;
    if (telegram) return telegram;

    return generateIdenticon(walletAddress);
  }, [walletAddress, profile?.socialLinks?.steam?.avatarUrl, profile?.socialLinks?.telegram?.photoUrl]);
}
```

- [ ] **Step 5.2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors only in still-unfixed pages (profile pages); no errors related to `useAvatarUrl.ts`.

- [ ] **Step 5.3: Stop and report diff**

---

### Task 6: Auto-titles engine (TDD)

**Files:**
- Create: `frontend/src/lib/profileTitles.ts`
- Create: `frontend/src/lib/__tests__/profileTitles.test.ts`

This is the meatiest pure-logic task. Write tests first per title group; the implementation is one big definitions array.

- [ ] **Step 6.1: Write the failing tests**

Create `frontend/src/lib/__tests__/profileTitles.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeTitles, TITLES } from '../profileTitles';
import type { PlayerDuel, PlayerStats } from '@/hooks/usePlayerDuels';
import { DuelState } from '@/lib/contracts';
import type { Profile } from '@/lib/profile';

const ADDR = '0xaaa1234567890123456789012345678901234567';
const OPP1 = '0xbbb1234567890123456789012345678901234567';
const OPP2 = '0xccc1234567890123456789012345678901234567';

function buildDuel(overrides: Partial<PlayerDuel> = {}): PlayerDuel {
  return {
    id: 0,
    creator: ADDR as `0x${string}`,
    opponent: OPP1 as `0x${string}`,
    inviteHash: '0x0' as `0x${string}`,
    message: '',
    wager: 5,
    wagerAmountRaw: 5_000_000n,
    state: DuelState.Resolved,
    claimedWinner: ADDR as `0x${string}`,
    claimedBy: ADDR as `0x${string}`,
    cancelRequestedBy: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    createdAt: 0n,
    fundedAt: 0n,
    cancelRequestedAt: 0n,
    claimTimestamp: 0n,
    finalizedAt: 0n,
    creatorPayout: 0n,
    opponentPayout: 0n,
    creatorClaimed: true,
    opponentClaimed: false,
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    ...overrides,
  };
}

function emptyStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    totalWagered: 0,
    totalWithdrawn: 0n,
    activeDuels: [],
    historyDuels: [],
  };
}

const baseCtx = {
  address: ADDR,
  duels: [] as PlayerDuel[],
  stats: emptyStats(),
  profile: null as Profile | null,
};

function ctx(over: Partial<typeof baseCtx>) {
  return { ...baseCtx, ...over };
}

describe('TITLES catalog', () => {
  it('contains 16 titles', () => {
    expect(TITLES).toHaveLength(16);
  });

  it('has unique IDs', () => {
    const ids = new Set(TITLES.map((t) => t.id));
    expect(ids.size).toBe(TITLES.length);
  });
});

describe('first_blood', () => {
  it('earned with 1+ wins', () => {
    const result = computeTitles(ctx({ stats: { ...emptyStats(), wins: 1 } }));
    expect(result.earned.find((t) => t.id === 'first_blood')).toBeDefined();
  });

  it('not earned with 0 wins', () => {
    const result = computeTitles(ctx({}));
    expect(result.earned.find((t) => t.id === 'first_blood')).toBeUndefined();
  });
});

describe('cardinal_sin', () => {
  it('earned with 1+ losses', () => {
    const result = computeTitles(ctx({ stats: { ...emptyStats(), losses: 1 } }));
    expect(result.earned.find((t) => t.id === 'cardinal_sin')).toBeDefined();
  });
});

describe('rookie / veteran / legend', () => {
  it('rookie when totalDuels < 5', () => {
    const duels = [buildDuel(), buildDuel()];
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'rookie')).toBeDefined();
  });

  it('veteran when totalDuels ≥ 50', () => {
    const duels = Array.from({ length: 50 }, (_, i) => buildDuel({ id: i }));
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'veteran')).toBeDefined();
    expect(result.earned.find((t) => t.id === 'rookie')).toBeUndefined();
  });

  it('legend when totalDuels ≥ 200', () => {
    const duels = Array.from({ length: 200 }, (_, i) => buildDuel({ id: i }));
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'legend')).toBeDefined();
  });
});

describe('iron_hand', () => {
  it('earned when 100% of wins are claimed and wins ≥ 3', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
    ];
    const stats = { ...emptyStats(), wins: 3 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeDefined();
  });

  it('not earned when one win is unclaimed', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: false }),
    ];
    const stats = { ...emptyStats(), wins: 2 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeUndefined();
  });

  it('not earned with fewer than 3 wins', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
    ];
    const stats = { ...emptyStats(), wins: 1 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeUndefined();
  });
});

describe('stage_fright', () => {
  it('earned with 5+ Declined as opponent', () => {
    const duels = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, creator: OPP1 as `0x${string}`, opponent: ADDR as `0x${string}`, state: DuelState.Declined }),
    );
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'stage_fright')).toBeDefined();
  });
});

describe('the_whale', () => {
  it('earned with totalWagered ≥ 1000', () => {
    const stats = { ...emptyStats(), totalWagered: 1000 };
    const result = computeTitles(ctx({ stats }));
    expect(result.earned.find((t) => t.id === 'the_whale')).toBeDefined();
  });

  it('not earned with totalWagered < 1000', () => {
    const stats = { ...emptyStats(), totalWagered: 999 };
    const result = computeTitles(ctx({ stats }));
    expect(result.earned.find((t) => t.id === 'the_whale')).toBeUndefined();
  });
});

describe('the_penny', () => {
  it('earned with average wager < 1 and ≥ 5 duels', () => {
    const duels = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, wager: 0.5 }),
    );
    const stats = { ...emptyStats(), totalWagered: 2.5 };
    const result = computeTitles(ctx({ duels, stats }));
    expect(result.earned.find((t) => t.id === 'the_penny')).toBeDefined();
  });
});

describe('hot_streak / cold_streak', () => {
  it('hot_streak earned with 5+ consecutive wins (newest first)', () => {
    const wins = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, state: DuelState.Resolved, claimedWinner: ADDR as `0x${string}` }),
    );
    const result = computeTitles(ctx({ duels: wins, stats: { ...emptyStats(), wins: 5 } }));
    expect(result.earned.find((t) => t.id === 'hot_streak')).toBeDefined();
  });

  it('cold_streak earned with 5+ consecutive losses', () => {
    const losses = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, state: DuelState.Resolved, claimedWinner: OPP1 as `0x${string}` }),
    );
    const result = computeTitles(ctx({ duels: losses, stats: { ...emptyStats(), losses: 5 } }));
    expect(result.earned.find((t) => t.id === 'cold_streak')).toBeDefined();
  });
});

describe('friendly_fire', () => {
  it('earned when ≥50% of duels are with same opponent and total ≥ 6', () => {
    const duels = [
      ...Array.from({ length: 4 }, (_, i) => buildDuel({ id: i, opponent: OPP1 as `0x${string}` })),
      ...Array.from({ length: 2 }, (_, i) => buildDuel({ id: 4 + i, opponent: OPP2 as `0x${string}` })),
    ];
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'friendly_fire')).toBeDefined();
  });
});

describe('the_mysterious', () => {
  it('earned with no profile', () => {
    const result = computeTitles(ctx({ profile: null }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeDefined();
  });

  it('earned with empty profile fields and no socials', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: null,
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: { steam: null, telegram: null, instagram: null },
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeDefined();
  });

  it('not earned when nickname set', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: 'someone',
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: null,
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeUndefined();
  });
});

describe('the_influencer', () => {
  it('earned with all 3 socials linked', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: 'a',
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: {
        steam: { steamId: '1', username: null, avatarUrl: null, linkedAt: '' },
        telegram: { telegramId: '1', username: null, displayName: 'a', photoUrl: null, linkedAt: '' },
        instagram: { handle: 'a', linkedAt: '' },
      },
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_influencer')).toBeDefined();
  });
});

describe('top3 selection', () => {
  it('returns up to 3 titles sorted by weight', () => {
    const duels = Array.from({ length: 50 }, (_, i) => buildDuel({ id: i }));
    const stats = { ...emptyStats(), wins: 3, totalWagered: 1500 };
    const result = computeTitles(ctx({
      duels,
      stats,
      profile: {
        walletAddress: ADDR, nickname: 'x', battleCry: null, aboutMe: null,
        pronouns: null, region: null, lookingForDuel: false, games: null,
        socialLinks: null, createdAt: null, updatedAt: null,
      },
    }));
    expect(result.top3.length).toBeLessThanOrEqual(3);
    // veteran (95) is the highest among earned in this fixture
    expect(result.top3[0].id).toBe('veteran');
  });

  it('returns fewer than 3 when not enough earned', () => {
    const result = computeTitles(ctx({}));
    expect(result.top3.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 6.2: Run failing tests**

Run: `cd frontend && npm run test -- src/lib/__tests__/profileTitles.test.ts`
Expected: All tests fail — module not found.

- [ ] **Step 6.3: Implement the engine**

Create `frontend/src/lib/profileTitles.ts`:

```typescript
import { DuelState } from '@/lib/contracts';
import type { PlayerDuel, PlayerStats } from '@/hooks/usePlayerDuels';
import type { Profile } from '@/lib/profile';

export interface TitleContext {
  address: string;
  duels: PlayerDuel[];
  stats: PlayerStats;
  profile: Profile | null;
}

export type TitleCategory = 'milestone' | 'behavior' | 'volume' | 'streak' | 'vanity';

export interface Title {
  id: string;
  weight: number;
  category: TitleCategory;
  isNegative?: boolean;
  earnedBy: (ctx: TitleContext) => boolean;
  /** For unearned positives, optional progress hint as { current, target } */
  progressOf?: (ctx: TitleContext) => { current: number; target: number } | null;
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function isPlayerWinnerOf(d: PlayerDuel, address: string): boolean {
  return d.state === DuelState.Resolved && d.claimedWinner.toLowerCase() === address.toLowerCase();
}

function totalDuels(ctx: TitleContext): number {
  return ctx.duels.length;
}

function isAddressInDuel(d: PlayerDuel, address: string): { isCreator: boolean; isOpponent: boolean } {
  const a = address.toLowerCase();
  return {
    isCreator: d.creator.toLowerCase() === a,
    isOpponent: d.opponent.toLowerCase() === a,
  };
}

function avgWager(ctx: TitleContext): number {
  if (ctx.duels.length === 0) return 0;
  return ctx.stats.totalWagered / ctx.duels.length;
}

/** Walks newest-first, counts consecutive Resolved wins or losses */
function currentStreak(
  ctx: TitleContext,
  type: 'win' | 'loss',
): number {
  let count = 0;
  // duels are sorted newest-first by usePlayerDuels (it reverses arrays).
  // historyDuels carries resolved/cancelled outcomes.
  for (const d of ctx.stats.historyDuels) {
    if (d.state !== DuelState.Resolved) break;
    const won = d.claimedWinner.toLowerCase() === ctx.address.toLowerCase();
    if (type === 'win' && won) count++;
    else if (type === 'loss' && !won) count++;
    else break;
  }
  return count;
}

/** Most common opponent share, returns { count, total } */
function topOpponentShare(ctx: TitleContext): { count: number; total: number } {
  const counts = new Map<string, number>();
  for (const d of ctx.duels) {
    const { isCreator } = isAddressInDuel(d, ctx.address);
    const opp = (isCreator ? d.opponent : d.creator).toLowerCase();
    if (opp === ZERO_ADDR) continue;
    counts.set(opp, (counts.get(opp) ?? 0) + 1);
  }
  let max = 0;
  for (const v of counts.values()) if (v > max) max = v;
  return { count: max, total: ctx.duels.length };
}

function declinedAsOpponent(ctx: TitleContext): number {
  return ctx.duels.filter((d) => {
    const { isOpponent } = isAddressInDuel(d, ctx.address);
    return isOpponent && d.state === DuelState.Declined;
  }).length;
}

function abandonedAsLoser(ctx: TitleContext): number {
  // Heuristic: WinnerClaimed-with-historyDuels-bucket means the dispute window passed
  // and the player is on the losing side (didn't dispute or didn't show).
  return ctx.stats.historyDuels.filter((d) => {
    const won = d.claimedWinner.toLowerCase() === ctx.address.toLowerCase();
    return d.state === DuelState.WinnerClaimed && !won;
  }).length;
}

function acceptRateAsOpponent(ctx: TitleContext): { accepted: number; total: number } {
  let accepted = 0;
  let total = 0;
  for (const d of ctx.duels) {
    const { isOpponent } = isAddressInDuel(d, ctx.address);
    if (!isOpponent) continue;
    total++;
    // Consider any state past "Created" as accepted (Funded, Resolved, etc.).
    if (
      d.state !== DuelState.Created &&
      d.state !== DuelState.Cancelled &&
      d.state !== DuelState.Declined
    ) {
      accepted++;
    }
  }
  return { accepted, total };
}

function isClaimedByPlayer(d: PlayerDuel, address: string): boolean {
  const { isCreator, isOpponent } = isAddressInDuel(d, address);
  if (isCreator) return d.creatorClaimed;
  if (isOpponent) return d.opponentClaimed;
  return false;
}

function ironHandRatio(ctx: TitleContext): { claimed: number; total: number } {
  let total = 0;
  let claimed = 0;
  for (const d of ctx.duels) {
    if (!isPlayerWinnerOf(d, ctx.address)) continue;
    total++;
    if (isClaimedByPlayer(d, ctx.address)) claimed++;
  }
  return { claimed, total };
}

export const TITLES: Title[] = [
  // milestones
  {
    id: 'first_blood',
    weight: 90,
    category: 'milestone',
    earnedBy: (c) => c.stats.wins >= 1,
  },
  {
    id: 'cardinal_sin',
    weight: 50,
    category: 'milestone',
    isNegative: true,
    earnedBy: (c) => c.stats.losses >= 1,
  },
  {
    id: 'rookie',
    weight: 30,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) > 0 && totalDuels(c) < 5,
  },
  {
    id: 'veteran',
    weight: 95,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) >= 50,
    progressOf: (c) => ({ current: totalDuels(c), target: 50 }),
  },
  {
    id: 'legend',
    weight: 100,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) >= 200,
    progressOf: (c) => ({ current: totalDuels(c), target: 200 }),
  },
  // behavior
  {
    id: 'iron_hand',
    weight: 85,
    category: 'behavior',
    earnedBy: (c) => {
      const { claimed, total } = ironHandRatio(c);
      return total >= 3 && claimed === total;
    },
    progressOf: (c) => {
      const { claimed, total } = ironHandRatio(c);
      return { current: claimed, target: Math.max(total, 3) };
    },
  },
  {
    id: 'the_brave',
    weight: 70,
    category: 'behavior',
    earnedBy: (c) => {
      const { accepted, total } = acceptRateAsOpponent(c);
      return total >= 5 && accepted / total >= 0.8;
    },
  },
  {
    id: 'stage_fright',
    weight: 40,
    category: 'behavior',
    isNegative: true,
    earnedBy: (c) => declinedAsOpponent(c) >= 5,
  },
  {
    id: 'the_coward',
    weight: 35,
    category: 'behavior',
    isNegative: true,
    earnedBy: (c) => abandonedAsLoser(c) >= 5,
  },
  {
    id: 'friendly_fire',
    weight: 60,
    category: 'behavior',
    earnedBy: (c) => {
      const { count, total } = topOpponentShare(c);
      return total >= 6 && count / total >= 0.5;
    },
  },
  // volume
  {
    id: 'the_whale',
    weight: 90,
    category: 'volume',
    earnedBy: (c) => c.stats.totalWagered >= 1000,
    progressOf: (c) => ({ current: Math.floor(c.stats.totalWagered), target: 1000 }),
  },
  {
    id: 'the_penny',
    weight: 50,
    category: 'volume',
    earnedBy: (c) => totalDuels(c) >= 5 && avgWager(c) < 1,
  },
  // streak
  {
    id: 'hot_streak',
    weight: 80,
    category: 'streak',
    earnedBy: (c) => currentStreak(c, 'win') >= 5,
    progressOf: (c) => ({ current: currentStreak(c, 'win'), target: 5 }),
  },
  {
    id: 'cold_streak',
    weight: 75,
    category: 'streak',
    isNegative: true,
    earnedBy: (c) => currentStreak(c, 'loss') >= 5,
  },
  // vanity
  {
    id: 'the_mysterious',
    weight: 45,
    category: 'vanity',
    earnedBy: (c) => {
      if (!c.profile) return true;
      const noNick = !c.profile.nickname;
      const noAbout = !c.profile.aboutMe;
      const sl = c.profile.socialLinks;
      const noSocials = !sl || (!sl.steam && !sl.telegram && !sl.instagram);
      return noNick && noAbout && noSocials;
    },
  },
  {
    id: 'the_influencer',
    weight: 55,
    category: 'vanity',
    earnedBy: (c) => {
      const sl = c.profile?.socialLinks;
      return !!(sl?.steam && sl?.telegram && sl?.instagram);
    },
  },
];

export function computeTitles(ctx: TitleContext): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
} {
  const earned: Title[] = [];
  const unearned: Title[] = [];
  for (const title of TITLES) {
    if (title.earnedBy(ctx)) earned.push(title);
    else unearned.push(title);
  }
  const sorted = [...earned].sort((a, b) => b.weight - a.weight);
  const top3 = sorted.slice(0, 3);
  return { earned, unearned, top3 };
}
```

- [ ] **Step 6.4: Run tests, iterate until green**

Run: `cd frontend && npm run test -- src/lib/__tests__/profileTitles.test.ts`
Expected: All tests pass. If any fail, read the failure message, fix the implementation (not the test), re-run.

- [ ] **Step 6.5: Stop and report diff**

---

### Task 7: `useProfileTitles` hook

**Files:**
- Create: `frontend/src/hooks/useProfileTitles.ts`

- [ ] **Step 7.1: Implement the hook**

Create `frontend/src/hooks/useProfileTitles.ts`:

```typescript
'use client';

import { useMemo } from 'react';
import { usePlayerDuels } from './usePlayerDuels';
import { useProfile } from './useProfile';
import { computeTitles, type Title } from '@/lib/profileTitles';

export function useProfileTitles(
  address: `0x${string}` | undefined,
  chainId: number,
): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
  isLoading: boolean;
} {
  const playerStats = usePlayerDuels(address, chainId);
  const { profile, isLoading: isProfileLoading } = useProfile(address);

  const result = useMemo(() => {
    if (!address) return { earned: [], unearned: [], top3: [] };
    const allDuels = [...playerStats.activeDuels, ...playerStats.historyDuels];
    return computeTitles({
      address,
      duels: allDuels,
      stats: playerStats,
      profile,
    });
  }, [address, playerStats, profile]);

  return {
    ...result,
    isLoading: playerStats.isLoading || isProfileLoading,
  };
}
```

- [ ] **Step 7.2: Typecheck**

Run: `cd frontend && npx tsc --noEmit` — expect only profile-page errors that remain to be fixed in Phase G.

- [ ] **Step 7.3: Stop and report diff**

---

## Phase D — Animation library

### Task 8: Add `framer-motion` dependency and a reduced-motion helper

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (regenerated automatically)
- Create: `frontend/src/hooks/useReducedMotionPref.ts`

- [ ] **Step 8.1: Install framer-motion**

Run: `cd frontend && npm install framer-motion@^11.18.0`
Expected: Adds `"framer-motion": "^11.x"` to dependencies, updates `package-lock.json`.

- [ ] **Step 8.2: Create reduced-motion hook**

Create `frontend/src/hooks/useReducedMotionPref.ts`:

```typescript
'use client';

import { useReducedMotion } from 'framer-motion';

/**
 * Wrapper around framer-motion's useReducedMotion that defaults to false
 * during SSR or when matchMedia is unavailable, so the typed return is
 * always boolean (never null).
 */
export function useReducedMotionPref(): boolean {
  const reduced = useReducedMotion();
  return reduced ?? false;
}
```

- [ ] **Step 8.3: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds (warnings about unused imports in still-broken pages are acceptable for now).

- [ ] **Step 8.4: Stop and report diff**

---

## Phase E — Building-block components

Each component task is small (one component file). Tests come at the page level (Task 27); pure logic was already covered in Phase C.

### Task 9: `Identicon` component

**Files:**
- Create: `frontend/src/components/profile/Identicon.tsx`

- [ ] **Step 9.1: Implement**

Create `frontend/src/components/profile/Identicon.tsx`:

```tsx
'use client';

import { generateIdenticon } from '@/lib/identicon';
import { cn } from '@/lib/utils';

interface IdenticonProps {
  walletAddress: string;
  className?: string;
  size?: number;
}

export function Identicon({ walletAddress, className, size = 80 }: IdenticonProps) {
  const src = generateIdenticon(walletAddress);
  return (
    <img
      src={src}
      width={size}
      height={size}
      aria-label="Avatar generated from wallet address"
      className={cn('rounded-full bg-slate-100', className)}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}
```

- [ ] **Step 9.2: Stop and report diff**

---

### Task 10: `StatsStrip` component

**Files:**
- Create: `frontend/src/components/profile/StatsStrip.tsx`

- [ ] **Step 10.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface StatsStripProps {
  wins: number;
  losses: number;
  volume: number;
  reputationPercent: number | null;
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reduced = useReducedMotionPref();
  const [displayed, setDisplayed] = useState(reduced ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) {
      setDisplayed(value);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const start = performance.now();
        const duration = 300;
        const from = 0;
        const animate = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 2);
          setDisplayed(Math.round(from + (value - from) * eased));
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, reduced]);

  return <span ref={ref}>{displayed}{suffix}</span>;
}

export function StatsStrip({ wins, losses, volume, reputationPercent }: StatsStripProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-3 gap-2 rounded-xl border border-white/20 bg-white/10 p-2 text-white"
    >
      <div className="flex flex-col items-center px-2 py-1">
        <span className="text-lg font-semibold">
          <CountUp value={wins} />–<CountUp value={losses} />
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.recordLabel')}
        </span>
      </div>
      <div className="flex flex-col items-center border-x border-white/20 px-2 py-1">
        <span className="text-lg font-semibold">
          <CountUp value={Math.round(volume)} />
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.volumeLabel')}
        </span>
      </div>
      <div className="flex flex-col items-center px-2 py-1">
        <span className="text-lg font-semibold">
          {reputationPercent === null ? '—' : <><CountUp value={reputationPercent} suffix="%" /></>}
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.repLabel')}
        </span>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 10.2: Stop and report diff**

---

### Task 11: `TrophyChip` component

**Files:**
- Create: `frontend/src/components/profile/TrophyChip.tsx`

- [ ] **Step 11.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import type { Title } from '@/lib/profileTitles';
import type { TranslationKey } from '@/i18n/translations';

interface TrophyChipProps {
  title: Title;
  earned: boolean;
  size?: 'sm' | 'md';
  showDescription?: boolean;
  progress?: { current: number; target: number } | null;
}

function camelize(id: string): string {
  return id.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function TrophyChip({ title, earned, size = 'md', showDescription, progress }: TrophyChipProps) {
  const { t } = useTranslation();
  const camel = camelize(title.id);
  const label = t(`trophy.${camel}.label` as TranslationKey);
  const desc = showDescription ? t(`trophy.${camel}.desc` as TranslationKey) : null;
  const Icon = earned ? Trophy : Lock;

  const baseStyle = earned
    ? 'border-amber-400 bg-amber-50 text-amber-900'
    : 'border-slate-200 bg-slate-50 text-slate-500';

  const showProgress = !earned && !title.isNegative && progress && progress.target > 0;
  const cowardly = !earned && title.isNegative;

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
        baseStyle,
        size === 'sm' && 'px-2 py-0.5 text-xs',
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', earned ? 'text-amber-500' : 'text-slate-400')} />
      <span className="font-medium">{label}</span>
      {showDescription && desc && (
        <span className="ml-1 hidden text-xs font-normal opacity-80 sm:inline">— {desc}</span>
      )}
      {showProgress && (
        <span className="ml-1 text-xs font-mono opacity-70">
          ({progress.current} / {progress.target})
        </span>
      )}
      {cowardly && (
        <span className="ml-1 text-xs italic opacity-70">
          {t('profile.trophies.cowardlyHint')}
        </span>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 11.2: Stop and report diff**

---

### Task 12: `LookingForDuelToggle` component

**Files:**
- Create: `frontend/src/components/profile/LookingForDuelToggle.tsx`

- [ ] **Step 12.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface LookingForDuelToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function LookingForDuelToggle({ value, onChange, disabled }: LookingForDuelToggleProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <motion.span
          className="block h-3 w-3 rounded-full bg-emerald-500"
          animate={value && !reduced ? { opacity: [0.6, 1, 0.6] } : { opacity: value ? 1 : 0.3 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{t('profile.openForDuels')}</p>
        <p className="text-xs text-slate-500">{t('profile.openForDuelsHint')}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t('profile.openForDuels')}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${value ? 'bg-emerald-500' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          className={`absolute top-1.5 h-5 w-5 rounded-full bg-white shadow ${value ? 'right-1.5' : 'left-1.5'}`}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 12.2: Stop and report diff**

---

### Task 13: `InlineEditField` component

**Files:**
- Create: `frontend/src/components/profile/InlineEditField.tsx`

- [ ] **Step 13.1: Implement**

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';

interface InlineEditFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  maxLength: number;
  multiline?: boolean;
  onSave: (next: string | null) => Promise<void>;
  isSaving?: boolean;
  italic?: boolean;
}

export function InlineEditField({
  label,
  placeholder,
  value,
  maxLength,
  multiline = false,
  onSave,
  isSaving,
  italic,
}: InlineEditFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [savedFlash, setSavedFlash] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  async function commit() {
    if (draft === (value ?? '')) {
      setEditing(false);
      return;
    }
    if (draft.length > maxLength) return;
    try {
      await onSave(draft.length === 0 ? null : draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 600);
      setEditing(false);
    } catch {
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 320);
    }
  }

  function cancel() {
    setDraft(value ?? '');
    setEditing(false);
  }

  return (
    <motion.div
      animate={errorShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.32 }}
      className={`group relative flex items-start justify-between gap-3 rounded-xl border bg-white p-4 ${savedFlash ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200'}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2"
            >
              {multiline ? (
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancel();
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void commit();
                    }
                  }}
                  autoFocus
                />
              ) : (
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancel();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commit();
                    }
                  }}
                  autoFocus
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t('profile.charCount', { count: draft.length, max: maxLength })}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={cancel} disabled={isSaving} className="min-h-[44px] min-w-[44px]">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 min-h-[44px] min-w-[44px]"
                    onClick={() => void commit()}
                    disabled={isSaving || draft.length > maxLength}
                  >
                    {isSaving ? t('profile.saving') : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'} ${italic ? 'italic' : ''}`}
            >
              {value || placeholder}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 sm:opacity-50 min-h-[44px] min-w-[44px]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 13.2: Stop and report diff**

---

### Task 14: `InlineGamesEditor` component

**Files:**
- Create: `frontend/src/components/profile/InlineGamesEditor.tsx`

- [ ] **Step 14.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Pencil, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROFILE_LIMITS } from '@/lib/profile';
import { useTranslation } from '@/i18n/useTranslation';

interface InlineGamesEditorProps {
  games: string[];
  onSave: (next: string[]) => Promise<void>;
  isSaving?: boolean;
}

export function InlineGamesEditor({ games, onSave, isSaving }: InlineGamesEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(games);
  const [input, setInput] = useState('');

  function startEdit() {
    setDraft(games);
    setInput('');
    setEditing(true);
  }

  function add() {
    const tag = input.trim();
    if (!tag || tag.length > PROFILE_LIMITS.gameTag) return;
    if (draft.length >= PROFILE_LIMITS.gamesMax || draft.includes(tag)) return;
    setDraft([...draft, tag]);
    setInput('');
  }

  async function commit() {
    const pending = input.trim();
    const next = pending && pending.length <= PROFILE_LIMITS.gameTag && !draft.includes(pending)
      ? [...draft, pending]
      : draft;
    await onSave(next);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t('profile.games')}
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            aria-label="Edit games"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 min-h-[44px] min-w-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {draft.map((g) => (
              <motion.span
                key={g}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
              >
                {g}
                <button onClick={() => setDraft(draft.filter((x) => x !== g))} className="ml-0.5 text-indigo-400 hover:text-indigo-600">
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('profile.gamesPlaceholder')}
              maxLength={PROFILE_LIMITS.gameTag}
              className="h-9 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <Button size="sm" variant="outline" onClick={add} disabled={!input.trim()} className="min-h-[44px] min-w-[44px]">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isSaving} className="min-h-[44px]">
              {t('profile.cancel')}
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700 min-h-[44px]"
              onClick={() => void commit()}
              disabled={isSaving}
            >
              {isSaving ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {games.length > 0 ? (
            games.map((g) => (
              <span
                key={g}
                className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
              >
                {g}
              </span>
            ))
          ) : (
            <span className="text-sm italic text-slate-400">{t('profile.gamesPlaceholder')}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 14.2: Stop and report diff**

---

### Task 15: `ChallengeCta` component (regular + sticky variant)

**Files:**
- Create: `frontend/src/components/profile/ChallengeCta.tsx`

> **Note:** The href below uses `/duel/create?opponent=...`. Before completing this task, verify that the create-duel page (`frontend/src/app/duel/create/page.tsx` or wherever it lives) reads `useSearchParams().get('opponent')` and prefills the opponent field. If it does not, either (a) add that wiring to the create page in this same task, or (b) leave the link as `/duel/create` only and report the gap to the user. Do not silently ship a broken CTA.

- [ ] **Step 15.1: Implement**

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface ChallengeCtaProps {
  opponentAddress: string;
  variant?: 'inline' | 'sticky';
}

export function ChallengeCta({ opponentAddress, variant = 'inline' }: ChallengeCtaProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();
  const href = `/duel/create?opponent=${opponentAddress}`;

  const sticky = variant === 'sticky';

  return (
    <motion.div
      initial={sticky ? { y: 80, opacity: 0 } : false}
      animate={sticky ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={
        sticky
          ? 'fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-lg sm:hidden'
          : ''
      }
      style={sticky ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' } : undefined}
    >
      <motion.div
        animate={reduced ? {} : { scale: [1, 1.025, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Link
          href={href}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow transition-shadow hover:bg-indigo-700 hover:shadow-md min-h-[44px]"
        >
          <Sword className="h-4 w-4" />
          {t('profile.cta.challenge')}
        </Link>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 15.2: Stop and report diff**

---

### Task 16: `ShareProfileButton` component

**Files:**
- Create: `frontend/src/components/profile/ShareProfileButton.tsx`

- [ ] **Step 16.1: Implement**

```tsx
'use client';

import { Share2 } from 'lucide-react';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';

interface ShareProfileButtonProps {
  walletAddress: string;
}

export function ShareProfileButton({ walletAddress }: ShareProfileButtonProps) {
  const appToast = useAppToast();
  const { t } = useTranslation();

  async function copy() {
    try {
      const url = `${window.location.origin}/profile/${walletAddress}`;
      await navigator.clipboard.writeText(url);
      appToast.success('toast.profileLinkCopied');
    } catch {
      // ignore — clipboard rejected
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={t('profile.cta.share')}
      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/20 min-h-[44px] min-w-[44px] justify-center"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('profile.cta.share')}</span>
    </button>
  );
}
```

- [ ] **Step 16.2: Stop and report diff**

---

### Task 17: `BattleHistoryItem` component (used by `BattlesTab`)

**Files:**
- Create: `frontend/src/components/profile/BattleHistoryItem.tsx`

- [ ] **Step 17.1: Implement**

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import type { PlayerDuel } from '@/hooks/usePlayerDuels';
import { DuelState } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';

interface BattleHistoryItemProps {
  duel: PlayerDuel;
  viewerAddress: string;
  index: number;
}

function outcome(d: PlayerDuel, viewer: string): 'won' | 'lost' | 'cancelled' | 'pending' {
  const v = viewer.toLowerCase();
  if (d.state === DuelState.Resolved) {
    return d.claimedWinner.toLowerCase() === v ? 'won' : 'lost';
  }
  if (
    d.state === DuelState.Cancelled ||
    d.state === DuelState.Declined ||
    d.state === DuelState.MutuallyCancelled ||
    d.state === DuelState.Refunded
  ) {
    return 'cancelled';
  }
  return 'pending';
}

export function BattleHistoryItem({ duel, viewerAddress, index }: BattleHistoryItemProps) {
  const { t, language } = useTranslation();
  const result = outcome(duel, viewerAddress);
  const opponentAddr = duel.creator.toLowerCase() === viewerAddress.toLowerCase() ? duel.opponent : duel.creator;
  const completedAt = duel.finalizedAt > 0n ? new Date(Number(duel.finalizedAt) * 1000) : null;
  const dateStr = completedAt
    ? completedAt.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' })
    : '—';

  const colors: Record<typeof result, string> = {
    won: 'border-emerald-200 bg-emerald-50',
    lost: 'border-rose-200 bg-rose-50',
    cancelled: 'border-slate-200 bg-slate-50',
    pending: 'border-amber-200 bg-amber-50',
  };

  const labels: Record<typeof result, string> = {
    won: 'W',
    lost: 'L',
    cancelled: '—',
    pending: '…',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm ${colors[result]}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${result === 'won' ? 'bg-emerald-500 text-white' : result === 'lost' ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
          {labels[result]}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${opponentAddr}`} className="font-mono text-xs text-slate-700 hover:underline">
            {truncateAddress(opponentAddr)}
          </Link>
          <div className="text-[11px] text-slate-500">{dateStr}</div>
        </div>
      </div>
      <span className="font-mono text-xs font-medium text-slate-900 shrink-0">
        {duel.wager} USDT
      </span>
    </motion.div>
  );
}
```

- [ ] **Step 17.2: Stop and report diff**

---

## Phase F — Composite components

### Task 18: `ProfileHero` component

**Files:**
- Create: `frontend/src/components/profile/ProfileHero.tsx`

- [ ] **Step 18.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Identicon } from './Identicon';
import { StatsStrip } from './StatsStrip';
import { TrophyChip } from './TrophyChip';
import { ChallengeCta } from './ChallengeCta';
import { ShareProfileButton } from './ShareProfileButton';
import { CopyableAddress } from '@/components/duel/CopyableAddress';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { truncateAddress } from '@/lib/utils';
import type { Profile } from '@/lib/profile';
import type { Title } from '@/lib/profileTitles';
import type { PlayerStats } from '@/hooks/usePlayerDuels';

interface ProfileHeroProps {
  walletAddress: string;
  profile: Profile | null;
  stats: PlayerStats;
  reputationPercent: number | null;
  topTitles: Title[];
  isOwner: boolean;
}

export function ProfileHero({
  walletAddress,
  profile,
  stats,
  reputationPercent,
  topTitles,
  isOwner,
}: ProfileHeroProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();
  const avatarSrc = useAvatarUrl(walletAddress, profile);
  const displayName = profile?.nickname ?? truncateAddress(walletAddress);
  const totalDuels = stats.activeDuels.length + stats.historyDuels.length;
  const showStats = totalDuels > 0;

  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
      <div className="absolute right-3 top-3">
        <ShareProfileButton walletAddress={walletAddress} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
      >
        <motion.div
          whileHover={!isOwner && !reduced ? { scale: 1.02 } : undefined}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          {avatarSrc.startsWith('http') ? (
            <img
              src={avatarSrc}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <Identicon walletAddress={walletAddress} size={80} className="border-2 border-white/30" />
          )}
        </motion.div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          {profile?.battleCry && (
            <p className="mt-1 text-sm italic text-white/85 truncate">"{profile.battleCry}"</p>
          )}
          {profile?.lookingForDuel && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs">
              <motion.span
                className="block h-2 w-2 rounded-full bg-emerald-400"
                animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {t('profile.openForDuels')}
            </div>
          )}

          <div className="mt-4">
            {showStats ? (
              <StatsStrip
                wins={stats.wins}
                losses={stats.losses}
                volume={stats.totalWagered}
                reputationPercent={reputationPercent}
              />
            ) : (
              <p className="text-sm text-white/80">{t('profile.freshMeat')}</p>
            )}
          </div>

          {topTitles.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {topTitles.map((title, i) => (
                <motion.div
                  key={title.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <TrophyChip title={title} earned size="sm" />
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <CopyableAddress address={walletAddress} />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {isOwner ? (
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 min-h-[44px]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('profile.editProfile')}
              </Link>
            ) : (
              <div className="hidden sm:block">
                <ChallengeCta opponentAddress={walletAddress} variant="inline" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 18.2: Stop and report diff**

---

### Task 19: `BattlesTab` component

**Files:**
- Create: `frontend/src/components/profile/BattlesTab.tsx`

- [ ] **Step 19.1: Implement**

```tsx
'use client';

import Link from 'next/link';
import { useTranslation } from '@/i18n/useTranslation';
import { BattleHistoryItem } from './BattleHistoryItem';
import type { PlayerStats } from '@/hooks/usePlayerDuels';

interface BattlesTabProps {
  walletAddress: string;
  stats: PlayerStats;
  isOwner: boolean;
}

export function BattlesTab({ walletAddress, stats, isOwner }: BattlesTabProps) {
  const { t } = useTranslation();
  const allRecent = [...stats.activeDuels, ...stats.historyDuels].slice(0, 5);
  const viewAllHref = isOwner ? '/dashboard' : `/duels/public?player=${walletAddress}`;

  if (allRecent.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">{t('profile.empty.battles')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {allRecent.map((duel, i) => (
        <BattleHistoryItem key={duel.id} duel={duel} viewerAddress={walletAddress} index={i} />
      ))}
      <Link href={viewAllHref} className="self-end pt-2 text-xs font-medium text-indigo-600 hover:underline">
        {t('profile.cta.viewAllBattles')}
      </Link>
    </div>
  );
}
```

- [ ] **Step 19.2: Stop and report diff**

---

### Task 20: `AboutTab` component

**Files:**
- Create: `frontend/src/components/profile/AboutTab.tsx`

- [ ] **Step 20.1: Implement**

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { PROFILE_LIMITS } from '@/lib/profile';
import { InlineEditField } from './InlineEditField';
import { InlineGamesEditor } from './InlineGamesEditor';
import type { Profile, ProfileRequest } from '@/lib/profile';

interface AboutTabProps {
  profile: Profile | null;
  isOwner: boolean;
  onUpdate?: (data: ProfileRequest) => Promise<void>;
  isSaving?: boolean;
}

export function AboutTab({ profile, isOwner, onUpdate, isSaving }: AboutTabProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  const hasAnything =
    !!profile?.aboutMe || !!profile?.pronouns || !!profile?.region || (profile?.games?.length ?? 0) > 0;

  if (!isOwner && !hasAnything) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">{t('profile.empty.about')}</p>;
  }

  if (isOwner && onUpdate) {
    const wrap = (key: keyof ProfileRequest) => async (next: string | null) => {
      await onUpdate({ [key]: next });
    };

    return (
      <div className="flex flex-col gap-4">
        <InlineEditField
          label={t('profile.aboutMe')}
          placeholder={t('profile.aboutMePlaceholder')}
          value={profile?.aboutMe ?? null}
          maxLength={PROFILE_LIMITS.aboutMe}
          multiline
          onSave={wrap('aboutMe')}
          isSaving={isSaving}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InlineEditField
            label={t('profile.pronouns')}
            placeholder={t('profile.pronounsPlaceholder')}
            value={profile?.pronouns ?? null}
            maxLength={PROFILE_LIMITS.pronouns}
            onSave={wrap('pronouns')}
            isSaving={isSaving}
          />
          <InlineEditField
            label={t('profile.region')}
            placeholder={t('profile.regionPlaceholder')}
            value={profile?.region ?? null}
            maxLength={PROFILE_LIMITS.region}
            onSave={wrap('region')}
            isSaving={isSaving}
          />
        </div>
        <InlineGamesEditor
          games={profile?.games ?? []}
          onSave={async (games) => onUpdate({ games })}
          isSaving={isSaving}
        />
        {profile?.createdAt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('profile.tookUpArms')}
            </div>
            <p className="text-sm text-slate-900">
              {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Public view
  return (
    <div className="flex flex-col gap-4">
      {profile?.aboutMe && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.aboutMe')}
          </div>
          <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">{profile.aboutMe}</p>
        </div>
      )}
      {(profile?.pronouns || profile?.region) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile?.pronouns && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('profile.pronouns')}
              </div>
              <p className="text-sm text-slate-900">{profile.pronouns}</p>
            </div>
          )}
          {profile?.region && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('profile.region')}
              </div>
              <p className="text-sm text-slate-900">{profile.region}</p>
            </div>
          )}
        </div>
      )}
      {profile?.games && profile.games.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.games')}
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.games.map((g) => (
              <span key={g} className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile?.createdAt && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.tookUpArms')}
          </div>
          <p className="text-sm text-slate-900">
            {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 20.2: Stop and report diff**

---

### Task 21: `TrophiesTab` component

**Files:**
- Create: `frontend/src/components/profile/TrophiesTab.tsx`

- [ ] **Step 21.1: Implement**

```tsx
'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import { TrophyChip } from './TrophyChip';
import type { Title } from '@/lib/profileTitles';

interface TrophiesTabProps {
  earned: Title[];
  unearned: Title[];
  progressByTitleId: Record<string, { current: number; target: number } | null>;
}

export function TrophiesTab({ earned, unearned, progressByTitleId }: TrophiesTabProps) {
  const { t } = useTranslation();

  if (earned.length === 0 && unearned.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">{t('profile.empty.trophies')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {earned.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600">
            {t('profile.trophies.earned')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {earned.map((title, i) => (
              <motion.div
                key={title.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TrophyChip title={title} earned showDescription />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {unearned.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('profile.trophies.notYet')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {unearned.map((title, i) => (
              <motion.div
                key={title.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TrophyChip
                  title={title}
                  earned={false}
                  showDescription
                  progress={progressByTitleId[title.id]}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 21.2: Stop and report diff**

---

### Task 22: `ProfileTabs` wrapper

**Files:**
- Create: `frontend/src/components/profile/ProfileTabs.tsx`

- [ ] **Step 22.1: Implement**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';

export type TabKey = 'battles' | 'about' | 'reachOut' | 'trophies';

interface ProfileTabsProps {
  hasReachOut: boolean;
  battlesContent: React.ReactNode;
  aboutContent: React.ReactNode;
  reachOutContent: React.ReactNode;
  trophiesContent: React.ReactNode;
}

const ALL_TABS: { key: TabKey; labelKey: `profile.tabs.${TabKey}` }[] = [
  { key: 'battles', labelKey: 'profile.tabs.battles' },
  { key: 'about', labelKey: 'profile.tabs.about' },
  { key: 'reachOut', labelKey: 'profile.tabs.reachOut' },
  { key: 'trophies', labelKey: 'profile.tabs.trophies' },
];

export function ProfileTabs({
  hasReachOut,
  battlesContent,
  aboutContent,
  reachOutContent,
  trophiesContent,
}: ProfileTabsProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabKey>('battles');

  const visibleTabs = ALL_TABS.filter((tab) => tab.key !== 'reachOut' || hasReachOut);

  const contentMap: Record<TabKey, React.ReactNode> = {
    battles: battlesContent,
    about: aboutContent,
    reachOut: reachOutContent,
    trophies: trophiesContent,
  };

  return (
    <div>
      {/* Desktop tabs */}
      <div className="hidden border-b border-slate-200 sm:flex" role="tablist">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors min-h-[44px] ${active === tab.key ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {t(tab.labelKey)}
            {active === tab.key && (
              <motion.span
                layoutId="profile-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Desktop content */}
      <div className="hidden p-6 sm:block" role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {contentMap[active]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile stacked sections */}
      <div className="flex flex-col gap-6 p-4 sm:hidden">
        {visibleTabs.map((tab) => (
          <section key={tab.key}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t(tab.labelKey)}
            </h2>
            {contentMap[tab.key]}
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 22.2: Stop and report diff**

---

## Phase G — Page rewrites

### Task 23: Rewrite owner profile page (`/profile`)

**Files:**
- Modify: `frontend/src/app/profile/page.tsx` (full rewrite)

- [ ] **Step 23.1: Replace the file contents**

```tsx
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OAuthCallbackHandler } from '@/components/profile/OAuthCallbackHandler';
import { SocialLinksSection } from '@/components/profile/SocialLinksSection';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { BattlesTab } from '@/components/profile/BattlesTab';
import { AboutTab } from '@/components/profile/AboutTab';
import { TrophiesTab } from '@/components/profile/TrophiesTab';
import { LookingForDuelToggle } from '@/components/profile/LookingForDuelToggle';
import { InlineEditField } from '@/components/profile/InlineEditField';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { useReputation } from '@/hooks/useReputation';
import { useProfileTitles } from '@/hooks/useProfileTitles';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import { usePrivy } from '@privy-io/react-auth';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { PROFILE_LIMITS } from '@/lib/profile';
import type { ProfileRequest } from '@/lib/profile';

export default function MyProfilePage() {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const { authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();
  const displayAddress = (activeWallet?.address ?? '').toLowerCase();

  const { profile, isLoading, updateProfile, isSaving } = useMyProfile();
  const playerStats = usePlayerDuels(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const reputation = useReputation(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const { earned, unearned, top3 } = useProfileTitles(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);

  const repPct = reputation.total > 0 ? Math.round(reputation.score * 100) : null;

  const progressByTitleId = unearned.reduce<Record<string, { current: number; target: number } | null>>((acc, title) => {
    acc[title.id] = title.progressOf?.({
      address: displayAddress,
      duels: [...playerStats.activeDuels, ...playerStats.historyDuels],
      stats: playerStats,
      profile,
    }) ?? null;
    return acc;
  }, {});

  async function update(partial: ProfileRequest): Promise<void> {
    const merged: ProfileRequest = {
      nickname: profile?.nickname,
      battleCry: profile?.battleCry,
      aboutMe: profile?.aboutMe,
      pronouns: profile?.pronouns,
      region: profile?.region,
      lookingForDuel: profile?.lookingForDuel,
      games: profile?.games,
      ...partial,
    };
    try {
      await updateProfile(merged);
      appToast.success('toast.profileSaved');
    } catch (e) {
      appToast.error('toast.profileSaveFailed');
      throw e;
    }
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">{t('profile.signInToEdit')}</p>
        <Button className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700" onClick={login}>
          {t('nav.connectWallet')}
        </Button>
      </div>
    );
  }

  if (isLoading || !walletAddress) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.dashboard')}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ProfileHero
          walletAddress={displayAddress}
          profile={profile}
          stats={playerStats}
          reputationPercent={repPct}
          topTitles={top3}
          isOwner={true}
        />

        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <InlineEditField
            label={t('profile.nickname')}
            placeholder={t('profile.nicknamePlaceholder')}
            value={profile?.nickname ?? null}
            maxLength={PROFILE_LIMITS.nickname}
            onSave={(v) => update({ nickname: v })}
            isSaving={isSaving}
          />
          <InlineEditField
            label={t('profile.battleCry')}
            placeholder={t('profile.battleCryPlaceholder')}
            value={profile?.battleCry ?? null}
            maxLength={PROFILE_LIMITS.battleCry}
            onSave={(v) => update({ battleCry: v })}
            isSaving={isSaving}
            italic
          />
          <LookingForDuelToggle
            value={profile?.lookingForDuel ?? false}
            onChange={(v) => void update({ lookingForDuel: v })}
            disabled={isSaving}
          />
        </div>

        <ProfileTabs
          hasReachOut={true}
          battlesContent={
            <BattlesTab walletAddress={displayAddress} stats={playerStats} isOwner />
          }
          aboutContent={
            <AboutTab profile={profile} isOwner onUpdate={update} isSaving={isSaving} />
          }
          reachOutContent={<SocialLinksSection socialLinks={profile?.socialLinks} />}
          trophiesContent={
            <TrophiesTab earned={earned} unearned={unearned} progressByTitleId={progressByTitleId} />
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 23.2: Run typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors only in `app/profile/[walletAddress]/page.tsx` (next task).

- [ ] **Step 23.3: Stop and report diff**

---

### Task 24: Rewrite public profile page (`/profile/[walletAddress]`)

**Files:**
- Modify: `frontend/src/app/profile/[walletAddress]/page.tsx` (full rewrite)

- [ ] **Step 24.1: Replace the file contents**

```tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { BattlesTab } from '@/components/profile/BattlesTab';
import { AboutTab } from '@/components/profile/AboutTab';
import { TrophiesTab } from '@/components/profile/TrophiesTab';
import { ChallengeCta } from '@/components/profile/ChallengeCta';
import { SocialLinksDisplay } from '@/components/profile/SocialLinksDisplay';
import { useProfile } from '@/hooks/useProfile';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { useReputation } from '@/hooks/useReputation';
import { useProfileTitles } from '@/hooks/useProfileTitles';
import { useTranslation } from '@/i18n/useTranslation';
import { usePrivy } from '@privy-io/react-auth';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress: rawAddress } = use(params);
  const walletAddress = rawAddress.toLowerCase();
  const isValidAddress = /^0x[a-f0-9]{40}$/.test(walletAddress);
  const { t } = useTranslation();
  const { authenticated } = usePrivy();
  const { walletAddress: viewerAddress } = useActiveWallet();
  const isOwner = !!viewerAddress && viewerAddress === walletAddress;

  const { profile, isLoading } = useProfile(isValidAddress ? walletAddress : undefined);
  const playerStats = usePlayerDuels(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const reputation = useReputation(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const { earned, unearned, top3 } = useProfileTitles(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);

  const repPct = reputation.total > 0 ? Math.round(reputation.score * 100) : null;

  const progressByTitleId = unearned.reduce<Record<string, { current: number; target: number } | null>>((acc, title) => {
    acc[title.id] = title.progressOf?.({
      address: walletAddress,
      duels: [...playerStats.activeDuels, ...playerStats.historyDuels],
      stats: playerStats,
      profile,
    }) ?? null;
    return acc;
  }, {});

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-slate-500">{t('duel.notFound')}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('sidenav.hero')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const backHref = authenticated ? '/dashboard' : '/';
  const hasReachOut = !!(profile?.socialLinks && (
    profile.socialLinks.steam || profile.socialLinks.telegram || profile.socialLinks.instagram
  ));

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-12">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {authenticated ? t('nav.dashboard') : t('sidenav.hero')}
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ProfileHero
            walletAddress={walletAddress}
            profile={profile}
            stats={playerStats}
            reputationPercent={repPct}
            topTitles={top3}
            isOwner={isOwner}
          />
          <ProfileTabs
            hasReachOut={hasReachOut}
            battlesContent={
              <BattlesTab walletAddress={walletAddress} stats={playerStats} isOwner={isOwner} />
            }
            aboutContent={<AboutTab profile={profile} isOwner={false} />}
            reachOutContent={
              profile?.socialLinks ? (
                <SocialLinksDisplay socialLinks={profile.socialLinks} />
              ) : null
            }
            trophiesContent={
              <TrophiesTab earned={earned} unearned={unearned} progressByTitleId={progressByTitleId} />
            }
          />
        </div>
      </div>

      {!isOwner && <ChallengeCta opponentAddress={walletAddress} variant="sticky" />}
    </>
  );
}
```

- [ ] **Step 24.2: Run typecheck and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (no errors related to profile redesign).

- [ ] **Step 24.3: Stop and report diff**

---

## Phase H — Adjacent change: public-duels `?player=` filter

### Task 25: Add `?player=` filter to public duels page

**Files:**
- Modify: `frontend/src/app/duels/public/page.tsx`

- [ ] **Step 25.1: Read existing structure**

The existing `PublicDuelsPage` reads `searchQuery`, `gameFilter`, `wagerRange`, `sortBy`, `page` from local state. We add an additional, URL-bound `playerFilter` (the `?player=` query param) that further filters duels to those where `creator OR opponent === player`.

- [ ] **Step 25.2: Wire query param**

At the top of the component, after the existing state declarations, add:

```tsx
const searchParams = useSearchParams();
const playerFilter = searchParams.get('player')?.toLowerCase() ?? null;
```

Add the import at the top:

```tsx
import { useSearchParams } from 'next/navigation';
```

- [ ] **Step 25.3: Apply the filter inside the existing `filtered` `useMemo`**

Locate the `filtered` `useMemo` block. Add as the FIRST conditional filter inside the memo (before game-filter / wager-range / sortBy):

```tsx
if (playerFilter) {
  result = result.filter(
    (d) => d.creator.toLowerCase() === playerFilter ||
           (d.opponent && d.opponent.toLowerCase() === playerFilter),
  );
}
```

Add `playerFilter` to the dependencies array of that `useMemo`.

- [ ] **Step 25.4: Show a banner when filter is active**

Above the duels list, if `playerFilter` is present, render:

```tsx
{playerFilter && (
  <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
    Filtering by player: <span className="font-mono">{playerFilter.slice(0, 6)}...{playerFilter.slice(-4)}</span>{' '}
    <Link href="/duels/public" className="ml-2 underline">Clear</Link>
  </div>
)}
```

(`Link` is already imported.)

- [ ] **Step 25.5: Run typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 25.6: Stop and report diff**

---

## Phase I — Final polish

### Task 26: Update `CLAUDE.md` Key Files table

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 26.1: Update the Key Files block**

In `CLAUDE.md`, locate the "Key Files" table. Within the profile-related section, replace the existing rows with:

```
| `frontend/src/components/profile/ProfileHero.tsx` | Hero strip with avatar/name/cry/stats/top-3-trophies/CTA |
| `frontend/src/components/profile/ProfileTabs.tsx` | Desktop tabs / mobile stacked sections wrapper |
| `frontend/src/components/profile/BattlesTab.tsx` | Recent duels list + view-all link |
| `frontend/src/components/profile/AboutTab.tsx` | Bio/games/pronouns/region content |
| `frontend/src/components/profile/TrophiesTab.tsx` | Earned + not-yet auto-titles |
| `frontend/src/components/profile/Identicon.tsx` | Deterministic SVG identicon from wallet address |
| `frontend/src/components/profile/StatsStrip.tsx` | Hero W-L / Volume / Rep card |
| `frontend/src/components/profile/TrophyChip.tsx` | Single trophy display, used in hero and tab |
| `frontend/src/components/profile/InlineEditField.tsx` | Reusable inline-edit field |
| `frontend/src/components/profile/InlineGamesEditor.tsx` | Tag-list editor for games[] |
| `frontend/src/components/profile/LookingForDuelToggle.tsx` | "Open for duels" switch (owner only) |
| `frontend/src/components/profile/ChallengeCta.tsx` | "Challenge to duel" button (inline + sticky) |
| `frontend/src/components/profile/ShareProfileButton.tsx` | Copy profile link button |
| `frontend/src/components/profile/BattleHistoryItem.tsx` | Single duel row in BattlesTab |
| `frontend/src/lib/identicon.ts` | Hand-rolled deterministic identicon SVG generator |
| `frontend/src/lib/profileTitles.ts` | Auto-title catalog + `computeTitles` pure function |
| `frontend/src/hooks/useAvatarUrl.ts` | Steam → Telegram → identicon avatar cascade |
| `frontend/src/hooks/useProfileTitles.ts` | Hook wrapping usePlayerDuels + useProfile + computeTitles |
| `frontend/src/hooks/useReducedMotionPref.ts` | Wrapper around framer-motion's useReducedMotion |
```

Remove any rows referencing the deleted profile fields (firstName/lastName/gender/status — none likely listed, but verify).

- [ ] **Step 26.2: Add `framer-motion` to environment notes if relevant**

Optional: skip unless the engineer believes it's worth surfacing. The dependency change is visible in `package.json`.

- [ ] **Step 26.3: Stop and report diff**

---

### Task 27: Playwright e2e tests

**Files:**
- Create: `frontend/e2e/profile.spec.ts`
- Create: `frontend/e2e/profile-public.spec.ts`

- [ ] **Step 27.1: Write owner-profile e2e test**

Create `frontend/e2e/profile.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Owner profile page', () => {
  test('renders sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText(/Sign in/i)).toBeVisible();
  });
});
```

This is a smoke test only — full owner-flow testing requires wallet auth fixtures which are out of scope.

- [ ] **Step 27.2: Write public profile e2e test**

Create `frontend/e2e/profile-public.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const VALID_ADDR = '0x1234567890123456789012345678901234567890';

test.describe('Public profile page', () => {
  test('renders profile shell for a valid wallet address', async ({ page }) => {
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
  });

  test('shows tabs row on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('tab', { name: /battles/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /trophies/i })).toBeVisible();
  });

  test('shows stacked sections + sticky Challenge CTA on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /challenge/i })).toBeVisible();
  });

  test('rejects malformed addresses', async ({ page }) => {
    await page.goto('/profile/not-an-address');
    await expect(page.getByText(/not.found/i)).toBeVisible();
  });
});
```

- [ ] **Step 27.3: Run e2e against a local dev server**

Run: `cd frontend && npm run dev -- --hostname 127.0.0.1 --port 3010` (in a separate terminal or background).
Then: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npx playwright test e2e/profile.spec.ts e2e/profile-public.spec.ts`
Expected: All tests pass.

If Playwright Chromium isn't installed: `npx playwright install chromium` first.

- [ ] **Step 27.4: Capture screenshots for review**

```bash
npx playwright screenshot --wait-for-timeout=3000 --full-page http://127.0.0.1:3010/profile/0x1234567890123456789012345678901234567890 /tmp/profile-public-desktop.png
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 --full-page http://127.0.0.1:3010/profile/0x1234567890123456789012345678901234567890 /tmp/profile-public-mobile.png
```

- [ ] **Step 27.5: Inspect the screenshots in the user's image viewer**

Use the Read tool to display each PNG. Look for: overlapping text, clipped buttons, horizontal scroll, broken spacing, missing visible states. Report any issues found before continuing.

- [ ] **Step 27.6: Clean up**

Run: `rm /tmp/profile-public-desktop.png /tmp/profile-public-mobile.png`
Stop the dev server.

- [ ] **Step 27.7: Stop and report diff**

---

### Task 28: Final verification (lint + build + typecheck + reduced-motion + report)

**Files:** none modified — verification only.

- [ ] **Step 28.1: Frontend type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 28.2: Frontend lint**

Run: `cd frontend && npm run lint`
Expected: zero errors. If `react-hooks/set-state-in-effect` flags appear in profile pages, refactor the offending pattern (per CLAUDE.md note about the `eslint-plugin-react-hooks: 7.0.1` pin).

- [ ] **Step 28.3: Frontend unit tests**

Run: `cd frontend && npm run test`
Expected: zero failures.

- [ ] **Step 28.4: Frontend production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no warnings about missing translation keys.

- [ ] **Step 28.5: Backend full build (tests inclusive)**

Run: `cd backend && ./gradlew build`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 28.6: Reduced-motion verification**

Manual: open the dev server, in Chrome DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion`: reduce". Reload `/profile/0x1234...`. Confirm:
- No count-up animation in stats strip
- No pulse on the Challenge CTA
- No pulse on the green "Open for duels" dot
- Hover scales are gone

- [ ] **Step 28.7: Final diff report**

Run: `git status` and `git diff --stat`
Report all changed files to the user, summarized by phase. Do NOT commit. Wait for explicit user authorization.

---

## Self-review notes

- All 12 spec sections have at least one task implementing them: §3 (Tasks 1–2), §4 (Tasks 18, 22, 23, 24), §5 (Tasks 12, 13, 23), §6 (Tasks 6, 7, 21), §7 (Task 8 + animations baked into each component), §8 (Task 3), §9 (every component task), §10 (Tasks 1, 4, 6, 27, 28), §11 (Task 28 reduced-motion), §12 (this plan).
- No "TBD" / placeholder / "implement later" patterns.
- Type consistency: `Title` interface defined in Task 6 used in Tasks 7, 11, 18, 21, 23, 24. `PlayerStats` reused from existing `usePlayerDuels`. `Profile` from `lib/profile` consistent throughout.
- Per-action commit gating: every task ends with "Stop and report diff" — no `git add` / `git commit` is run automatically.

End of plan.
