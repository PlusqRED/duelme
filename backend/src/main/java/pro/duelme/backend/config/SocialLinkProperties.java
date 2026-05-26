package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the social account linking feature. Nested records
 * ({@link Steam}, {@link Telegram}) override {@code toString} to mask
 * their secret fields and prevent accidental disclosure via log lines
 * or error reports.
 *
 * <p>Source of truth: {@code application.yml} — values come from env
 * vars in deployed environments (GitHub Actions → Docker {@code -e}).
 * No defaults for secrets; missing config surfaces as a {@code null}
 * which downstream services validate at the call site.
 */
@ConfigurationProperties(prefix = "duelme.social")
public record SocialLinkProperties(
    String appBaseUrl,
    Steam steam,
    Telegram telegram
) {
    public record Steam(String apiKey, String returnUrl) {
        @Override
        public String toString() {
            return "Steam[apiKey=***MASKED***, returnUrl=" + returnUrl + "]";
        }
    }

    public record Telegram(
        String clientId,
        String clientSecret,
        String returnUrl,
        String issuer
    ) {
        @Override
        public String toString() {
            return "Telegram[clientId=" + clientId
                + ", clientSecret=***MASKED***"
                + ", returnUrl=" + returnUrl
                + ", issuer=" + issuer
                + "]";
        }
    }
}
