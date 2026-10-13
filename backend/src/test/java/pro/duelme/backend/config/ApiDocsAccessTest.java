package pro.duelme.backend.config;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.FieldSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.security.WalletAuthenticationToken;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The OpenAPI document and Swagger UI are open by default and closed under {@code prod}.
 *
 * <p>Prod expects 401, not just any non-200: on the JVM springdoc drops its endpoints under
 * {@code prod}, so they would answer 404 even if {@link SecurityConfig} still opened them, while
 * the native image keeps the endpoints and only that rule closes them.
 */
class ApiDocsAccessTest {

    static final List<String> DOCS_PATHS =
        List.of("/api/v1/docs", "/api/v1/docs/swagger-config", "/api/v1/swagger-ui/index.html");

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class DefaultProfile {

        @Autowired
        private MockMvc mockMvc;

        @ParameterizedTest
        @FieldSource("pro.duelme.backend.config.ApiDocsAccessTest#DOCS_PATHS")
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
        @FieldSource("pro.duelme.backend.config.ApiDocsAccessTest#DOCS_PATHS")
        void docsPathReturns401(String path) throws Exception {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        }

        // A signed-in wallet is refused too, so the rule is a deny and not merely authenticated().
        @ParameterizedTest
        @FieldSource("pro.duelme.backend.config.ApiDocsAccessTest#DOCS_PATHS")
        void docsPathReturns403ForSignedInWallet(String path) throws Exception {
            mockMvc.perform(get(path).with(authentication(new WalletAuthenticationToken("0xwallet"))))
                .andExpect(status().isForbidden());
        }
    }

    /** springdoc's master switch alone closes Swagger UI as well, as it does on the JVM. */
    @Nested
    @SpringBootTest(properties = "springdoc.api-docs.enabled=false")
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class ApiDocsSwitchedOff {

        @Autowired
        private MockMvc mockMvc;

        @ParameterizedTest
        @FieldSource("pro.duelme.backend.config.ApiDocsAccessTest#DOCS_PATHS")
        void docsPathReturns401(String path) throws Exception {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }
}
