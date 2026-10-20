'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

/** The text field's look, for the few lines `Input` does not take. */
const AREA_CLASS =
  'min-h-28 w-full min-w-0 resize-y rounded-2xl border-[1.5px] border-line-strong bg-paper px-4 py-3 text-base text-ink outline-none transition-[border-color] placeholder:text-ink-3 focus:border-ink focus:ring-3 focus:ring-canvas-deep';

interface ProfileFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  limit: number;
  isMultiline?: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  /** Saves the text; resolves once the profile has it, or has refused it. */
  onSave: (value: string) => Promise<void>;
}

/**
 * One line of the owner's profile, or a few: read as it is, with a pen that turns it into a field,
 * saved with Enter or the button and left with Escape. The count beside it says how much room is left.
 */
export function ProfileField(props: ProfileFieldProps) {
  const { label, placeholder, value, isEditing, onEdit } = props;
  const { t } = useTranslation();

  if (isEditing) {
    return <FieldEditor {...props} />;
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3 not-first:border-t not-first:border-line">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-body-sm font-label text-ink-2">{label}</span>
        <p className={cn('whitespace-pre-line [overflow-wrap:anywhere]', value ? 'text-ink' : 'text-ink-3')}>{value || placeholder}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t('profile.editField', { field: label })}
        className="-mt-1 grid size-11 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
      >
        <Icon name="pen" className="size-[18px]" />
      </button>
    </div>
  );
}

function FieldEditor({ label, placeholder, value, limit, isMultiline = false, isSaving, onCancel, onSave }: ProfileFieldProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const counterId = useId();
  const [draft, setDraft] = useState(value ?? '');
  const isTooLong = draft.length > limit;

  function save() {
    if (!isTooLong && !isSaving) void onSave(draft);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Enter' && !isMultiline) {
      event.preventDefault();
      save();
    }
  }

  const shared = {
    id: fieldId,
    value: draft,
    placeholder,
    maxLength: limit,
    autoFocus: true,
    'aria-describedby': counterId,
    onKeyDown,
  };

  return (
    <div className="grid gap-2 py-3 not-first:border-t not-first:border-line">
      <label htmlFor={fieldId} className="text-body-sm font-label text-ink-2">
        {label}
      </label>
      {isMultiline ? (
        <textarea {...shared} rows={4} onChange={(event) => setDraft(event.target.value)} className={AREA_CLASS} />
      ) : (
        <Input {...shared} onChange={(event) => setDraft(event.target.value)} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span id={counterId} className="mr-auto text-note text-ink-3 tabular-nums">
          {t('profile.charCount', { count: draft.length, max: limit })}
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          {t('profile.cancel')}
        </Button>
        <Button size="sm" onClick={save} disabled={isSaving || isTooLong} aria-busy={isSaving}>
          {isSaving && <Spinner />}
          {t(isSaving ? 'profile.saving' : 'profile.save')}
        </Button>
      </div>
    </div>
  );
}
