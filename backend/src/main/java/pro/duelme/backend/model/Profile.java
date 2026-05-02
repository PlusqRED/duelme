package pro.duelme.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document("profiles")
public record Profile(
    @Id String id,
    @Indexed(unique = true) String walletAddress,
    String nickname,
    String status,
    String firstName,
    String lastName,
    String gender,
    String aboutMe,
    List<String> games,
    SocialLinks socialLinks,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {}
