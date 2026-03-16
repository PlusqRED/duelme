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

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("de.flapdoodle.embed:de.flapdoodle.embed.mongo.spring4x:4.24.0")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// ---------------------------------------------------------------------------
// JVM mode: optimization flags applied via bootRun (and systemd ExecStart)
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
