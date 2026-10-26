package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/** {@link GameService#toSlug}: the key a game's name is stored and found under. */
class GameSlugTest {

    @Test
    void slugGenerationFromName() {
        assertThat(GameService.toSlug("Counter-Strike 2")).isEqualTo("counter-strike-2");
        assertThat(GameService.toSlug("  Hello   World  ")).isEqualTo("hello-world");
        assertThat(GameService.toSlug("CS2")).isEqualTo("cs2");
        assertThat(GameService.toSlug("Game!!!Name")).isEqualTo("gamename");
        assertThat(GameService.toSlug("--dashes--")).isEqualTo("dashes");
    }

    @Test
    void slugFallbackForNonLatinNames() {
        String slug = GameService.toSlug("\u0428\u0430\u0445\u043c\u0430\u0442\u044b");

        assertThat(slug).startsWith("g-");
        assertThat(slug).isNotEmpty();
    }

    @Test
    void slugFallbackProducesDistinctValuesForDistinctNonLatinNames() {
        String chess = GameService.toSlug("\u0428\u0430\u0445\u043c\u0430\u0442\u044b");      // Шахматы
        String go = GameService.toSlug("\u56f2\u7881");                                        // 囲碁
        String shogi = GameService.toSlug("\u5c06\u68cb");                                     // 将棋

        assertThat(chess).isNotEqualTo(go);
        assertThat(go).isNotEqualTo(shogi);
        assertThat(chess).isNotEqualTo(shogi);
    }

    @Test
    void slugOfANameMixingScriptsKeepsItsNonLatinWords() {
        // Only the Latin remnant used to survive: «Дота 2» and «КС 2» both became "2", one game.
        String dota = GameService.toSlug("\u0414\u043e\u0442\u0430 2");                   // Дота 2
        String cs = GameService.toSlug("\u041a\u0421 2");                                     // КС 2
        String heroes = GameService.toSlug("\u0413\u0435\u0440\u043e\u0438 III");          // Герои III

        assertThat(List.of(dota, cs, heroes)).allMatch(slug -> slug.startsWith("g-"));
        assertThat(dota).isNotEqualTo(cs);
    }

    @Test
    void slugOfANonLatinNameIgnoresSpacingAndPunctuationAsTheLatinRuleDoes() {
        String dota = GameService.toSlug("\u0414\u043e\u0442\u0430 2");                     // Дота 2

        assertThat(GameService.toSlug("\u0414\u043e\u0442\u0430  2!")).isEqualTo(dota);    // Дота  2!
        assertThat(GameService.toSlug("\u0414\u043e\u0442\u0430-2")).isEqualTo(dota);      // Дота-2
        assertThat(GameService.toSlug("\u0414\u043e\u0442\u04302")).isNotEqualTo(dota);    // Дота2
    }

    @Test
    void slugOfANameOfSymbolsAloneKeepsThem() {
        assertThat(GameService.toSlug("\u2659")).isNotEqualTo(GameService.toSlug("\u2654")); // ♙, ♔
    }

    @Test
    void slugIgnoresTheDefaultLocale() {
        Locale before = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr"));

            assertThat(GameService.toSlug("Warcraft III")).isEqualTo("warcraft-iii");
        } finally {
            Locale.setDefault(before);
        }
    }

    @Test
    void slugOfAnAccentedLatinNameStaysReadable() {
        assertThat(GameService.toSlug("Pok\u00e9mon Unite")).isEqualTo("pokmon-unite");
    }
}
