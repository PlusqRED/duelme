package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the social account linking feature. Secrets are
 * masked in {@link #toString()} to prevent accidental disclosure via
 * log lines or error reports.
 *
 * <p>Source of truth: {@code application.yml} — values come from env
 * vars in deployed environments (GitHub Actions → Docker {@code -e}).
 * No defaults for secrets; missing config surfaces as a {@code null}
 * which downstream services validate at the call site.
 */
@ConfigurationProperties(prefix = "duelme.social")
public record SocialLinkProperties(
    String appBaseUrl,
    String stateSecret,
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

    @Override
    public String toString() {
        return "SocialLinkProperties[appBaseUrl=" + appBaseUrl
            + ", stateSecret=***MASKED***"
            + ", steam=" + steam
            + ", telegram=" + telegram
            + "]";
    }
}
