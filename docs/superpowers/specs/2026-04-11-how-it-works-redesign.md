# How It Works Section Redesign

**Date:** 2026-04-11
**Status:** Approved

## Goal

Redesign the "See How It Works" landing page section to be more visual, less text-heavy, and clearly explain WHY smart contracts make duels safe — targeting regular gamers who don't understand crypto.

## Decisions

- **Merge** HowItWorks + TrustSection into one unified section
- **Remove** "New wallet? Fund it first" funding block (move to onboarding context later)
- **Delete** TrustSection component entirely
- Visual centerpiece: **animated flow diagram** showing money locked in smart contract
- Language: simple gamer-friendly terms, no crypto jargon

## Section Structure

### Zone 1 — Three Steps (compact horizontal row)

| # | Title (RU) | Description (RU) | Icon |
|---|-----------|-------------------|------|
| 01 | Создай дуэль | Выбери игру, поставь сумму, скинь ссылку сопернику | Swords |
| 02 | Ставки заблокированы | Деньги обоих игроков уходят в смарт-контракт. Никто не может их забрать досрочно | Lock |
| 03 | Победитель забирает всё | Оба подтвердили результат — выигрыш доступен мгновенно | Trophy |

Step 2 is the key security moment — user first understands money is in a neutral place.

### Zone 2 — Flow Diagram (visual centerpiece)

```
[Player A] ──$10 USDT──→ [🔒 Smart Contract] ←──$10 USDT── [Player B]
                                   │
                             Result confirmed
                                   │
                                   ▼
                             [🏆 $20 USDT]
                              Winner
```

Implementation:
- Pure CSS/Tailwind — no images, no canvas, no third-party libs
- Player avatars: colored circles with User icons
- Contract center: Lock icon with pulsing border
- Arrows: animated dashed lines (money "flows" to contract, then down to winner)
- "$10" amounts next to arrows for concreteness
- Mobile: vertical layout (top to bottom) instead of horizontal

Caption below diagram:
- RU: «Деньги хранит программный код — не сервер, не человек. Забрать их может только победитель.»
- EN: «Funds are held by code — not a server, not a person. Only the winner can claim them.»

### Zone 3 — Three Security Facts (replaces TrustSection)

| Icon | Title (RU) | Text (RU) |
|------|-----------|-----------|
| ShieldCheck | Код, а не человек | Деньги контролирует программа на блокчейне. У нас нет доступа к вашим средствам |
| BadgePercent | 0% комиссия | Победитель забирает всё. Платформа не берёт ничего |
| Eye | Открытый код | Контракт публичный. Каждую транзакцию можно проверить в блокчейне |

Removed from old TrustSection:
- "Your keys, your funds" — too crypto-jargony for gamers
- "Honor system" — already covered by separate HonorSection

## Files to Change

1. **Rewrite** `frontend/src/app/HowItWorks.tsx` — new three-zone layout
2. **Delete** `frontend/src/app/TrustSection.tsx`
3. **Update** `frontend/src/app/page.tsx` — remove TrustSection import/usage
4. **Update** `frontend/src/app/SideNav.tsx` — remove trust nav link if present
5. **Update** `frontend/src/i18n/translations.ts` — new EN/RU keys for all content, remove old `trust.*` and old `howItWorks.*` keys
6. **Update** `frontend/src/app/HeroSection.tsx` — "See how it works" button still links to `#how-it-works` (no change needed)

## Out of Scope

- OnboardingSection changes (funding info migration is a separate task)
- HonorSection / ReputationSection changes
- Mobile-specific animations (basic vertical layout is sufficient)
