package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InstagramHandleValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "user",
        "user.name",
        "user_123",
        "a",
        "a.b_c",
        "abcdefghij1234567890abcdefghij",   // exactly 30 chars
        "1",
        "1user",
        "user.name.with.dots",
    })
    void validHandlesPass(String handle) {
        assertThat(InstagramHandleValidator.isValid(handle)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        ".leading",
        "trailing.",
        "consec..utive",
        "a..b",
        "abcdefghij1234567890abcdefghij1",  // 31 chars
        "спасибо",                           // non-ASCII
        "user name",                         // space
        "user-name",                         // hyphen not allowed
        "user@name",
        "",
    })
    void invalidHandlesFail(String handle) {
        assertThat(InstagramHandleValidator.isValid(handle)).isFalse();
    }

    @Test
    void nullIsInvalid() {
        assertThat(InstagramHandleValidator.isValid(null)).isFalse();
    }

    @Test
    void stripsLeadingAtAndLowercases() {
        assertThat(InstagramHandleValidator.normalise("@SomeUser")).isEqualTo("someuser");
        assertThat(InstagramHandleValidator.normalise("plainName")).isEqualTo("plainname");
        assertThat(InstagramHandleValidator.normalise(" @Spaced ")).isEqualTo("spaced");
    }

    @Test
    void isValidAcceptsLeadingAt() {
        assertThat(InstagramHandleValidator.isValid("@validHandle")).isTrue();
    }

    @Test
    void normaliseRejectsInvalidAfterStrip() {
        assertThatThrownBy(() -> InstagramHandleValidator.normalise("@.invalid"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void normaliseRejectsNull() {
        assertThatThrownBy(() -> InstagramHandleValidator.normalise(null))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
