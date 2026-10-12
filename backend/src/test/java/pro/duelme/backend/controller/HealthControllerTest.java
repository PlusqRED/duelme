package pro.duelme.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.dto.HealthResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {"APP_ENV=dev", "APP_RELEASE=abc"})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthReportsTheEnvironmentAndRelease() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.environment").value("dev"))
            .andExpect(jsonPath("$.release").value("abc"));
    }

    @Test
    void healthReportsUnknownForUnsetOrBlankValues() {
        HealthResponse response = new HealthController(null, " ").health();

        assertThat(response.environment()).isEqualTo("unknown");
        assertThat(response.release()).isEqualTo("unknown");
    }
}
