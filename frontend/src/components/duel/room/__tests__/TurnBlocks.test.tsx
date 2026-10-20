// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { TurnBlock } from '@/lib/turnView';
import { duelView } from '@/lib/__tests__/helpers/duelView';

vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => ({ copied: false, copy: vi.fn() }) }));

const { TurnBlocks } = await import('@/components/duel/room/TurnBlocks');

afterEach(cleanup);

const en = translations.en;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const VARS = { wager: '5', pot: '10', name: 'Ace' };

const plain = (text: string) => text.replace(/ /g, ' ');

function blocks(list: TurnBlock[], onMove = vi.fn()) {
  return render(
    <TurnBlocks
      blocks={list}
      moves={{ vars: VARS, onMove, pending: null, isBusy: false }}
      share={{ link: 'https://dev.duelme.pro/duel/6', isPublic: true }}
      foe={{ address: CREATOR, name: 'Ace', level: undefined }}
      purse={{ needRaw: 5_000_000n, balance: { kind: 'ready', raw: 0n }, side: 'opponent' }}
      countdown={{ duel: duelView({ claimTimestamp: 1n }), claimTimeout: 3600 }}
    />
  );
}

describe('TurnBlocks', () => {
  it('turns a row of actions into moves', () => {
    const onMove = vi.fn();
    blocks([{ type: 'actions', actions: [{ id: 'cancel' }] }], onMove);

    fireEvent.click(screen.getByRole('button', { name: en['room.action.cancel'] }));

    expect(onMove).toHaveBeenCalledWith('cancel');
  });

  it('writes a note with the duel’s amounts', () => {
    blocks([{ type: 'note', kind: 'gas', key: 'room.gasless' }]);

    expect(screen.getByText(en['room.gasless'])).toBeTruthy();
  });

  it('writes the amount a note carries itself', () => {
    blocks([{ type: 'note', kind: 'returned', key: 'room.back.done', amountRaw: 7_000_000n }]);

    expect(screen.getByText(plain(en['room.back.done'].replace('{amount}', '7')))).toBeTruthy();
  });

  it('sets a callout apart, its title, its line and its move', () => {
    blocks([{ type: 'callout', titleKey: 'room.callOff.title', key: 'room.callOff.text', action: { id: 'callOff' } }]);

    expect(screen.getByRole('heading', { name: en['room.callOff.title'] })).toBeTruthy();
    expect(screen.getByText(plain(en['room.callOff.text'].replace('{wager}', '5')))).toBeTruthy();
    expect(screen.getByRole('button', { name: en['room.action.callOff'] })).toBeTruthy();
  });

  it('gives the invite link to send', () => {
    blocks([{ type: 'share' }]);

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe('dev.duelme.pro/duel/6');
  });

  it('shows who the reader would play', () => {
    blocks([{ type: 'foe' }]);

    expect(screen.getByText(en['room.created.guest.check'])).toBeTruthy();
  });

  it('holds the stake against the wallet', () => {
    blocks([{ type: 'purse' }]);

    expect(screen.getByRole('listitem').dataset.tone).toBe('short');
  });

  it('says Join opens once the wallet holds the stake', () => {
    blocks([{ type: 'later' }]);

    expect(screen.getByText(plain(en['room.purse.later'].replace('{wager}', '5')))).toBeTruthy();
  });

  it('runs the clock on a reported win, with what running out means', () => {
    blocks([{ type: 'countdown', noteKey: 'room.countdown.them' }]);

    expect(screen.getByRole('timer')).toBeTruthy();
    expect(screen.getByText(en['room.countdown.them'])).toBeTruthy();
  });
});
