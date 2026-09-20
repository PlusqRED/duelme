package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reads the shipped application.yml the way Spring does.
 *
 * FaucetServiceTest supplies every faucet property inline, so it never touches the real file
 * — which is how an unquoted address got through. YAML resolves a bare {@code 0x…} as a hex
 * integer; Spring then binds its decimal form, FaucetService's address check rejects it, and
 * the constructor throws during startup, taking the whole backend down rather than just the
 * faucet.
 */
class FaucetPropertiesBindingTest {

    private static final String ADDRESS_PATTERN = "^0x[0-9a-fA-F]{40}$";
    private static final String TOKEN_PROPERTY = "duelme.faucet.mock-usdt-address";

    private static Object load(Resource resource, String property) throws IOException {
        for (PropertySource<?> source : new YamlPropertySourceLoader().load("yaml", resource)) {
            Object value = source.getProperty(property);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    @Test
    void shippedFaucetTokenReadsBackAsAnAddress() throws IOException {
        Object value = load(new FileSystemResource("src/main/resources/application.yml"), TOKEN_PROPERTY);

        assertThat(value)
            .as("%s is missing from application.yml", TOKEN_PROPERTY)
            .isNotNull();
        assertThat(String.valueOf(value))
            .as("must stay quoted — a bare 0x… parses as a number and fails FaucetService")
            .matches(ADDRESS_PATTERN);
    }

    @Test
    void unquotedAddressDoesNotSurviveYaml() throws IOException {
        // Pins the reason for the quotes, so dropping them cannot look harmless.
        var yaml = "duelme:\n  faucet:\n    mock-usdt-address: 0xbf345834d808a058e1278b50f3844aD86686f401\n";
        Object value = load(new ByteArrayResource(yaml.getBytes(StandardCharsets.UTF_8)), TOKEN_PROPERTY);

        assertThat(String.valueOf(value)).doesNotMatch(ADDRESS_PATTERN);
    }

    @Test
    void quotedAddressSurvivesYaml() throws IOException {
        var yaml = "duelme:\n  faucet:\n    mock-usdt-address: \"0xbf345834d808a058e1278b50f3844aD86686f401\"\n";
        Object value = load(new ByteArrayResource(yaml.getBytes(StandardCharsets.UTF_8)), TOKEN_PROPERTY);

        assertThat(String.valueOf(value)).matches(ADDRESS_PATTERN);
    }
}
