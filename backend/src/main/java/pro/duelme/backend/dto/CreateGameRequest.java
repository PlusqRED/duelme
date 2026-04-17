package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pro.duelme.backend.model.GameCategory;

public record CreateGameRequest(
    @NotBlank @Size(min = 1, max = 50) String name,
    @NotNull GameCategory category
) {}
