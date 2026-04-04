# Public Duels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players to create public duels that anyone can find and join, without changing the deployed smart contract.

**Architecture:** A well-known constant `PUBLIC_INVITE_SECRET` is used as the invite secret for public duels. Its keccak256 hash is stored on-chain as `inviteHash`. The frontend detects public duels by comparing `duel.inviteHash === PUBLIC_INVITE_HASH` and auto-injects the secret for join transactions. A new `/duels/open` page lists all joinable public duels.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, wagmi (contract reads/writes), viem, React Query

**Spec:** `docs/superpowers/specs/2026-04-03-public-duels-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/lib/invite.ts` | Modify | Add PUBLIC_INVITE_SECRET, PUBLIC_INVITE_HASH, isPublicDuel(), buildDuelLink() |
| `frontend/src/i18n/translations.ts` | Modify | Add ~15 new translation keys (EN + RU) |
| `frontend/src/components/duel/CreateDuelForm.tsx` | Modify | Add Private/Public toggle with hints |
| `frontend/src/components/duel/ShareLink.tsx` | Modify | Support public duels (clean URL, different hint) |
| `frontend/src/app/duel/[id]/page.tsx` | Modify | Auto-detect public, show Join to all, hide Decline for public, type badge |
| `frontend/src/hooks/useOpenDuels.ts` | Create | Hook to read public Created duels from contract |
| `frontend/src/app/duels/open/page.tsx` | Create | Open duels listing page |
| `frontend/src/app/OpenDuelsSection.tsx` | Create | Landing page preview section |
| `frontend/src/app/page.tsx` | Modify | Add OpenDuelsSection |
| `frontend/src/components/layout/Header.tsx` | Modify | Add Open Duels nav link |

---

### Task 1: Public Duel Utilities

**Files:**
- Modify: `frontend/src/lib/invite.ts`

- [ ] **Step 1: Add public duel constants and helpers**

Add to the end of `frontend/src/lib/invite.ts`:

```typescript
/** Well-known invite secret for public duels — anyone can compute it. */
export const PUBLIC_INVITE_SECRET: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000001';

/** keccak256 hash of PUBLIC_INVITE_SECRET — stored on-chain for public duels. */
export const PUBLIC_INVITE_HASH: `0x${string}` = keccak256(PUBLIC_INVITE_SECRET);

/** Returns true if the duel's inviteHash matches the well-known public hash. */
export function isPublicDuel(inviteHash: `0x${string}`): boolean {
  return inviteHash.toLowerCase() === PUBLIC_INVITE_HASH.toLowerCase();
}

/** Build a shareable link for any duel type. Public duels get a clean URL. */
export function buildDuelLink(duelId: number, inviteHash: `0x${string}`, inviteSecret?: `0x${string}` | null): string {
  if (isPublicDuel(inviteHash)) {
    return `${window.location.origin}/duel/${duelId}`;
  }
  return inviteSecret ? buildInviteLink(duelId, inviteSecret) : `${window.location.origin}/duel/${duelId}`;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
git add frontend/src/lib/invite.ts
git commit -m "feat: add public duel constants and isPublicDuel utility"
```

---

### Task 2: Translations

**Files:**
- Modify: `frontend/src/i18n/translations.ts`

- [ ] **Step 1: Add English translations**

After the `'create.privateInvite'` key (line 102), add:

```typescript
    'create.duelType': 'Duel Type',
    'create.private': 'Private',
    'create.public': 'Public',
    'create.privateHint': 'Only someone with the invite link can join or decline',
    'create.publicHint': 'Anyone can find and join this duel',
```

After the `'duel.privateInviteUnavailable'` key (line 129), add:

```typescript
    'duel.public': 'Public',
    'duel.private': 'Private',
    'duel.sharePublic': 'Share this link — anyone can join',
    'duel.sharePrivate': 'Share this private link — only someone with this link can join',
```

In the nav section (after `'nav.createDuel'`), add:

```typescript
    'nav.openDuels': 'Open Duels',
```

After the hero section keys, add:

```typescript
    'openDuels.title': 'Open Duels',
    'openDuels.subtitle': 'Public challenges waiting for opponents',
    'openDuels.empty': 'No open duels right now. Create one!',
    'openDuels.viewAll': 'View all open duels',
```

- [ ] **Step 2: Add Russian translations**

Mirror all keys above in the `ru` section:

After `'create.privateInvite'`:
```typescript
    'create.duelType': 'Тип дуэли',
    'create.private': 'Приватная',
    'create.public': 'Публичная',
    'create.privateHint': 'Присоединиться может только тот, у кого есть ссылка-приглашение',
    'create.publicHint': 'Любой может найти и принять эту дуэль',
```

After `'duel.privateInviteUnavailable'`:
```typescript
    'duel.public': 'Публичная',
    'duel.private': 'Приватная',
    'duel.sharePublic': 'Поделитесь ссылкой — присоединиться может любой',
    'duel.sharePrivate': 'Поделитесь приватной ссылкой — присоединиться сможет только тот, у кого она есть',
```

After `'nav.createDuel'`:
```typescript
    'nav.openDuels': 'Открытые дуэли',
```

After hero section:
```typescript
    'openDuels.title': 'Открытые дуэли',
    'openDuels.subtitle': 'Публичные вызовы, ожидающие соперников',
    'openDuels.empty': 'Открытых дуэлей пока нет. Создайте первую!',
    'openDuels.viewAll': 'Все открытые дуэли',
```

- [ ] **Step 3: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add frontend/src/i18n/translations.ts
git commit -m "feat: add public duels translation keys (EN + RU)"
```

---

### Task 3: CreateDuelForm — Private/Public Toggle

**Files:**
- Modify: `frontend/src/components/duel/CreateDuelForm.tsx`

- [ ] **Step 1: Add duel type state and import isPublicDuel utilities**

Add to imports:

```typescript
import { generateInviteSecret, hashInviteSecret, storeInviteSecret, PUBLIC_INVITE_SECRET, PUBLIC_INVITE_HASH } from '@/lib/invite';
import { Lock, Globe } from 'lucide-react';
```

Add state after `const [gameName, setGameName] = useState('');`:

```typescript
  const [isPublic, setIsPublic] = useState(false);
```

- [ ] **Step 2: Add toggle UI before the Amount section**

Insert before `{/* Wager section */}` comment, inside the form card div:

```typescript
        {/* Duel type toggle */}
        <div className="flex flex-col gap-3 mb-6">
          <label className="text-sm font-semibold text-slate-700">
            {t('create.duelType')}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                !isPublic
                  ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Lock className="h-4 w-4" />
              {t('create.private')}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                isPublic
                  ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Globe className="h-4 w-4" />
              {t('create.public')}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {isPublic ? t('create.publicHint') : t('create.privateHint')}
          </p>
        </div>
```

- [ ] **Step 3: Update handleCreateDuel to use public secret when public**

Replace the invite secret generation block (the 4 lines starting with `const inviteSecret = generateInviteSecret();`) with:

```typescript
    const inviteSecret = isPublic ? PUBLIC_INVITE_SECRET : generateInviteSecret();
    const inviteHash = isPublic ? PUBLIC_INVITE_HASH : hashInviteSecret(inviteSecret);
    pendingAmount.current = rawAmount;
    pendingInviteSecret.current = isPublic ? null : inviteSecret;
    pendingInviteHash.current = inviteHash;
    pendingMessage.current = message;
```

- [ ] **Step 4: Update post-creation redirect**

In the `useEffect` that handles `isSuccess && step === 'creating'`, update the redirect logic. Replace the block that stores the invite secret and redirects:

```typescript
      if (duelId) {
        if (pendingInviteSecret.current) {
          storeInviteSecret(chainConfig.id, Number(duelId), pendingInviteSecret.current);
        }
        if (gameName.trim() && identityToken) {
          attachGameToDuel(identityToken, Number(duelId), chainConfig.id, gameName.trim()).catch((err) => console.warn('Failed to attach game metadata:', err));
        }
        emitBalanceRefresh();
        appToast.success('toast.duelCreated');
        router.push(
          pendingInviteSecret.current
            ? `/duel/${duelId}#${pendingInviteSecret.current}`
            : `/duel/${duelId}`
        );
```

This block already handles both cases correctly — `pendingInviteSecret.current` is `null` for public duels, so it redirects to `/duel/{id}` without a fragment.

- [ ] **Step 5: Replace the bottom hint text**

Replace the static `{t('create.privateInvite')}` paragraph at the bottom with dynamic text:

```typescript
        <p className="mt-3 text-center text-xs text-slate-500">
          {isPublic ? t('create.publicHint') : t('create.privateInvite')}
        </p>
```

- [ ] **Step 6: Remove unused `Lock` import if not needed, verify compile**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 7: Commit**

```
git add frontend/src/components/duel/CreateDuelForm.tsx
git commit -m "feat: add Private/Public toggle to duel creation form"
```

---

### Task 4: ShareLink — Support Public Duels

**Files:**
- Modify: `frontend/src/components/duel/ShareLink.tsx`

- [ ] **Step 1: Update ShareLink to handle public duels**

Replace the entire component with:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppToast } from '@/hooks/useAppToast';
import { buildDuelLink, isPublicDuel } from '@/lib/invite';
import { Copy, Check } from 'lucide-react';

interface ShareLinkProps {
  duelId: number;
  inviteHash: `0x${string}`;
  inviteSecret: `0x${string}` | null;
}

export function ShareLink({ duelId, inviteHash, inviteSecret }: ShareLinkProps) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const [copied, setCopied] = useState(false);
  const isPublic = isPublicDuel(inviteHash);
  const url =
    typeof window !== 'undefined'
      ? buildDuelLink(duelId, inviteHash, inviteSecret)
      : '';
  const canCopy = isPublic || !!inviteSecret;

  async function handleCopy() {
    if (!url || !canCopy) {
      appToast.error('duel.privateInviteUnavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      appToast.success('action.copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      appToast.error('toast.copyFailed');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">
        {t('action.share')}
      </label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={canCopy ? url : t('duel.privateInviteUnavailable')}
          className="h-10 flex-1 border-slate-300 bg-slate-50 font-mono text-sm"
        />
        <Button
          size="lg"
          variant="outline"
          className="h-10 shrink-0 border-slate-300"
          onClick={handleCopy}
          disabled={!canCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {isPublic
          ? t('duel.sharePublic')
          : inviteSecret
            ? t('duel.sharePrivate')
            : t('duel.privateInviteUnavailable')}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update all ShareLink call sites to pass inviteHash**

In `frontend/src/app/duel/[id]/page.tsx`, find the `<ShareLink` usage and add the `inviteHash` prop:

```typescript
<ShareLink duelId={duelId} inviteHash={duel.inviteHash} inviteSecret={inviteSecret} />
```

- [ ] **Step 3: Verify compile and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add frontend/src/components/duel/ShareLink.tsx frontend/src/app/duel/\\[id\\]/page.tsx
git commit -m "feat: ShareLink supports public duels with clean URLs"
```

---

### Task 5: Duel Detail Page — Public Duel Support

**Files:**
- Modify: `frontend/src/app/duel/[id]/page.tsx`

- [ ] **Step 1: Import public duel utilities**

Add to imports:

```typescript
import { hashInviteSecret, readInviteSecretFromHash, readStoredInviteSecret, storeInviteSecret, isPublicDuel, PUBLIC_INVITE_SECRET } from '@/lib/invite';
import { Globe, Lock } from 'lucide-react';
```

- [ ] **Step 2: Auto-detect public duels and set invite secret**

Find the `useEffect` that reads invite secret from URL hash (the one calling `readInviteSecretFromHash()`). Add a new effect BEFORE it that handles public duels:

```typescript
  // Auto-inject invite secret for public duels
  useEffect(() => {
    if (!duel) return;
    if (isPublicDuel(duel.inviteHash)) {
      setInviteSecret((current) => current === PUBLIC_INVITE_SECRET ? current : PUBLIC_INVITE_SECRET);
    }
  }, [duel]);
```

- [ ] **Step 3: Add type badge in the status header area**

Find where the status badge is rendered (the Badge with STATUS_CONFIG). Add a Public/Private badge next to it:

```typescript
{isPublicDuel(duel.inviteHash) ? (
  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
    <Globe className="h-3 w-3" />
    {t('duel.public')}
  </span>
) : (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
    <Lock className="h-3 w-3" />
    {t('duel.private')}
  </span>
)}
```

- [ ] **Step 4: Update Join/Decline button visibility**

Find the `hasInviteAccess` computation. After it, add:

```typescript
  const isDuelPublic = isPublicDuel(duel.inviteHash);
```

Update the Join button condition: show for public duels to any authenticated non-creator user, even without explicit invite access.

Find where Join button is conditionally rendered (the condition checking `isCreated && hasInviteAccess && !isCreator`). Update it to:

```typescript
{isCreated && !isCreator && (isDuelPublic || hasInviteAccess) && authenticated && (
```

For the Decline button, hide it for public duels. Find the Decline button condition and update to:

```typescript
{isCreated && !isCreator && !isDuelPublic && hasInviteAccess && authenticated && (
```

- [ ] **Step 5: Update the private invite warning message**

Find where `t('duel.privateInviteRequired')` or `t('duel.privateInviteMissing')` is shown (the warning message for users without invite access). Wrap it to only show for private duels:

The block that shows "This duel uses a private invite link..." should be conditional:

```typescript
{isCreated && !isDuelPublic && !hasInviteAccess && !isCreator && (
```

- [ ] **Step 6: Verify compile and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 7: Commit**

```
git add frontend/src/app/duel/\\[id\\]/page.tsx
git commit -m "feat: duel detail page supports public duels — auto-join, type badge"
```

---

### Task 6: useOpenDuels Hook

**Files:**
- Create: `frontend/src/hooks/useOpenDuels.ts`

- [ ] **Step 1: Create the hook**

```typescript
'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { duelMeAbi, DuelState } from '@/lib/contracts';
import { DUELME_ADDRESSES, USDT_DECIMALS } from '@/lib/constants';
import { isPublicDuel } from '@/lib/invite';

export interface OpenDuel {
  id: number;
  creator: `0x${string}`;
  wager: number;
  message: string;
  inviteHash: `0x${string}`;
  createdAt: bigint;
  chainId: number;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_CHAIN_ID = 421614;

export function useOpenDuels() {
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const enabled = !!contractAddress && contractAddress !== ZERO_ADDRESS;

  const { data: duelCount, isLoading: isCountLoading } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled, refetchInterval: 10_000, staleTime: 0 },
  });

  const count = duelCount ? Number(duelCount) : 0;

  const duelContracts = useMemo(() => {
    if (!count || !enabled) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(i)] as const,
      chainId: DEFAULT_CHAIN_ID,
    }));
  }, [count, contractAddress, enabled]);

  const { data: duelResults, isLoading: isDuelsLoading } = useReadContracts({
    contracts: duelContracts,
    query: { enabled: duelContracts.length > 0, refetchInterval: 10_000, staleTime: 0 },
  });

  const duels = useMemo<OpenDuel[]>(() => {
    if (!duelResults) return [];

    const open: OpenDuel[] = [];

    for (let i = 0; i < duelResults.length; i++) {
      const res = duelResults[i];
      if (res.status !== 'success' || !res.result) continue;

      const d = res.result as {
        creator: `0x${string}`;
        wagerAmount: bigint;
        inviteHash: `0x${string}`;
        message: string;
        createdAt: bigint;
        state: number;
      };

      if (d.state !== DuelState.Created) continue;
      if (!isPublicDuel(d.inviteHash)) continue;

      open.push({
        id: i,
        creator: d.creator,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        message: d.message,
        inviteHash: d.inviteHash,
        createdAt: d.createdAt,
        chainId: DEFAULT_CHAIN_ID,
      });
    }

    return open.reverse();
  }, [duelResults]);

  return {
    duels,
    isLoading: isCountLoading || isDuelsLoading,
  };
}
```

- [ ] **Step 2: Verify compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
git add frontend/src/hooks/useOpenDuels.ts
git commit -m "feat: add useOpenDuels hook — reads public Created duels from contract"
```

---

### Task 7: Open Duels Page (/duels/open)

**Files:**
- Create: `frontend/src/app/duels/open/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import { useDuelMeta } from '@/hooks/useDuelMeta';
import { formatUSDT, truncateAddress } from '@/lib/utils';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { Globe, Search, Swords } from 'lucide-react';
import { CopyableAddress } from '@/components/duel/CopyableAddress';

const PAGE_SIZE = 20;

export default function OpenDuelsPage() {
  const { t } = useTranslation();
  const { duels, isLoading } = useOpenDuels();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const addresses = useMemo(
    () => duels.map((d) => d.creator),
    [duels],
  );
  const { resolveDisplay } = useNicknames(addresses);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = useMemo(
    () => duels.filter((d) => {
      if (!normalizedSearch) return true;
      const creatorDisplay = resolveDisplay(d.creator).toLowerCase();
      const wagerStr = String(d.wager);
      const msg = d.message.toLowerCase();
      return creatorDisplay.includes(normalizedSearch)
        || d.creator.toLowerCase().includes(normalizedSearch)
        || wagerStr.includes(normalizedSearch)
        || msg.includes(normalizedSearch);
    }),
    [duels, normalizedSearch, resolveDisplay],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('openDuels.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t('openDuels.subtitle')}
        </p>
      </div>

      {duels.length > 0 && (
        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('game.searchPlaceholder')}
            className="h-11 border-slate-200 bg-white pl-10"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Globe className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {searchQuery ? t('dashboard.noMatches') : t('openDuels.empty')}
            </p>
            {!searchQuery && (
              <Link href="/duel/create">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {t('hero.cta')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          paginated.map((duel) => (
            <Link
              key={duel.id}
              href={`/duel/${duel.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {duel.wager} USDT
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    <Globe className="h-2.5 w-2.5" />
                    {t('duel.public')}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {t('duel.createdBy')} {resolveDisplay(duel.creator)}
                </span>
                {hasVisibleDuelMessage(duel.message) && (
                  <span className="text-xs text-slate-400 italic">
                    &ldquo;{truncateUnicode(duel.message, 40)}&rdquo;
                  </span>
                )}
              </div>
              <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700">
                {t('action.join')}
              </Button>
            </Link>
          ))
        )}
      </div>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
          <span>{t('dashboard.pageSummary', { current: safePage, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              {t('action.previous')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              {t('action.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the `duel.createdBy` and `action.join` translations exist**

Check `translations.ts` for these keys. If `duel.createdBy` or `action.join` don't exist, add them:

EN:
```typescript
    'duel.createdBy': 'by',
    'action.join': 'Join',
```

RU:
```typescript
    'duel.createdBy': 'от',
    'action.join': 'Принять',
```

- [ ] **Step 3: Verify compile and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add frontend/src/app/duels/open/page.tsx frontend/src/i18n/translations.ts
git commit -m "feat: add /duels/open page — browse and join public duels"
```

---

### Task 8: Landing Page — Open Duels Section

**Files:**
- Create: `frontend/src/app/OpenDuelsSection.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create OpenDuelsSection component**

```typescript
'use client';

import Link from 'next/link';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { ArrowRight, Globe } from 'lucide-react';
import { useMemo } from 'react';

export function OpenDuelsSection() {
  const { t } = useTranslation();
  const { duels, isLoading } = useOpenDuels();

  const addresses = useMemo(() => duels.slice(0, 6).map((d) => d.creator), [duels]);
  const { resolveDisplay } = useNicknames(addresses);

  if (isLoading || duels.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('openDuels.title')}</h2>
          <p className="mt-1 text-slate-500">{t('openDuels.subtitle')}</p>
        </div>
        <Link
          href="/duels/open"
          className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
        >
          {t('openDuels.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {duels.slice(0, 6).map((duel) => (
          <Link
            key={duel.id}
            href={`/duel/${duel.id}`}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">{duel.wager} USDT</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                <Globe className="h-2.5 w-2.5" />
                {t('duel.public')}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {t('duel.createdBy')} {resolveDisplay(duel.creator)}
            </span>
            {hasVisibleDuelMessage(duel.message) && (
              <span className="text-xs text-slate-400 italic">
                &ldquo;{truncateUnicode(duel.message, 30)}&rdquo;
              </span>
            )}
          </Link>
        ))}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Link href="/duels/open" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          {t('openDuels.viewAll')} →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add OpenDuelsSection to landing page**

In `frontend/src/app/page.tsx`, add the import and component between `HeroSection` and `RecentDuelsSection`:

```typescript
import { OpenDuelsSection } from './OpenDuelsSection';
```

In the JSX, add between `<HeroSection />` and `<HowItWorks />`:

```typescript
      <OpenDuelsSection />
```

- [ ] **Step 3: Verify compile and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add frontend/src/app/OpenDuelsSection.tsx frontend/src/app/page.tsx
git commit -m "feat: add Open Duels preview section on landing page"
```

---

### Task 9: Header — Open Duels Navigation Link

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Add Open Duels link to desktop nav**

Find the Games link in the desktop section (the `<Link href="/games"` block). Add the Open Duels link right after it:

```typescript
          <Link
            href="/duels/open"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/duels/open')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Swords className="h-4 w-4" />
            {t('nav.openDuels')}
          </Link>
```

- [ ] **Step 2: Add Open Duels link to mobile nav**

Find the Games link in the mobile section. Add the Open Duels link right after it:

```typescript
            <Link
              href="/duels/open"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/duels/open')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Swords className="h-4 w-4" />
              {t('nav.openDuels')}
            </Link>
```

- [ ] **Step 3: Verify compile and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add frontend/src/components/layout/Header.tsx
git commit -m "feat: add Open Duels link to header navigation"
```

---

## Verification

After all tasks are complete:

1. `cd frontend && npx tsc --noEmit` — no type errors
2. `cd frontend && npm run lint` — no lint errors
3. `cd backend && ./gradlew test` — backend still passes (no backend changes)
4. Manual: create a **Private** duel → verify invite link flow unchanged
5. Manual: create a **Public** duel → verify no invite fragment in URL, ShareLink shows clean URL
6. Manual: open `/duel/{id}` for a public duel without invite secret → Join button visible
7. Manual: visit `/duels/open` → see public duels, click Join
8. Manual: landing page → Open Duels section visible when public duels exist
9. Manual: switch EN/RU → all new translations render correctly
