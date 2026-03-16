package pro.duelme.backend.config;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;

/**
 * Registers GraalVM native-image reflection hints for third-party classes
 * that Spring AOT cannot discover automatically.
 *
 * nimbus-jose-jwt resolves key types and JWT processors via reflection at
 * runtime; without these hints the native binary fails on JWKS verification.
 */
public class NativeImageHints implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        var reflection = hints.reflection();

        // --- nimbus-jose-jwt: JWT processing & ECDSA verification ----------
        String[] nimbusClasses = {
            "com.nimbusds.jose.jwk.JWKSet",
            "com.nimbusds.jose.jwk.ECKey",
            "com.nimbusds.jose.jwk.RSAKey",
            "com.nimbusds.jose.jwk.OctetKeyPair",
            "com.nimbusds.jose.jwk.OctetSequenceKey",
            "com.nimbusds.jose.crypto.ECDSAVerifier",
            "com.nimbusds.jose.crypto.RSASSAVerifier",
            "com.nimbusds.jose.proc.JWSVerificationKeySelector",
            "com.nimbusds.jwt.JWTClaimsSet",
            "com.nimbusds.jwt.proc.DefaultJWTProcessor",
            "com.nimbusds.jose.jwk.source.ImmutableJWKSet",
        };

        for (String className : nimbusClasses) {
            try {
                reflection.registerType(
                    Class.forName(className),
                    MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                    MemberCategory.INVOKE_DECLARED_METHODS,
                    MemberCategory.ACCESS_DECLARED_FIELDS
                );
            } catch (ClassNotFoundException ignored) {
                // optional class not on classpath — skip
            }
        }

        // --- nimbus JSON parsing internals ---------------------------------
        String[] jsonClasses = {
            "com.nimbusds.jose.util.JSONObjectUtils",
            "com.nimbusds.jose.JWSAlgorithm",
            "com.nimbusds.jose.JWSHeader",
            "com.nimbusds.jose.Payload",
        };

        for (String className : jsonClasses) {
            try {
                reflection.registerType(
                    Class.forName(className),
                    MemberCategory.INVOKE_DECLARED_METHODS,
                    MemberCategory.ACCESS_DECLARED_FIELDS
                );
            } catch (ClassNotFoundException ignored) {
            }
        }
    }
}
