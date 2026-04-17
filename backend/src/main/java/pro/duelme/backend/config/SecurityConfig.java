package pro.duelme.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/docs/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/swagger-ui/**").permitAll()
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
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
