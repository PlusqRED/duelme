package pro.duelme.backend.config;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The OpenAPI document and Swagger UI are open by default and closed under {@code prod}.
 *
 * <p>Prod expects 401, not just any non-200: on the JVM springdoc drops its endpoints under
 * {@code prod} and they answer 404 with or without {@link SecurityConfig}'s rule, while the
 * native image keeps them and only that rule closes them.
 */
class ApiDocsAccessTest {

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class DefaultProfile {

        @Autowired
        private MockMvc mockMvc;

        @ParameterizedTest
        @ValueSource(strings = {"/api/v1/docs", "/api/v1/docs/swagger-config", "/api/v1/swagger-ui/index.html"})
        void docsPathReturns200(String path) throws Exception {
            mockMvc.perform(get(path)).andExpect(status().isOk());
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles({"test", "prod"})
    class ProdProfile {

        @Autowired
        private MockMvc mockMvc;

        @ParameterizedTest
        @ValueSource(strings = {"/api/v1/docs", "/api/v1/docs/swagger-config", "/api/v1/swagger-ui/index.html"})
        void docsPathReturns401(String path) throws Exception {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }
}
