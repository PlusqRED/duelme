#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "README.md"
RUN_LATEST_PATH = ROOT / "contracts" / "broadcast" / "Deploy.s.sol" / "421614" / "run-latest.json"

START_MARKER = "<!-- CONTRACT_ADDRESSES:START -->"
END_MARKER = "<!-- CONTRACT_ADDRESSES:END -->"


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

    lines.extend(["", END_MARKER])

    return "\n".join(lines)


def update_readme(readme_text: str, generated_block: str) -> str:
    if START_MARKER in readme_text and END_MARKER in readme_text:
        start_index = readme_text.index(START_MARKER)
        end_index = readme_text.index(END_MARKER) + len(END_MARKER)
        updated = readme_text[:start_index] + generated_block + readme_text[end_index:]
    else:
        updated = f"{generated_block}\n\n{readme_text.lstrip()}"

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
