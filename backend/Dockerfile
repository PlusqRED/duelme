# Two thin runtime images. Build artifacts are produced on the CI host
# (Gradle with full GHA cache) and copied in via the build context.
# CI selects per branch via docker/build-push-action `target:` input in ci.yml.
#   target=jvm    — fat JAR (eclipse-temurin:25-jre), used for dev
#   target=native — GraalVM native binary (ubuntu:26.04), used for prod
#
# Local docker build:
#   target=jvm    — `cd backend && ./gradlew bootJar -Pskip.aot=true && docker build --target jvm -t duelme-backend:local .`
#   target=native — `cd backend && ./gradlew nativeCompile && docker build --target native -t duelme-backend:local .`
# (You generally don't need to docker-build locally — `./gradlew bootRun` is faster for iteration.)

FROM eclipse-temurin:25-jre AS jvm

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app

WORKDIR /app
COPY --chown=app:app build/libs/*-SNAPSHOT.jar /app/app.jar

USER app
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", \
    "-XX:+UseCompactObjectHeaders", \
    "-XX:+UseZGC", \
    "-XX:MaxRAMPercentage=75", \
    "-jar", "/app/app.jar"]


FROM ubuntu:26.04 AS native

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app

WORKDIR /app
COPY --chown=app:app build/native/nativeCompile/duelme-backend ./duelme-backend

USER app
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["./duelme-backend"]
