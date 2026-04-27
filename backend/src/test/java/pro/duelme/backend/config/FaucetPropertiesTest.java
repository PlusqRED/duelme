package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;

import static org.assertj.core.api.Assertions.assertThat;

class FaucetPropertiesTest {

    private static final String SECRET_KEY =
        "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    private static final String SECRET_RPC = "https://rpc.example.com/v2/my-secret-api-key";

    @Test
    void toStringMasksPrivateKey() {
        var props = buildProps();

        String rendered = props.toString();

        assertThat(rendered).doesNotContain(SECRET_KEY);
        assertThat(rendered).doesNotContain("deadbeef");
        assertThat(rendered).contains("***MASKED***");
    }

    @Test
    void toStringMasksRpcUrl() {
        var props = buildProps();

        String rendered = props.toString();

        assertThat(rendered).doesNotContain("my-secret-api-key");
        assertThat(rendered).doesNotContain(SECRET_RPC);
    }

    @Test
    void toStringStillExposesNonSecretFields() {
        var props = buildProps();

        String rendered = props.toString();

        assertThat(rendered).contains("enabled=true");
        assertThat(rendered).contains("chainId=421614");
    }

    private static FaucetProperties buildProps() {
        return new FaucetProperties(
            true,
            SECRET_KEY,
            SECRET_RPC,
            421614L,
            "0xbf345834d808a058e1278b50f3844aD86686f401",
            new BigDecimal("0.001"),
            new BigInteger("100000000")
        );
    }
}
