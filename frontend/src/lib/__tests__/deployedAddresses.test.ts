import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUELME_ADDRESSES, FORWARDER_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';

/**
 * The broadcast artifact is the single source of truth for what is actually deployed
 * (CLAUDE.md says so), and every other copy is a hand-made mirror of it. These tests fail
 * the build when a mirror drifts — which is the failure mode a redeploy produces, and it
 * surfaces in the product as an unexplained revert rather than as anything address-shaped.
 *
 * Only mirrors that cannot import `constants.ts` belong here. Anything inside the frontend
 * should read `SUPPORTED_CHAINS` / `DUELME_ADDRESSES` directly instead of being asserted.
 */
const REPO = join(__dirname, '../../../..');

function deployedContracts(script: string, chainId: number): Record<string, string> {
  const path = join(REPO, 'contracts/broadcast', script, String(chainId), 'run-latest.json');
  const payload = JSON.parse(readFileSync(path, 'utf8')) as {
    transactions: { transactionType: string; contractName?: string; contractAddress?: string }[];
  };

  const deployed: Record<string, string> = {};
  for (const tx of payload.transactions) {
    if (tx.transactionType === 'CREATE' && tx.contractName && tx.contractAddress) {
      deployed[tx.contractName] ??= tx.contractAddress.toLowerCase();
    }
  }
  return deployed;
}

const sepolia = deployedContracts('Deploy.s.sol', SUPPORTED_CHAINS.arbitrumSepolia.id);
const mainnet = deployedContracts('DeployMainnet.s.sol', SUPPORTED_CHAINS.arbitrum.id);

const DEPLOYED_BY_CHAIN_ID: Record<number, Record<string, string>> = {
  [SUPPORTED_CHAINS.arbitrumSepolia.id]: sepolia,
  [SUPPORTED_CHAINS.arbitrum.id]: mainnet,
};

describe('constants.ts mirrors the deployed contracts', () => {
  it('points at the deployed DuelMe on both chains', () => {
    // `?.` so a chain missing from the map fails as `undefined` !== the deployed address
    // rather than as a TypeError that names neither.
    expect(DUELME_ADDRESSES[SUPPORTED_CHAINS.arbitrumSepolia.id]?.toLowerCase()).toBe(sepolia.DuelMe);
    expect(DUELME_ADDRESSES[SUPPORTED_CHAINS.arbitrum.id]?.toLowerCase()).toBe(mainnet.DuelMe);
  });

  it('points at the deployed forwarder wherever relaying is enabled', () => {
    for (const [chainId, forwarder] of Object.entries(FORWARDER_ADDRESSES)) {
      // Looked up, not `sepolia : mainnet` — a forwarder on a third chain must fail for
      // having no artifact, not quietly get compared against the mainnet one.
      const deployed = DEPLOYED_BY_CHAIN_ID[Number(chainId)];

      expect(deployed, `no broadcast artifact for chain ${chainId}`).toBeDefined();
      expect(forwarder.toLowerCase(), `forwarder on chain ${chainId}`).toBe(
        deployed?.ERC2771Forwarder
      );
    }
  });

  it('points at the MockUSDT this DuelMe was deployed against', () => {
    // The testnet token is redeployed with DuelMe because the gasless flow needs its
    // EIP-2612 permit. Mainnet USDT is external and has no CREATE to compare against.
    expect(SUPPORTED_CHAINS.arbitrumSepolia.usdt.toLowerCase()).toBe(sepolia.MockUSDT);
  });
});

describe('the backend faucet mirrors the same token', () => {
  it('names the MockUSDT the frontend and DuelMe use, with no env escape hatch', () => {
    const applicationYml = readFileSync(
      join(REPO, 'backend/src/main/resources/application.yml'),
      'utf8'
    );
    const match = applicationYml.match(/^\s*mock-usdt-address:\s*(0x[0-9a-fA-F]{40})\s*$/m);

    expect(match, 'mock-usdt-address default not found in application.yml').not.toBeNull();
    // A stale default hands testers a token DuelMe will not accept, and the symptom is an
    // empty balance rather than a faucet error — so it has to be checked, not trusted.
    expect(match![1].toLowerCase()).toBe(SUPPORTED_CHAINS.arbitrumSepolia.usdt.toLowerCase());
  });
});
