FROM ghcr.io/graalvm/native-image-community:25 AS build
WORKDIR /build

# Layer 1: Gradle wrapper + build config (rarely changes)
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts gradle.properties ./

# Layer 2: Download dependencies (changes only when build.gradle.kts changes)
RUN --mount=type=cache,target=/root/.gradle/caches \
    ./gradlew dependencies --no-daemon --quiet

# Layer 3: Source code (changes frequently → everything above is cached)
COPY src src

# Layer 4: Native compile (Gradle caches speed up recompilation)
RUN --mount=type=cache,target=/root/.gradle/caches \
    ./gradlew nativeCompile --no-daemon --console=plain

# ---

FROM ubuntu:26.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app

WORKDIR /app
COPY --from=build --chown=app:app /build/build/native/nativeCompile/duelme-backend ./duelme-backend

USER app
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["./duelme-backend"]
