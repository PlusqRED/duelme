# DuelMe Backend

REST API for user profiles, linked to Ethereum wallets via [Privy](https://www.privy.io/) JWT authentication.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 25 (Temurin) |
| Framework | Spring Boot 4.0 + Spring Security |
| Database | MongoDB |
| Auth | Privy JWT (JWKS / ES256) |
| Build | Gradle 9.4 (Kotlin DSL) |
| Native | GraalVM Native Image (optional) |
| Tests | JUnit 5 + Flapdoodle embedded MongoDB |

## Quick Start

```bash
# 1. Start local MongoDB
docker compose up -d

# 2. Run the API (dev profile, port 8080)
./gradlew bootRun --args='--spring.profiles.active=dev'

# 3. Check health
curl http://localhost:8080/api/v1/health
```

## API

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/api/v1/health` | - | Health check |
| `GET` | `/api/v1/profiles/{address}` | - | Get profile by wallet |
| `GET` | `/api/v1/profiles?addresses=0x..,0x..` | - | Batch lookup (max 50) |
| `GET` | `/api/v1/profiles/me` | Bearer | Own profile |
| `PUT` | `/api/v1/profiles/me` | Bearer | Create / update own profile |
| `DELETE` | `/api/v1/profiles/me` | Bearer | Delete own profile |

### Example: create a profile

```bash
curl -X PUT http://localhost:8080/api/v1/profiles/me \
  -H "Authorization: Bearer <privy-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"alice","status":"ready to duel","games":["chess","valorant"]}'
```

### Profile fields

| Field | Type | Max |
|-------|------|-----|
| `nickname` | string | 30 |
| `status` | string | 140 |
| `firstName` | string | 50 |
| `lastName` | string | 50 |
| `gender` | string | 20 |
| `aboutMe` | string | 500 |
| `games` | string[] | 20 items, each 30 |

## Build

### JVM mode (fat JAR)

```bash
./gradlew build          # compile + tests
./gradlew bootJar        # fat JAR → build/libs/duelme-backend-*.jar
java -jar build/libs/duelme-backend-0.0.1-SNAPSHOT.jar
```

### GraalVM Native Image

Produces a self-contained binary: ~50 ms startup, ~60 MB RSS.

```bash
./gradlew nativeCompile  # → build/native/nativeCompile/duelme-backend
./build/native/nativeCompile/duelme-backend
```

> Requires GraalVM JDK 25. The build takes 3-5 min and ~4 GB RAM.

### Native tests

```bash
./gradlew nativeTest     # runs the full test suite inside a native binary
```

## Java 25 Optimizations

The following JDK 25 features are enabled in production:

| Feature | Flag / Config | Effect |
|---------|--------------|--------|
| **Compact Object Headers** (JEP 519, Project Lilliput) | `-XX:+UseCompactObjectHeaders` | Every object shrinks by 4 bytes &rarr; better cache locality, less GC pressure |
| **Generational ZGC** (JEP 490) | `-XX:+UseZGC` | Sub-millisecond GC pauses regardless of heap size |
| **Virtual Threads** (JEP 444) | `spring.threads.virtual.enabled=true` | Each HTTP request runs on a virtual thread &rarr; thousands of concurrent I/O-bound requests with minimal OS threads |
| **Scoped Values** (JEP 506) | Used internally by Spring | Lower overhead than ThreadLocal for request-scoped data |

In native-image mode, GraalVM AOT compilation provides:
- ~50 ms cold start (vs ~2 s on JVM)
- ~60 MB RSS (vs ~200 MB on JVM)
- No JIT warm-up needed
- Serial GC tuned for small services

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/duelme` | MongoDB connection |
| `PRIVY_APP_ID` | *(from app.yml)* | Privy application ID for JWT verification |
| `SERVER_PORT` | `8080` | HTTP listen port |

## Architecture

```
Request → Caddy (TLS) → /api/v1/* → Spring Boot :8080
                       → /*        → Next.js :3001
```

### Auth flow

1. Frontend calls `getAccessToken()` from Privy SDK
2. Request arrives with `Authorization: Bearer <jwt>`
3. `PrivyJwtAuthenticationFilter` verifies the JWT signature via Privy JWKS endpoint
4. Wallet address extracted from the `linked_accounts` claim
5. `@AuthenticationPrincipal String walletAddress` available in controllers

### Project layout

```
src/main/java/pro/duelme/backend/
  config/         SecurityConfig, MongoConfig, WebConfig, NativeImageHints
  security/       PrivyJwksService, JwtFilter, WalletAuthenticationToken
  controller/     ProfileController, HealthController
  service/        ProfileService
  repository/     ProfileRepository (Spring Data MongoDB)
  model/          Profile (record, @Document)
  dto/            ProfileRequest, ProfileResponse
  exception/      GlobalExceptionHandler, ProfileNotFoundException
```

## Testing

```bash
./gradlew test           # all tests (embedded MongoDB, no Docker needed)
./gradlew test --info    # verbose output
```

Tests use Flapdoodle embedded MongoDB — no external database required.

## Deploy

The CI pipeline builds a fat JAR and deploys via SSH:

```
CI → ./gradlew bootJar → scp → deploy-backend-release.sh → systemctl restart
```

The systemd unit (`ops/systemd/user/duelme-backend-dev.service`) applies all JVM optimization flags automatically.
