// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreatedPanel } from '@/components/duel/create/CreatedPanel';
import { translations } from '@/i18n/translations';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const en = translations.en;

describe('CreatedPanel', () => {
  it('hands over the duel’s link to send, its key included', () => {
    render(<CreatedPanel pointAt={createRef()} path="/duel/7#0xabc" wager="5" isPublic={false} onAgain={vi.fn()} />);

    expect((screen.getByLabelText(en['room.share.label']) as HTMLInputElement).value).toBe(`${window.location.host}/duel/7#0xabc`);
    expect(screen.getByRole('region').textContent).toContain(en['room.created.creator.text'].replace('{wager}', '5'));
  });

  it('leads to the duel’s page', () => {
    render(<CreatedPanel pointAt={createRef()} path="/duel/7" wager="5" isPublic onAgain={vi.fn()} />);

    expect(screen.getByRole('link', { name: en['create.goToDuel'] }).getAttribute('href')).toBe('/duel/7');
  });

  it('sets up another duel once the panel has settled', () => {
    vi.useFakeTimers();
    const onAgain = vi.fn();
    render(<CreatedPanel pointAt={createRef()} path="/duel/7" wager="5" isPublic onAgain={onAgain} />);

    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole('button', { name: en['create.again'] }));

    expect(onAgain).toHaveBeenCalledOnce();
  });
});
