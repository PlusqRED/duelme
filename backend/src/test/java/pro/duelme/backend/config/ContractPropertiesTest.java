package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContractPropertiesTest {

    private static final String ADDRESS = "0x990aD70C168B184a84d6d9491303fa344154e317";

    @Test
    void lowercasesEveryAddress() {
        var props = new ContractProperties(Map.of(421614, ADDRESS));

        assertThat(props.duelMe()).containsExactly(Map.entry(421614, ADDRESS.toLowerCase()));
    }

    @Test
    void rejectsAnUnquotedYamlAddress() {
        var decimalForm = "874498594294857232962900064396166215817222268183";

        assertThatThrownBy(() -> new ContractProperties(Map.of(421614, decimalForm)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("quote it");
    }

    @Test
    void rejectsAMalformedAddress() {
        assertThatThrownBy(() -> new ContractProperties(Map.of(421614, "0xnope")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("421614");
    }

    @Test
    void rejectsAMissingAddress() {
        var withNull = new HashMap<Integer, String>();
        withNull.put(421614, null);

        assertThatThrownBy(() -> new ContractProperties(withNull))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsAnEmptyMap() {
        assertThatThrownBy(() -> new ContractProperties(Map.of()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("duelme.contracts.duel-me");
    }

    @Test
    void rejectsNoMapAtAll() {
        assertThatThrownBy(() -> new ContractProperties(null))
            .isInstanceOf(IllegalStateException.class);
    }
}
