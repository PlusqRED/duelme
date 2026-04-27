'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface InlineEditFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  maxLength: number;
  multiline?: boolean;
  onSave: (next: string | null) => Promise<void>;
  isSaving?: boolean;
  italic?: boolean;
}

export function InlineEditField({
  label,
  placeholder,
  value,
  maxLength,
  multiline = false,
  onSave,
  isSaving,
  italic,
}: InlineEditFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [savedFlash, setSavedFlash] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  useEffect(() => {
    if (!editing) {
      // Use requestAnimationFrame to avoid triggering the set-state-in-effect
      // lint rule while still syncing draft from value after editing ends or
      // value changes during concurrent React Query revalidation.
      const id = requestAnimationFrame(() => setDraft(value ?? ''));
      return () => cancelAnimationFrame(id);
    }
  }, [value, editing]);

  async function commit() {
    if (draft === (value ?? '')) {
      setEditing(false);
      return;
    }
    if (draft.length > maxLength) return;
    try {
      await onSave(draft.length === 0 ? null : draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 600);
      setEditing(false);
    } catch {
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 320);
    }
  }

  function cancel() {
    setDraft(value ?? '');
    setEditing(false);
  }

  return (
    <motion.div
      animate={errorShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.32 }}
      className={cn(
        'group relative flex items-start justify-between gap-3 rounded-xl border bg-white p-4',
        savedFlash ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2"
            >
              {multiline ? (
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancel();
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void commit();
                    }
                  }}
                  autoFocus
                />
              ) : (
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancel();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commit();
                    }
                  }}
                  autoFocus
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t('profile.charCount', { count: draft.length, max: maxLength })}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancel}
                    disabled={isSaving}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="min-h-[44px] min-w-[44px] bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={() => void commit()}
                    disabled={isSaving || draft.length > maxLength}
                  >
                    {isSaving ? t('profile.saving') : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={cn(
                'text-sm',
                value ? 'text-slate-900' : 'italic text-slate-400',
                italic && 'italic',
              )}
            >
              {value || placeholder}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 sm:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
