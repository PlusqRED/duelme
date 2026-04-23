package pro.duelme.backend.service;

import java.util.regex.Pattern;

/**
 * Validates and normalises Instagram handles. Instagram's rules: 1-30
 * chars, alphanumerics + period + underscore, cannot start or end with
 * a period, no consecutive periods. The leading {@code @} is stripped
 * before validation so users can paste either {@code @name} or {@code name}.
 */
public final class InstagramHandleValidator {

    private static final Pattern HANDLE_PATTERN =
        Pattern.compile("^(?!\\.)(?!.*\\.\\.)[a-zA-Z0-9._]{1,30}(?<!\\.)$");

    private InstagramHandleValidator() {}

    public static boolean isValid(String raw) {
        if (raw == null) return false;
        return HANDLE_PATTERN.matcher(stripLeadingAt(raw.trim())).matches();
    }

    /**
     * Strips the leading {@code @} (if present) and lowercases the handle.
     * Throws {@link IllegalArgumentException} if the result does not match
     * Instagram's handle rules — callers are expected to catch and surface
     * this as a 400-level response.
     */
    public static String normalise(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Instagram handle is required");
        }
        String stripped = stripLeadingAt(raw.trim());
        if (!HANDLE_PATTERN.matcher(stripped).matches()) {
            throw new IllegalArgumentException("Invalid Instagram handle");
        }
        return stripped.toLowerCase();
    }

    private static String stripLeadingAt(String raw) {
        return raw.startsWith("@") ? raw.substring(1) : raw;
    }
}
