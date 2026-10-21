// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageStepBody } from '@/components/duel/create/MessageStepBody';
import { translations } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;
const LIMITS = { minWager: 0.3, claimTimeout: 3600, maxMessageCharacters: 32, maxMessageBytes: 128 };

function body(text: string, isValid = true) {
  const props = { onChange: vi.fn(), onDone: vi.fn() };
  render(<MessageStepBody text={text} message={text.trim()} isValid={isValid} limits={LIMITS} address={null} example="1x1 dust 2 awp" {...props} />);
  return props;
}

const field = () => screen.getByRole('textbox', { name: en['create.message.label'] });

describe('MessageStepBody', () => {
  it('shows a real note for the game as the example', () => {
    body('');

    expect(field().getAttribute('placeholder')).toBe('1x1 dust 2 awp');
  });

  it('counts the message the contract gets, without the spaces around it', () => {
    body('  gg  ');

    expect(screen.getByText('2/32')).toBeTruthy();
  });

  it('asks to shorten a message past the limit and waits for it', () => {
    body('x'.repeat(40), false);

    expect(screen.getByText(en['create.message.tooLong'].replace('{max}', '32'))).toBeTruthy();
    expect((screen.getByRole('button', { name: en['create.step.done'] }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('finishes with Enter', () => {
    const props = body('gg');

    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(props.onDone).toHaveBeenCalledOnce();
  });

  it('passes on what is typed', () => {
    const props = body('');

    fireEvent.change(field(), { target: { value: 'best of 3' } });

    expect(props.onChange).toHaveBeenCalledWith('best of 3');
  });
});
