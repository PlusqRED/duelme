'use client';

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
import { useAppToast } from '@/hooks/useAppToast';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialPlatform } from '@/lib/profile';
import type { SocialLinkError } from '@/lib/profileApi';

interface UnlinkConfirmDialogProps {
  open: boolean;
  platform: SocialPlatform | null;
  onOpenChange: (open: boolean) => void;
}

function platformKey(platform: SocialPlatform) {
  return platform === 'steam'
    ? 'profile.socialLinks.steam'
    : platform === 'telegram'
      ? 'profile.socialLinks.telegram'
      : 'profile.socialLinks.instagram';
}

export function UnlinkConfirmDialog({ open, platform, onOpenChange }: UnlinkConfirmDialogProps) {
  const { t } = useTranslation();
  const toast = useAppToast();
  const { unlink } = useSocialLinks();

  async function handleConfirm() {
    if (!platform) return;
    try {
      await unlink.mutateAsync(platform);
      toast.success('toast.socialLinks.unlinked', { platform: t(platformKey(platform)) });
      onOpenChange(false);
    } catch (error) {
      const code = (error as SocialLinkError | undefined)?.code;
      toast.error(
        code === 'unauthorized' ? 'toast.socialLinks.network' : 'toast.socialLinks.verificationFailed',
        { platform: t(platformKey(platform)) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {platform
              ? t('profile.socialLinks.unlinkTitle', { platform: t(platformKey(platform)) })
              : t('profile.socialLinks.unlink')}
          </DialogTitle>
          <DialogDescription>
            {platform && t('profile.socialLinks.unlinkBody', { platform: t(platformKey(platform)) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={unlink.isPending}
            className="h-11"
          >
            {t('profile.socialLinks.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={unlink.isPending || !platform}
            className="h-11"
            aria-busy={unlink.isPending}
          >
            {unlink.isPending ? (
              <>
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                {t('profile.socialLinks.unlinking')}
              </>
            ) : (
              t('profile.socialLinks.unlinkConfirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
