plugins {
    java
    id("org.springframework.boot") version "4.0.3"
    id("org.graalvm.buildtools.native") version "0.11.5"
}

group = "pro.duelme"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform(org.springframework.boot.gradle.plugin.SpringBootPlugin.BOM_COORDINATES))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.nimbusds:nimbus-jose-jwt:10.0.1")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.2")
    // web3j powers the dev-only testnet faucet (signing + JSON-RPC). Kept in core
    // deps so JVM + native builds both work; the service bean only initializes
    // when `duelme.faucet.enabled=true`, so prod never opens RPC connections.
    implementation("org.web3j:core:4.12.2")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("de.flapdoodle.embed:de.flapdoodle.embed.mongo.spring4x:4.24.0")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// ---------------------------------------------------------------------------
// JVM mode: optimization flags applied via bootRun (local development)
// ---------------------------------------------------------------------------
val jvmOptFlags = listOf(
    // Compact Object Headers (Project Lilliput, JEP 519) — shrinks every
    // object header from 12 → 8 bytes, improving cache locality and reducing
    // GC pressure.  Product feature since JDK 25.
    "-XX:+UseCompactObjectHeaders",

    // Generational ZGC — sub-millisecond GC pauses regardless of heap size.
    // Non-generational mode was removed in JDK 24 (JEP 490); this flag
    // selects the only remaining (generational) implementation.
    "-XX:+UseZGC",
)

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    jvmArgs = jvmOptFlags
}

// Skip AOT processing for Docker/JVM builds (AOT bakes property defaults at
// build time, preventing runtime overrides like MONGODB_URI in containers).
// Native image builds still use AOT via nativeCompile.
if (project.hasProperty("skip.aot")) {
    tasks.named("processAot") { enabled = false }
    tasks.named("compileAotJava") { enabled = false }
    tasks.named("processAotResources") { enabled = false }
    tasks.named("processTestAot") { enabled = false }
    tasks.named("compileAotTestJava") { enabled = false }
    tasks.named("processAotTestResources") { enabled = false }
}

// ---------------------------------------------------------------------------
// Native image configuration
// ---------------------------------------------------------------------------
graalvmNative {
    binaries {
        named("main") {
            buildArgs.addAll(
                "-O2",
                "--gc=serial",
                "-march=compatibility",
            )
        }
        named("test") {
            buildArgs.addAll(
                "-O0",
                "--gc=serial",
            )
        }
    }
}
