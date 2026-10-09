package pro.duelme.backend.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import pro.duelme.backend.security.PrivyJwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final PrivyJwtAuthenticationFilter jwtFilter;

    public SecurityConfig(PrivyJwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    // The springdoc flags are read here rather than left to springdoc's @ConditionalOnProperty,
    // which Spring AOT settles at build time, so the native image would ignore the prod profile.
    @Bean
    public SecurityFilterChain filterChain(
        HttpSecurity http,
        @Value("${springdoc.api-docs.enabled:true}") boolean apiDocsEnabled,
        @Value("${springdoc.swagger-ui.enabled:true}") boolean swaggerUiEnabled
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/docs/**")
                    .access((authentication, context) -> new AuthorizationDecision(apiDocsEnabled))
                .requestMatchers(HttpMethod.GET, "/api/v1/swagger-ui/**")
                    .access((authentication, context) -> new AuthorizationDecision(swaggerUiEnabled))
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles/me").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/v1/profiles/me").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/profiles/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles/{walletAddress}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/games").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/games/{slug}").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/games").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/duels/{duelId}/meta").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/duels/{duelId}/meta").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/duels/meta").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/duels/meta/batch").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/faucet/claim").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles/me/social/steam/callback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles/me/social/telegram/callback").permitAll()
                .requestMatchers("/api/v1/profiles/me/social/**").authenticated()
                // Spring Security authorizes every dispatch type, so without this denyAll
                // also catches the container's forward to /error and turns every 400/500
                // into an empty 401. A direct request to /error is a REQUEST dispatch and
                // still falls through to denyAll.
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
