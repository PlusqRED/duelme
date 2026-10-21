// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccessStepBody } from '@/components/duel/create/AccessStepBody';
import { translations } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;

describe('AccessStepBody', () => {
  it('checks the private link while the duel is private', () => {
    render(<AccessStepBody isPublic={false} onChange={vi.fn()} onContinue={vi.fn()} />);

    expect((screen.getByRole('radio', { name: new RegExp(en['create.access.private']) }) as HTMLInputElement).checked).toBe(true);
  });

  it('opens the duel to anyone', () => {
    const onChange = vi.fn();
    render(<AccessStepBody isPublic={false} onChange={onChange} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en['create.access.public']) }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('goes on', () => {
    const onContinue = vi.fn();
    render(<AccessStepBody isPublic onChange={vi.fn()} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole('button', { name: en['create.step.continue'] }));

    expect(onContinue).toHaveBeenCalledOnce();
  });
});
