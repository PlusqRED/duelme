package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;
import pro.duelme.backend.model.GameCategory;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CatalogPropertiesTest {

    @Test
    void keepsEveryCategorysNames() {
        var props = new CatalogProperties(Map.of(GameCategory.BOARD, List.of("Chess", "Backgammon")));

        assertThat(props.games()).containsExactly(Map.entry(GameCategory.BOARD, List.of("Chess", "Backgammon")));
    }

    @Test
    void readsNoCatalogAsAnEmptyOne() {
        assertThat(new CatalogProperties(null).games()).isEmpty();
    }

    @Test
    void rejectsABlankName() {
        assertThatThrownBy(() -> new CatalogProperties(Map.of(GameCategory.CARD, List.of("Poker", " "))))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CARD");
    }

    @Test
    void rejectsAMissingName() {
        var withNull = Arrays.asList("Poker", null);

        assertThatThrownBy(() -> new CatalogProperties(Map.of(GameCategory.CARD, withNull)))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsOneGameNamedTwice() {
        // Different spellings, one slug: each boot would rename the game to the other.
        var catalog = Map.of(GameCategory.FPS, List.of("CS2"), GameCategory.OTHER, List.of("cs2"));

        assertThatThrownBy(() -> new CatalogProperties(catalog))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("twice");
    }
}
