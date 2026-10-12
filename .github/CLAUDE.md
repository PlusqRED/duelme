# CI and repository settings (`.github/`)

CI jobs, deploys and the `backend-native` gate: `ops/CLAUDE.md` and "Native Image Compatibility" in the
root `CLAUDE.md`. Rules a workflow edit can break live with the code they protect: the frontend build
without a Privy app id, the npm pin and Dependabot's `overrides` gap in `frontend/CLAUDE.md`; the fork
suite in `contracts/CLAUDE.md`. The PR template is described under "Git Conventions" in the root.
