package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.predicate.RuntimeHintsPredicates;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the web3j reflection hints that the native image needs to deserialize
 * JSON-RPC responses. JVM tests do not exercise GraalVM reflection, so a
 * missing hint only shows up at runtime in the deployed native binary. This
 * test fails fast if anyone removes the hints that keep the faucet working.
 */
class NativeImageHintsTest {

    @Test
    void registersWeb3jResponseDeserializers() throws ClassNotFoundException {
        RuntimeHints hints = registered();

        // Response$Error.data is @JsonDeserialize(using = KeepAsJsonDeserialzier);
        // Jackson instantiates the deserializer via its no-arg constructor while
        // resolving every Response<T> subtype, so the ctor must survive AOT.
        assertCtorRegistered(hints, "org.web3j.protocol.deserializer.KeepAsJsonDeserialzier");
        assertCtorRegistered(hints, "org.web3j.protocol.deserializer.RawResponseDeserializer");
    }

    @Test
    void registersWeb3jResponseTypes() throws ClassNotFoundException {
        RuntimeHints hints = registered();

        String[] responseTypes = {
            "org.web3j.protocol.core.Response",
            "org.web3j.protocol.core.Response$Error",
            "org.web3j.protocol.core.methods.response.EthGasPrice",
            "org.web3j.protocol.core.methods.response.EthSendTransaction",
            "org.web3j.protocol.core.methods.response.EthGetTransactionCount",
        };
        for (String type : responseTypes) {
            assertCtorRegistered(hints, type);
        }
    }

    @Test
    void registersNimbusJwtVerificationClasses() throws ClassNotFoundException {
        RuntimeHints hints = registered();

        // PrivyJwksService + TelegramJwksService parse and verify ID tokens
        // through SignedJWT and the EC/RSA verifiers — all reached via
        // reflection during JWKS processing.
        assertCtorRegistered(hints, "com.nimbusds.jose.crypto.ECDSAVerifier");
        assertCtorRegistered(hints, "com.nimbusds.jose.crypto.RSASSAVerifier");
        assertCtorRegistered(hints, "com.nimbusds.jwt.SignedJWT");
    }

    @Test
    void registersSocialLinkResponseDtos() throws ClassNotFoundException {
        RuntimeHints hints = registered();

        // Jackson deserialises these via reflection over record components.
        assertCtorRegistered(hints, "pro.duelme.backend.dto.TelegramTokenResponse");
        assertCtorRegistered(hints, "pro.duelme.backend.service.SteamProfileFetcher$SummariesResponse");
        assertCtorRegistered(hints, "pro.duelme.backend.service.SteamProfileFetcher$InnerResponse");
        assertCtorRegistered(hints, "pro.duelme.backend.service.SteamProfileFetcher$Player");
    }

    private static RuntimeHints registered() {
        RuntimeHints hints = new RuntimeHints();
        new NativeImageHints().registerHints(hints, NativeImageHintsTest.class.getClassLoader());
        return hints;
    }

    private static void assertCtorRegistered(RuntimeHints hints, String className)
        throws ClassNotFoundException {
        assertThat(RuntimeHintsPredicates.reflection()
            .onType(Class.forName(className))
            .withMemberCategory(MemberCategory.INVOKE_DECLARED_CONSTRUCTORS)
            .test(hints))
            .as("%s must be reflection-registered for Jackson deserialization", className)
            .isTrue();
    }
}
