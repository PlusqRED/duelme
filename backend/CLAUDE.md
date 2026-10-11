# Backend (`backend/`)

Rules for the Spring Boot API. The root `CLAUDE.md` applies here too.

## Architecture

- Java 25 + Spring Boot 4.0.3, Gradle 9.4 (Kotlin DSL), MongoDB (Spring Data with auditing)
- Privy JWT auth via JWKS — wallet address from `linked_accounts` claim
- Flapdoodle embedded MongoDB for tests — no external DB in CI
- GraalVM Native Image via `org.graalvm.buildtools.native`; JDK 25 (Compact Object Headers, Generational ZGC, Virtual Threads)
- `NativeImageHints.java` registers reflection hints for `nimbus-jose-jwt`

## Native Image

Why it matters and which CI job is the gate: "Native Image Compatibility" in the root `CLAUDE.md`.

### What commonly breaks

- **Reflection without hints** (`Class.forName`, `Method.invoke`, JSON/JWT libs) — register in `backend/src/main/java/pro/duelme/backend/config/NativeImageHints.java` (see `nimbus-jose-jwt` entries).
- **Static initializers touching I/O / network / randomness / runtime class graphs.** GraalVM runs `<clinit>` at build time by default. If a class must defer, add `--initialize-at-run-time=fqcn` to `graalvmNative.binaries.named("main").buildArgs` in `backend/build.gradle.kts` (see Bouncy Castle DRBG).
- **Runtime classpath / resource scanning** (`getResources("META-INF/services/...")`, codegen libs) — needs explicit resource hints.
- **New dependencies** — check the [GraalVM Reachability Metadata Repository](https://www.graalvm.org/native-image/libraries-and-frameworks/) first. Heavy crypto / serialization / dynamic-proxy libs usually need explicit `--initialize-at-build-time` settings (e.g. `web3j`, `bouncycastle`).

### Before merging to main, verify locally

```bash
cd backend
./gradlew nativeCompile                       # ~5-10 min
./build/native/nativeCompile/duelme-backend   # smoke-test boot
```

If it fails, fix it. **Never** silence failure by deleting hints, weakening build-time init, dropping the `backend-native` job, or merging anyway.

## Standards (Java / Spring Boot / MongoDB)

**Layer separation:**
- **Controller**: HTTP mapping / validation / response shaping only. ≤50 lines/method. No business logic.
- **Service**: business logic, authorization, transaction boundaries. Controllers never call repositories directly.
- **Repository**: data access only.
- **DTO**: separate request/response records. Never expose Mongo documents. Never reuse the same record for request and response.
- **Exception**: domain-specific, handled in `GlobalExceptionHandler`. Never catch generic `Exception`.
- No circular service dependencies — extract shared logic into a third service.

**Records & immutability:** `record` for all DTOs, value objects, Mongo documents. No setters/mutables. Compact constructor for validation. Constructor injection only (no `@Autowired` on fields, single constructor). No Lombok. `var` when type is obvious.

**Validation:** `@Valid` on `@RequestBody`. `@Validated` on controller class + `@NotBlank` / `@Size` on `@RequestParam` / `@PathVariable`. Wallet addresses always `.toLowerCase()` at service boundary. Max-length on all user string inputs.

**Exceptions:** domain exceptions extend `RuntimeException`. `GlobalExceptionHandler` maps `*NotFoundException` → 404, `NotAuthorizedException` → 403, `ConstraintViolationException` / `MethodArgumentNotValidException` → 400. Never return stack traces in API responses.

**Security:** all mutating endpoints require `@AuthenticationPrincipal`. Authorization checks in service layer (verify ownership). No default values for secrets in `application.yml` — all via env vars from GitHub secrets. Consider rate-limiting batch endpoints.

**API documentation (MANDATORY)** — every endpoint needs OpenAPI annotations.

When **adding** an endpoint:
1. `@Tag(name, description)` on controller class
2. `@Operation(summary)` on method
3. `security = @SecurityRequirement(name = "bearer")` if authenticated
4. `@ApiResponses` with all relevant codes (200, 400, 401, 403, 404)
5. `@Parameter(hidden = true)` on `@AuthenticationPrincipal`
6. Register in `SecurityConfig.java` with `.permitAll()` / `.authenticated()`

When **modifying**: update `@Operation`, security annotations, and `SecurityConfig`.

OpenAPI config: `backend/src/.../config/OpenApiConfig.java`. Swagger UI at `/api/v1/swagger-ui` on each env.

## Testing

**Backend (JUnit 5 + Spring Boot Test):** `@SpringBootTest` + `@AutoConfigureMockMvc` + embedded MongoDB. Controller via `MockMvc` (status / shape / auth). Service for logic / auth / edges. `WalletAuthenticationToken` for auth simulation. `@BeforeEach` cleanup for isolation.

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/.../controller/ProfileController.java` | Profile CRUD endpoints |
| `backend/src/.../security/PrivyJwksService.java` | Privy JWT verification via JWKS |
| `backend/src/.../security/PrivyJwtAuthenticationFilter.java` | Bearer token → wallet auth filter |
| `backend/src/.../exception/GlobalExceptionHandler.java` | Centralized error handling (404, 403, 400) |
| `backend/src/.../model/Profile.java` | MongoDB profile document (record) |
| `backend/src/.../controller/SocialLinkController.java` | Social-link endpoints `/profiles/me/social/**` |
| `backend/src/.../service/SocialLinkService.java` | Social-link orchestrator (Steam, Telegram, Instagram) |
| `backend/src/.../service/TelegramJwksService.java` | Verifies Telegram OIDC ID tokens via cached JWKS |
| `backend/src/.../service/TelegramOidcService.java` | Telegram OIDC auth URL + token exchange (PKCE S256) |
| `backend/src/.../service/SteamOpenIdService.java` | Steam OpenID 2.0 login + `check_authentication` |
| `backend/src/.../service/SocialLinkStateService.java` | Server-side OAuth state store (wallet + PKCE verifier, TTL-indexed in Mongo) |
| `backend/src/.../model/DuelMeta.java` | Duel → game metadata document. Keyed `{contractAddress, duelId, chainId}` — see the duel-id bullet under Common Pitfalls in the root `CLAUDE.md` |
| `backend/src/.../service/DuelMetaService.java` | Owns the creator check and normalises both addresses; every lookup is scoped to one deployment, and writes are accepted only for the live one |
| `backend/src/.../config/MongoConfig.java` | **Creates every index explicitly.** Spring Boot does not auto-create `@Indexed` / `@CompoundIndex` — see Common Pitfalls |
| `backend/src/.../config/ContractProperties.java` | `duelme.contracts.duel-me` — the live DuelMe per chain, the backend's mirror of `constants.ts` |
| `backend/src/.../validation/EvmAddress.java` | The one address regex, shared by the `@Pattern` annotations and the runtime checks |
| `backend/Dockerfile` | Backend container (multi-stage, GraalVM native) |

## Environment

- `PRIVY_APP_ID` — Privy app ID (backend JWT verification)
- `MONGODB_URI` — Mongo connection (default `mongodb://localhost:27017/duelme`). Spring Boot 4 property: `spring.mongodb.uri` (not `spring.data.mongodb.uri`).
- `FAUCET_ENABLED` / `FAUCET_PRIVATE_KEY` — dev-only testnet dispenser (ETH + MockUSDT). The token it hands out is **not** an env var: `duelme.faucet.mock-usdt-address` in `application.yml` is a literal, deliberately with no `${…}` escape hatch, and pinned to the broadcast artifact by `deployedAddresses.test.ts`. A redeploy edits it in the same commit as `constants.ts`. **Keep it quoted** — YAML reads a bare `0x…` as a hex integer, Spring binds the decimal form, and `FaucetService` rejects it at startup, taking the whole backend down rather than just the faucet. Prod pins `FAUCET_ENABLED: "false"` in `ops/docker-compose.prod.yml` regardless of `.env`.
- `APP_BASE_URL` — backend's view of frontend origin for OAuth redirects (`https://dev.duelme.pro` / `https://duelme.pro`)
- `STEAM_API_KEY` — optional; enables username/avatar enrichment via `GetPlayerSummaries`
- `STEAM_RETURN_URL` — absolute Steam callback URL (`https://{env}/api/v1/profiles/me/social/steam/callback`)
- `TELEGRAM_CLIENT_ID` / `TELEGRAM_CLIENT_SECRET` — OIDC creds from @BotFather → Bot Settings → Web Login
- `TELEGRAM_RETURN_URL` — absolute Telegram callback URL; must match @BotFather-registered URL
- `TELEGRAM_ISSUER` — defaults to `https://oauth.telegram.org`

## Common Pitfalls

- **A Spring Data index annotation does nothing unless `MongoConfig` creates it.** Spring Boot 3+
  stopped auto-creating indexes declared with `@Indexed` / `@CompoundIndex`, and
  `spring.data.mongodb.auto-index-creation` is deliberately unset — so `unique = true` on a
  document is documentation, not a constraint. Nothing fails loudly: the `DuplicateKeyException`
  branch that was meant to catch the collision simply becomes unreachable, two concurrent writes
  leave two rows, and the *next* read of that key dies with
  `IncorrectResultSizeDataAccessException` — a permanent 500 on one entity, long after the write.
  Every index gets an explicit `ApplicationRunner` in
  `backend/src/.../config/MongoConfig.java`; `createIndex` is idempotent, so it runs on every boot.
  Name the index the same in both places — a second spelling of one key is not a second index,
  it is an `IndexOptionsConflict` thrown out of a runner, which takes the boot down with it.
  `MongoIndexTest` proves this for `duelMeta`, `games` and `faucet_claims` by inserting an actual
  duplicate; the `Profile` constraints are created by the same mechanism and are **not** yet
  covered, so do not read a green suite as "every unique index is enforced".
- **The duel-id rule (root `CLAUDE.md`, Common Pitfalls) covers the MockUSDT a redeploy replaces too.** `FaucetClaim` was keyed by wallet
  alone, so after a redeploy every past claimant got `FaucetAlreadyClaimedException` against a
  token they had drawn nothing from — the dev faucet went dead for the people already testing,
  and silently, since the wallet got the ordinary "already claimed" answer. `tokenAddress` is now
  part of that key. Anything keyed on a wallet plus a contract-issued thing needs the contract in
  the key.
- `PRIVY_APP_ID` env required for backend (no default in `application.yml`).
