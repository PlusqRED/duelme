package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for linking a self-reported Instagram handle. The
 * leading {@code @} is allowed (and stripped at the service layer);
 * the regex validator is applied after the strip.
 */
public record InstagramLinkRequest(
    @NotBlank @Size(max = 31) String handle
) {}
