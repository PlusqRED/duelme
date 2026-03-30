package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import pro.duelme.backend.model.GameCategory;

public record DuelMetaRequest(
    @NotBlank @Size(max = 50) String gameName,
    @Size(max = 255) @Pattern(regexp = "^https?://.*", message = "must be an HTTP(S) URL") String iconUrl,
    GameCategory category,
    long wagerAmount
) {}
