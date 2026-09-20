#!/usr/bin/env bash
#
# Everything that has to happen after `forge script script/Deploy.s.sol` and is not
# already enforced by CI.
#
# Address syncing is not here on purpose: deployedAddresses.test.ts pins constants.ts
# and application.yml to the broadcast artifact, so a mismatch fails the build. The two
# steps below are the ones nothing checks, and both were missed by the 2026-09-20 deploy.
#
#   1. Verification. Arbiscan auto-matches any contract whose bytecode it has seen before,
#      so MockUSDT and the forwarder usually come back instantly and only a changed DuelMe
#      needs a real compile. That is the one that sits in the queue — for over an hour on
#      2026-09-20 — long past forge's default retries, which exits non-zero on a deploy
#      that already succeeded and leaves a live but unverified contract.
#
#   2. Testnet state that a redeploy invalidates. Not every collection, and deliberately not
#      faucet_claims any more — see reset_mongo().
#
# Usage: scripts/post_testnet_deploy.sh [--dry-run] [--skip-verify] [--skip-mongo] [--all]
set -euo pipefail

CHAIN_ID=421614
CONTRACTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../contracts" && pwd)"
BROADCAST="$CONTRACTS_DIR/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"
MONGO_CONTAINER=duelme-dev-mongodb-1
DEV_ENV="$HOME/apps/duelme-dev/.env"
API=https://api.etherscan.io/v2/api

DRY_RUN=0; SKIP_VERIFY=0; SKIP_MONGO=0; WIPE_ALL=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)     DRY_RUN=1 ;;
    --skip-verify) SKIP_VERIFY=1 ;;
    --skip-mongo)  SKIP_MONGO=1 ;;
    --all)         WIPE_ALL=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
die() { printf '\033[31mfail: %s\033[0m\n' "$1" >&2; exit 1; }

[ -f "$BROADCAST" ] || die "no broadcast artifact at $BROADCAST"

# The broadcast artifact is the single source of truth, same as deployedAddresses.test.ts.
# DUELME_ARGS comes from the artifact too, rather than being re-derived from Deploy.s.sol:
# editing MIN_WAGER there would otherwise silently produce args the deployed contract was
# never built with, and verification would fail on a contract that is perfectly fine.
read -r FORWARDER USDT DUELME DUELME_ARGS <<<"$(python3 - "$BROADCAST" <<'PY'
import json, sys
tx = json.load(open(sys.argv[1]))['transactions']
created = [t for t in tx if t.get('transactionType') == 'CREATE']
a = {t['contractName']: t['contractAddress'] for t in created}
missing = {'ERC2771Forwarder', 'MockUSDT', 'DuelMe'} - a.keys()
if missing:
    sys.exit(f'broadcast artifact is missing {", ".join(sorted(missing))}')
args = next(t.get('arguments') or [] for t in created if t['contractName'] == 'DuelMe')
if len(args) != 3:
    sys.exit(f'expected 3 DuelMe constructor arguments, artifact has {len(args)}')
print(a['ERC2771Forwarder'], a['MockUSDT'], a['DuelMe'], ','.join(args))
PY
)"
echo "forwarder $FORWARDER"
echo "usdt      $USDT"
echo "duelMe    $DUELME"

verified_name() {  # address -> contract name, empty when unverified
  curl -sS "$API?chainid=$CHAIN_ID&module=contract&action=getsourcecode&address=$1&apikey=$ARBISCAN_API_KEY" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['result'][0].get('ContractName') or '')"
}

verify_all() {
  say "Verification"
  [ -n "${ARBISCAN_API_KEY:-}" ] || die "ARBISCAN_API_KEY is unset — run: set -a && . contracts/.env && set +a"

  local pending=()
  for pair in "ERC2771Forwarder:$FORWARDER" "MockUSDT:$USDT" "DuelMe:$DUELME"; do
    local name="${pair%%:*}" addr="${pair##*:}"
    if [ -n "$(verified_name "$addr")" ]; then
      printf '  %-18s ok\n' "$name"
    else
      printf '  %-18s NOT VERIFIED\n' "$name"
      pending+=("$pair")
    fi
    sleep 0.25
  done
  [ ${#pending[@]} -eq 0 ] && { echo "  all three verified"; return 0; }
  [ "$DRY_RUN" = 1 ] && { echo "  --dry-run: would re-verify ${#pending[@]}"; return 0; }

  # 20 x 15s. The default 5 x 5s is shorter than Arbiscan's queue.
  for pair in "${pending[@]}"; do
    local name="${pair%%:*}" addr="${pair##*:}" args=()
    echo "  re-verifying $name…"
    if [ "$name" = DuelMe ]; then
      IFS=, read -r c_usdt c_min c_fwd <<<"$DUELME_ARGS"
      args=(--constructor-args "$(cast abi-encode 'constructor(address,uint96,address)' \
        "$c_usdt" "$c_min" "$c_fwd")")
    fi
    (cd "$CONTRACTS_DIR" && forge verify-contract --chain-id "$CHAIN_ID" \
      --num-of-optimizations 200 --retries 20 --delay 15 --watch \
      "${args[@]}" "$addr" "$(src_path "$name")") \
      || echo "  warning: $name still not verified — Arbiscan may still be queued, re-run this script"
  done
}

src_path() {
  case "$1" in
    DuelMe)           echo "src/DuelMe.sol:DuelMe" ;;
    MockUSDT)         echo "src/MockUSDT.sol:MockUSDT" ;;
    ERC2771Forwarder) echo "lib/openzeppelin-contracts/contracts/metatx/ERC2771Forwarder.sol:ERC2771Forwarder" ;;
  esac
}

reset_mongo() {
  say "Testnet state"

  # Never let this point at prod. Both checks, because a container can be renamed and an
  # .env can be copied, but the pair being wrong together means the stack is not dev.
  grep -q '^APP_BASE_URL=https://dev\.duelme\.pro$' "$DEV_ENV" 2>/dev/null \
    || die "$DEV_ENV is not the dev stack — refusing to touch any database"
  docker inspect "$MONGO_CONTAINER" >/dev/null 2>&1 \
    || die "container $MONGO_CONTAINER not found"

  # What a redeploy actually invalidates:
  #
  #   duelMeta             rows stay correctly orphaned — the key carries contractAddress for
  #                        exactly this reason — but GameService counts duels per slug without
  #                        filtering on it, so leaving them inflates every game's duelCount.
  #   social_oauth_states  short-lived handshake state; a redeploy is as good a moment as any.
  #
  # faucet_claims is deliberately NOT here any more. It used to be the one collection that had
  # to go: the claim was keyed by wallet alone, so after a MockUSDT redeploy every past claimant
  # hit FaucetAlreadyClaimedException and could never draw the new token. tokenAddress is now
  # part of that key, so a redeploy admits a fresh claim on its own and the rows are worth
  # keeping as the audit trail they are. Clearing them by hand would only hide a regression in
  # that key — if a wallet cannot claim after a redeploy, fix the key, do not wipe the evidence.
  #
  # Kept for the same reason: profiles holds nicknames, social links and DuelRep, none of it
  # contract-bound, and games is a catalog whose counts are derived from duelMeta and so correct
  # themselves once duelMeta is empty. --all clears profiles and games as well.
  local collections=(duelMeta social_oauth_states)
  [ "$WIPE_ALL" = 1 ] && collections+=(profiles games)

  local action='deleteMany'
  [ "$DRY_RUN" = 1 ] && action='countOnly'

  docker exec "$MONGO_CONTAINER" sh -c 'mongosh --quiet \
      -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
      --authenticationDatabase admin duelme --eval '"'"'
    const names = "'"${collections[*]}"'".split(" ");
    const dry = "'"$action"'" === "countOnly";
    names.forEach(c => {
      const before = db.getCollection(c).countDocuments({});
      if (dry) { print("  " + c.padEnd(22) + before + " docs (dry-run)"); return; }
      const n = db.getCollection(c).deleteMany({}).deletedCount;
      print("  " + c.padEnd(22) + "deleted " + n + ", left " + db.getCollection(c).countDocuments({}));
    });
  '"'"''

  # deleteMany, not drop: the collections keep their indexes, so the backend needs no restart
  # to have MongoConfig rebuild them.
}

[ "$SKIP_VERIFY" = 1 ] || verify_all
[ "$SKIP_MONGO" = 1 ]  || reset_mongo
say "Done"
