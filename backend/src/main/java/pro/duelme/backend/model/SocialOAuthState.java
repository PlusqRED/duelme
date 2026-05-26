package pro.duelme.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Short-lived server-side record used to recover wallet identity (and a
 * PKCE verifier for Telegram) across the OAuth redirect roundtrip.
 *
 * <p>{@code id} is the opaque token sent as the {@code state} URL
 * parameter; treating it as one-time-use (atomic find-and-remove on
 * verify) gives us replay protection. {@code expiresAt} is TTL-indexed
 * so abandoned states are reaped by Mongo automatically.
 *
 * <p>The {@link Indexed} annotation is decorative — Spring Data does
 * not auto-create indexes in this project. The TTL index is registered
 * explicitly in {@code MongoConfig}.
 */
@Document("social_oauth_states")
public record SocialOAuthState(
    @Id String id,
    String wallet,
    String platform,
    String codeVerifier,
    @Indexed(expireAfterSeconds = 0) Instant expiresAt
) {}
