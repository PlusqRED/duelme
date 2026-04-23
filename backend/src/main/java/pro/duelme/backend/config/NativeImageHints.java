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

        // --- web3j: testnet faucet signing + JSON-RPC ----------------------
        // web3j uses Jackson-via-reflection for JSON-RPC request/response
        // binding and BouncyCastle for secp256k1. These types are only touched
        // when the faucet feature is enabled (dev), but GraalVM needs them at
        // build time regardless.
        String[] web3jClasses = {
            // JSON-RPC request envelope + response types we actually call.
            "org.web3j.protocol.core.Request",
            "org.web3j.protocol.core.Response",
            "org.web3j.protocol.core.Response$Error",
            "org.web3j.protocol.core.methods.response.EthSendTransaction",
            "org.web3j.protocol.core.methods.response.EthGasPrice",
            "org.web3j.protocol.core.methods.response.EthGetTransactionCount",
            // Response$Error.data has @JsonDeserialize(using = KeepAsJsonDeserialzier)
            // (typo is upstream). Jackson instantiates the deserializer via its
            // no-arg constructor reflectively while resolving every Response<T>
            // subtype; without this hint the native image strips the ctor and
            // every JSON-RPC call fails with InvalidDefinitionException.
            // RawResponseDeserializer is registered via ObjectMapperFactory's
            // BeanDeserializerModifier and reached through the same code path.
            "org.web3j.protocol.deserializer.KeepAsJsonDeserialzier",
            "org.web3j.protocol.deserializer.RawResponseDeserializer",
            // Signing + ABI encoding path.
            "org.web3j.crypto.RawTransaction",
            "org.web3j.crypto.TransactionEncoder",
            "org.web3j.crypto.Sign",
            "org.web3j.crypto.Sign$SignatureData",
            "org.web3j.abi.TypeEncoder",
            "org.web3j.abi.FunctionEncoder",
            "org.web3j.abi.datatypes.Address",
            "org.web3j.abi.datatypes.generated.Uint256",
            // BouncyCastle — secp256k1 curve params resolved via reflection.
            "org.bouncycastle.jce.provider.BouncyCastleProvider",
            "org.bouncycastle.asn1.sec.SECNamedCurves",
            "org.bouncycastle.jcajce.provider.asymmetric.EC",
        };

        for (String className : web3jClasses) {
            try {
                reflection.registerType(
                    Class.forName(className),
                    MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                    MemberCategory.INVOKE_DECLARED_METHODS,
                    MemberCategory.ACCESS_DECLARED_FIELDS
                );
            } catch (ClassNotFoundException ignored) {
            }
        }
    }
}
