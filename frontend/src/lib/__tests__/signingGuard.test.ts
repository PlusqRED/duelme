import { describe, expect, it } from 'vitest';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';

/**
 * The only files that ask a wallet to sign or send. The in-app wallet shows no prompt of its own
 * (`showWalletUIs: false` in `Providers.tsx`), so each of these is reached only from a window that
 * has shown what is signed and taken the press: the signing window for duel writes, `SendReview`
 * for sending USDT out. A new one needs such a window before it joins the list.
 */
const SIGNING_FILES = [
  // The relayer's own key, on the server: no player's wallet.
  'app/api/relay/route.ts',
  'hooks/useWriteWithGas.ts',
  'lib/forwardRequest.ts',
  'lib/permitSignature.ts',
  'lib/resilientBroadcast.ts',
];

/** A call that makes a wallet sign or send, or a hook that hands one out. */
const ASKS_WALLET =
  /\b(?:signTypedData|signTransaction|signMessage|sendTransaction|writeContract|writeContractAsync)\(|\buse(?:WriteContract|SendTransaction|SignTypedData|SignMessage|SignTransaction)\b/;

describe('signing guard', () => {
  it.each(['walletClient.signTypedData({', 'writeContract(config)', 'useSendTransaction()', 'const { signMessage } = useSignMessage();'])(
    'sees a wallet asked to sign in %s',
    (text) => {
      expect(ASKS_WALLET.test(text)).toBe(true);
    }
  );

  it.each(['eth_sendTransaction as sign + broadcast', "tab: '#writeContract'", 'publicClient.sendRawTransaction({'])(
    'sees no wallet asked to sign in %s',
    (text) => {
      expect(ASKS_WALLET.test(text)).toBe(false);
    }
  );

  it('asks a wallet to sign only from the files that show what is signed first', () => {
    const asking = sourceFiles(['.ts', '.tsx'])
      .filter((file) => ASKS_WALLET.test(file.text))
      .map((file) => file.path)
      .sort();

    expect(asking).toEqual(SIGNING_FILES);
  });
});
