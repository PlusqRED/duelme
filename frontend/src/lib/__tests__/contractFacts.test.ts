import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contractCoverage, CONTRACT_TESTS, EMERGENCY_DELAY_DAYS } from '@/lib/contractFacts';

const TESTS = join(__dirname, '../../../../contracts/test');
const CONTRACT = join(__dirname, '../../../../contracts/src/DuelMe.sol');

function testFunctions(): string[] {
  return readdirSync(TESTS)
    .filter((file) => file.endsWith('.t.sol'))
    .flatMap((file) => [...readFileSync(join(TESTS, file), 'utf8').matchAll(/^\s*function ((?:test|invariant)\w*)\(/gm)])
    .map((match) => match[1]);
}

describe('contract facts', () => {
  it('counts every test the contract has', () => {
    expect(testFunctions()).toHaveLength(CONTRACT_TESTS);
  });

  it('quotes the emergency delay the contract enforces', () => {
    const declared = readFileSync(CONTRACT, 'utf8').match(/MIN_EMERGENCY_DELAY = (\d+) days;/);

    expect(Number(declared?.[1])).toBe(EMERGENCY_DELAY_DAYS);
  });

  it('quotes a coverage that was measured, and when', () => {
    expect(contractCoverage.percent).toBeGreaterThan(90);
    expect(contractCoverage.measuredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
