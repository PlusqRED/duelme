'use client';

import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppToast } from '@/hooks/useAppToast';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useTranslation } from '@/i18n/useTranslation';
import {
  INSTAGRAM_HANDLE_RE,
  PROFILE_LIMITS,
  isValidInstagramHandle,
  stripInstagramAt,
} from '@/lib/profile';
import type { SocialLinkError } from '@/lib/profileApi';

interface InstagramHandleDialogProps {
  open: boolean;
  initialHandle?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function InstagramHandleDialog({ open, initialHandle, onOpenChange }: InstagramHandleDialogProps) {
  const { t } = useTranslation();
  const toast = useAppToast();
  const { setInstagram } = useSocialLinks();

  const counterId = useId();
  const errorId = useId();

  const [value, setValue] = useState(initialHandle ?? '');

  const stripped = stripInstagramAt(value);
  const touched = value.length > 0;
  const invalid = touched && !INSTAGRAM_HANDLE_RE.test(stripped);
  const canSave = isValidInstagramHandle(value);

  async function handleSave() {
    if (!canSave) return;
    try {
      await setInstagram.mutateAsync(value);
      toast.success('toast.socialLinks.instagramSaved');
      onOpenChange(false);
    } catch (error) {
      const code = (error as SocialLinkError | undefined)?.code;
      if (code === 'alreadyLinked') {
        toast.error('toast.socialLinks.alreadyLinked', {
          platform: t('profile.socialLinks.instagram'),
        });
      } else if (code === 'invalid') {
        toast.error('toast.socialLinks.verificationFailed', {
          platform: t('profile.socialLinks.instagram'),
        });
      } else {
        toast.error('toast.socialLinks.network');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.socialLinks.instagramDialogTitle')}</DialogTitle>
          <DialogDescription>{t('profile.socialLinks.instagramDialogBody')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="instagram-handle" className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.socialLinks.instagramLabel')}
          </label>
          <Input
            id="instagram-handle"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('profile.socialLinks.instagramPlaceholder')}
            maxLength={PROFILE_LIMITS.instagramHandle + 1}
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            autoCorrect="off"
            aria-describedby={`${counterId} ${invalid ? errorId : ''}`.trim()}
            aria-invalid={invalid || undefined}
            className="h-11"
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span id={counterId}>{t('profile.charCount', { count: stripped.length, max: PROFILE_LIMITS.instagramHandle })}</span>
          </div>
          {invalid && (
            <p id={errorId} className="text-xs text-red-600">
              {t('profile.socialLinks.instagramInvalid')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => onOpenChange(false)}
            disabled={setInstagram.isPending}
          >
            {t('profile.socialLinks.cancel')}
          </Button>
          <Button
            className="h-11"
            onClick={handleSave}
            disabled={!canSave || setInstagram.isPending}
            aria-busy={setInstagram.isPending}
          >
            {setInstagram.isPending ? (
              <>
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                {t('profile.socialLinks.saving')}
              </>
            ) : (
              t('profile.socialLinks.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
