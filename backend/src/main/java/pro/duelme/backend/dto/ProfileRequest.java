package pro.duelme.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProfileRequest(
    @Size(max = 30) String nickname,
    @Size(max = 140) String status,
    @Size(max = 500) String aboutMe,
    @Size(max = 20) List<@NotBlank @Size(max = 30) String> games
) {}
