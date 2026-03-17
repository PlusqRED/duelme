package pro.duelme.backend.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class PrivyJwksService {

    private static final Logger log = LoggerFactory.getLogger(PrivyJwksService.class);

    private final String jwksUrl;
    private final String appId;
    private final AtomicReference<CachedJwks> cachedJwks = new AtomicReference<>();

    private record CachedJwks(JWKSet jwkSet, Instant fetchedAt) {}

    public PrivyJwksService(@Value("${privy.app-id}") String appId) {
        this.appId = appId;
        this.jwksUrl = "https://auth.privy.io/api/v1/apps/" + appId + "/jwks.json";
    }

    public Optional<String> verifyAndExtractWallet(String token) {
        try {
            JWKSet jwkSet = getJwkSet();
            JWKSource<SecurityContext> keySource = new ImmutableJWKSet<>(jwkSet);

            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, keySource));

            JWTClaimsSet claims = processor.process(token, null);

            if (!"privy.io".equals(claims.getIssuer())) {
                log.debug("JWT issuer mismatch: {}", claims.getIssuer());
                return Optional.empty();
            }

            if (!claims.getAudience().contains(appId)) {
                log.debug("JWT audience does not contain app ID");
                return Optional.empty();
            }

            @SuppressWarnings("unchecked")
            var linkedAccounts = (List<Map<String, Object>>) claims.getClaim("linked_accounts");
            if (linkedAccounts != null) {
                for (Map<String, Object> account : linkedAccounts) {
                    if ("wallet".equals(account.get("type"))) {
                        String address = (String) account.get("address");
                        if (address != null) {
                            return Optional.of(address.toLowerCase());
                        }
                    }
                }
            }

            return Optional.empty();
        } catch (Exception e) {
            log.debug("JWT verification failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private JWKSet getJwkSet() throws Exception {
        CachedJwks cached = cachedJwks.get();
        if (cached != null && cached.fetchedAt().isAfter(Instant.now().minusSeconds(300))) {
            return cached.jwkSet();
        }

        JWKSet jwkSet = JWKSet.load(URI.create(jwksUrl).toURL());
        cachedJwks.set(new CachedJwks(jwkSet, Instant.now()));
        return jwkSet;
    }
}
