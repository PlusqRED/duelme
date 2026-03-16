package pro.duelme.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ImportRuntimeHints;
import pro.duelme.backend.config.NativeImageHints;

@SpringBootApplication
@ImportRuntimeHints(NativeImageHints.class)
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
