package pro.duelme.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * HTTP client dedicated to social-account verification flows (Steam
 * OpenID, Telegram OIDC). Separate bean from the project-wide default
 * so we can tune timeouts without affecting other callers, and so
 * tests can swap it cleanly via
 * {@link org.springframework.test.web.client.MockRestServiceServer}.
 */
@Configuration
public class SocialLinkConfig {

    @Bean
    public RestClient socialRestClient() {
        // JDK's HttpClient only supports a connect timeout at the client level,
        // not per request. Wrap it in JdkClientHttpRequestFactory which sets
        // the read timeout per-call and inherits the HttpClient's connect
        // timeout.
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
        var factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder()
            .requestFactory(factory)
            .build();
    }
}
