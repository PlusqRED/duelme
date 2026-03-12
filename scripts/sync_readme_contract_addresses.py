#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "README.md"
RUN_LATEST_PATH = ROOT / "contracts" / "broadcast" / "Deploy.s.sol" / "421614" / "run-latest.json"

START_MARKER = "<!-- CONTRACT_ADDRESSES:START -->"
END_MARKER = "<!-- CONTRACT_ADDRESSES:END -->"
BADGE_BLOCK_END = "</p>"
DEV_NOTE = "> Dev note: run `git config core.hooksPath .githooks` once in your clone to auto-refresh this block on every commit."


def load_contracts() -> list[tuple[str, str]]:
    payload = json.loads(RUN_LATEST_PATH.read_text(encoding="utf-8"))

    contracts: list[tuple[str, str]] = []
    seen_names: set[str] = set()

    for tx in payload.get("transactions", []):
        if tx.get("transactionType") != "CREATE":
            continue

        contract_name = tx.get("contractName")
        contract_address = tx.get("contractAddress")

        if not contract_name or not contract_address or contract_name in seen_names:
            continue

        seen_names.add(contract_name)
        contracts.append((contract_name, contract_address))

    if not contracts:
        raise ValueError(f"No CREATE transactions with contract addresses found in {RUN_LATEST_PATH}")

    return contracts


def render_block(contracts: list[tuple[str, str]]) -> str:
    lines = [
        START_MARKER,
        "## Current deployed contracts",
        "",
        f"_Auto-generated from `{RUN_LATEST_PATH.relative_to(ROOT).as_posix()}`. Updated by `.githooks/pre-commit`._",
        "",
        "| Network | Contract | Address |",
        "|---|---|---|",
    ]

    for contract_name, contract_address in contracts:
        lines.append(f"| Arbitrum Sepolia | `{contract_name}` | `{contract_address}` |")

    lines.extend(["", DEV_NOTE, "", END_MARKER])

    return "\n".join(lines)


def strip_existing_generated_content(readme_text: str) -> str:
    updated = readme_text

    if START_MARKER in updated and END_MARKER in updated:
        start_index = updated.index(START_MARKER)
        end_index = updated.index(END_MARKER) + len(END_MARKER)
        updated = updated[:start_index] + updated[end_index:]

    updated = updated.replace(f"\n\n{DEV_NOTE}\n", "\n")
    updated = updated.replace(f"{DEV_NOTE}\n\n", "")
    updated = updated.replace(f"\n{DEV_NOTE}\n", "\n")

    return updated


def update_readme(readme_text: str, generated_block: str) -> str:
    cleaned_readme = strip_existing_generated_content(readme_text).lstrip()

    if BADGE_BLOCK_END in cleaned_readme:
        badge_end = cleaned_readme.index(BADGE_BLOCK_END) + len(BADGE_BLOCK_END)
        before = cleaned_readme[:badge_end].rstrip()
        after = cleaned_readme[badge_end:].lstrip("\n")
        updated = f"{before}\n\n{generated_block}\n\n{after}"
    else:
        updated = f"{generated_block}\n\n{cleaned_readme.lstrip()}"

    return f"{updated.rstrip()}\n"


def main() -> None:
    contracts = load_contracts()
    generated_block = render_block(contracts)
    current_readme = README_PATH.read_text(encoding="utf-8")
    updated_readme = update_readme(current_readme, generated_block)

    if updated_readme != current_readme:
        README_PATH.write_text(updated_readme, encoding="utf-8")


if __name__ == "__main__":
    main()
