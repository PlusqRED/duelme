package pro.duelme.backend.dto;

import java.time.Instant;
import java.util.List;

public record ProfileResponse(
    String walletAddress,
    String nickname,
    String status,
    String firstName,
    String lastName,
    String gender,
    String aboutMe,
    List<String> games,
    Instant createdAt,
    Instant updatedAt
) {}
