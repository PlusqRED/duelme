package pro.duelme.backend.validation;

import java.util.regex.Pattern;

/**
 * The one spelling of "looks like an EVM address" in the backend: {@link #REGEX}
 * is a constant so Bean Validation {@code @Pattern} can use it, {@link
 * #isValid(String)} reuses the same expression, and two copies would drift.
 */
public final class EvmAddress {

    public static final String REGEX = "^0x[0-9a-fA-F]{40}$";

    private static final Pattern PATTERN = Pattern.compile(REGEX);

    private EvmAddress() {
    }

    public static boolean isValid(String value) {
        return value != null && PATTERN.matcher(value).matches();
    }
}
