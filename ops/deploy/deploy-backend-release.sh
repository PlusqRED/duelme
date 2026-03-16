#!/usr/bin/env bash

set -euo pipefail
umask 027

ARTIFACT_PATH="${1:?Usage: deploy-backend-release.sh <artifact-path> <release-id> <expected-sha256> <service-template-path>}"
RELEASE_ID="${2:?Usage: deploy-backend-release.sh <artifact-path> <release-id> <expected-sha256> <service-template-path>}"
EXPECTED_SHA256="${3:?Usage: deploy-backend-release.sh <artifact-path> <release-id> <expected-sha256> <service-template-path>}"
UNIT_TEMPLATE_PATH="${4:?Usage: deploy-backend-release.sh <artifact-path> <release-id> <expected-sha256> <service-template-path>}"

APP_ROOT="${APP_ROOT:-$HOME/apps/duelme-backend-dev}"
SERVICE_NAME="${SERVICE_NAME:-duelme-backend-dev.service}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:8080/api/v1/health}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

INCOMING_DIR="$APP_ROOT/incoming"
RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
ENV_FILE="$SHARED_DIR/app.env"
CURRENT_LINK="$APP_ROOT/current"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_DEST="$UNIT_DIR/$SERVICE_NAME"

mkdir -p "$INCOMING_DIR" "$RELEASES_DIR" "$SHARED_DIR" "$UNIT_DIR"

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "Artifact not found: $ARTIFACT_PATH" >&2
  exit 1
fi

if [[ ! -f "$UNIT_TEMPLATE_PATH" ]]; then
  echo "Service template not found: $UNIT_TEMPLATE_PATH" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required on the deployment host." >&2
  exit 1
fi

ACTUAL_SHA256="$(sha256sum "$ARTIFACT_PATH" | awk '{print $1}')"

if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Artifact checksum mismatch." >&2
  echo "Expected: $EXPECTED_SHA256" >&2
  echo "Actual:   $ACTUAL_SHA256" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<'EOF'
MONGODB_URI=mongodb://localhost:27017/duelme
PRIVY_APP_ID=
APP_ENV=dev
EOF
  chmod 600 "$ENV_FILE"
fi

ENV_BACKUP_FILE="$(mktemp)"
cp "$ENV_FILE" "$ENV_BACKUP_FILE"

TMP_ENV_FILE="$(mktemp)"
grep -v '^APP_RELEASE=' "$ENV_FILE" >"$TMP_ENV_FILE" || true
printf 'APP_RELEASE=%s\n' "$RELEASE_ID" >>"$TMP_ENV_FILE"
mv "$TMP_ENV_FILE" "$ENV_FILE"
chmod 600 "$ENV_FILE"

RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
PREVIOUS_RELEASE=""

if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
fi

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Detect artifact type by extension: .jar → JVM mode, otherwise → native
if [[ "$ARTIFACT_PATH" == *.jar ]]; then
  cp "$ARTIFACT_PATH" "$RELEASE_DIR/app.jar"
else
  cp "$ARTIFACT_PATH" "$RELEASE_DIR/duelme-backend"
  chmod +x "$RELEASE_DIR/duelme-backend"
fi

install -Dm0644 "$UNIT_TEMPLATE_PATH" "$UNIT_DEST"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"

if ! systemctl --user show-environment >/dev/null 2>&1; then
  echo "systemd --user is not available for this session. Ensure the user manager is active or enable linger." >&2
  exit 1
fi

PENDING_LINK="$APP_ROOT/current.new"
ln -sfn "$RELEASE_DIR" "$PENDING_LINK"
mv -Tf "$PENDING_LINK" "$CURRENT_LINK"

systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME" >/dev/null
systemctl --user restart "$SERVICE_NAME"

HEALTH_OK=0

for _ in {1..30}; do
  if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
    HEALTH_OK=1
    break
  fi

  sleep 2
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "Health check failed after restarting $SERVICE_NAME." >&2

  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    cp "$ENV_BACKUP_FILE" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ln -sfn "$PREVIOUS_RELEASE" "$PENDING_LINK"
    mv -Tf "$PENDING_LINK" "$CURRENT_LINK"
    systemctl --user restart "$SERVICE_NAME"
  fi

  systemctl --user --no-pager status "$SERVICE_NAME" --lines=50 || true
  exit 1
fi

rm -f "$ARTIFACT_PATH" "$UNIT_TEMPLATE_PATH"
rm -f "$ENV_BACKUP_FILE"

if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  CURRENT_RELEASE="$(readlink -f "$CURRENT_LINK")"
  mapfile -t RELEASE_CANDIDATES < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true)

  if (( ${#RELEASE_CANDIDATES[@]} > KEEP_RELEASES )); then
    for OLD_RELEASE in "${RELEASE_CANDIDATES[@]:KEEP_RELEASES}"; do
      if [[ "$OLD_RELEASE" != "$CURRENT_RELEASE" ]]; then
        rm -rf -- "$OLD_RELEASE"
      fi
    done
  fi
fi

echo "Backend release $RELEASE_ID deployed successfully to $APP_ROOT."
