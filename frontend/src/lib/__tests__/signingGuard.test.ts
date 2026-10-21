import { posix } from 'node:path';
import ts from 'typescript';
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
  'hooks/useDuelPermit.ts',
  'hooks/useWriteWithGas.ts',
  'lib/forwardRequest.ts',
  'lib/permitSignature.ts',
  'lib/resilientBroadcast.ts',
];

/**
 * Who takes the signing code, by module, up to the flows behind the windows: `useActionFlow`,
 * `useCreateDuelFlow` and `useJoinDuelFlow` feed the signing window, `SendView` holds `SendReview`.
 * Type-only imports run nothing and are left out.
 */
const SIGNING_CHAIN: Record<string, string[]> = {
  'hooks/useDuelActions': ['hooks/useActionFlow.ts', 'hooks/useCreateDuelFlow.ts', 'hooks/useJoinDuelFlow.ts'],
  'hooks/useDuelPermit': ['hooks/useDuelActions.ts'],
  'hooks/useSendUsdt': ['components/header/SendView.tsx'],
  'hooks/useWriteWithGas': ['hooks/useDuelActions.ts', 'hooks/useSendUsdt.ts'],
  'lib/forwardRequest': ['hooks/useWriteWithGas.ts'],
  // `flowError` takes an error class only.
  'lib/permitSignature': ['hooks/useDuelPermit.ts', 'lib/flowError.ts'],
  'lib/resilientBroadcast': ['hooks/useWriteWithGas.ts'],
};

/** A name that makes a wallet sign or send, or that hands out a wallet, or its provider, to ask. */
const ASKING_NAMES =
  /^(?:(?:sign(?:TypedData|Transaction|Message|Authorization)|send(?:Transaction|Calls)|(?:write|deploy)Contract)(?:Async)?|use(?:WriteContract|DeployContract|SendTransaction|SendCalls|SignTypedData|SignMessage|SignTransaction|SignAuthorization|Sign7702Authorization|WalletClient|ConnectorClient)|get(?:WalletClient|ConnectorClient|EthereumProvider))$/;

/** The provider methods that ask the wallet, for a request made to the provider itself. */
const ASKING_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
]);

function parse(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

/** The asking names and methods in a file's code; comments are not code, so they never count. */
function asks(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isIdentifier(node) && ASKING_NAMES.test(node.text)) || (ts.isStringLiteralLike(node) && ASKING_METHODS.has(node.text))) {
      found.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The modules under `src/` a file imports, or passes on, for a value, not only for types. */
function valueImports(source: ts.SourceFile): string[] {
  return source.statements.flatMap((statement) => {
    const isImport = ts.isImportDeclaration(statement);
    if (!(isImport || ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) return [];
    if (isImport ? isTypeOnlyImport(statement.importClause) : statement.isTypeOnly) return [];
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('@/')) return [specifier.slice(2)];
    return specifier.startsWith('.') ? [posix.join(posix.dirname(source.fileName), specifier)] : [];
  });
}

function isTypeOnlyImport(clause: ts.ImportClause | undefined): boolean {
  if (clause === undefined) return false;
  const bindings = clause.namedBindings;
  return clause.isTypeOnly || (!clause.name && bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.every((element) => element.isTypeOnly));
}

const parsed = sourceFiles(['.ts', '.tsx']).map((file) => ({ path: file.path, source: parse(file.path, file.text) }));

describe('signing guard', () => {
  it.each([
    'walletClient.signTypedData({})',
    'writeContract(config)',
    'await writeContractAsync?.(config)',
    'useSendTransaction()',
    'const { signMessage } = useSignMessage();',
    'useWalletClient<Config>()',
    'const provider = await wallet.getEthereumProvider();',
    "provider.request({ method: 'eth_signTypedData_v4', params })",
  ])('sees a wallet asked to sign in %s', (text) => {
    expect(asks(parse('probe.ts', text))).not.toEqual([]);
  });

  it.each([
    '// writeContract(config) once ran here',
    '/* eth_sendTransaction as sign + broadcast */',
    "const tab = '#writeContract';",
    'publicClient.sendRawTransaction({ serializedTransaction })',
    "const label = 'signMessage';",
  ])('sees no wallet asked to sign in %s', (text) => {
    expect(asks(parse('probe.ts', text))).toEqual([]);
  });

  it('reads a type-only import as running nothing', () => {
    const source = parse('probe.ts', "import type { A } from '@/a';\nimport { type B } from '@/b';\nimport { c, type D } from '@/c';");

    expect(valueImports(source)).toEqual(['c']);
  });

  it('follows a relative import and a re-export to the module under src', () => {
    const source = parse('hooks/probe.ts', "import { a } from '../lib/a';\nexport { b } from './b';\nexport type { C } from '@/c';");

    expect(valueImports(source)).toEqual(['lib/a', 'hooks/b']);
  });

  it('asks a wallet to sign only from the files that show what is signed first', () => {
    const asking = parsed
      .filter((file) => asks(file.source).length > 0)
      .map((file) => file.path)
      .sort();

    expect(asking).toEqual(SIGNING_FILES);
  });

  it('hands the signing code only to the flows behind the signing window and SendReview', () => {
    const takers = Object.fromEntries(
      Object.keys(SIGNING_CHAIN).map((module) => [
        module,
        parsed
          .filter((file) => valueImports(file.source).includes(module))
          .map((file) => file.path)
          .sort(),
      ])
    );

    expect(takers).toEqual(SIGNING_CHAIN);
  });
});
