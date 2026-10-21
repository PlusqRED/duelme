'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PLATFORM_NAME_KEY } from '@/components/profile/PlatformIcon';
import { useAppToast } from '@/hooks/useAppToast';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialPlatform } from '@/lib/profile';
import type { SocialLinkError } from '@/lib/profileApi';

interface UnlinkConfirmDialogProps {
  open: boolean;
  platform: SocialPlatform | null;
  onOpenChange: (open: boolean) => void;
}

export function UnlinkConfirmDialog({ open, platform, onOpenChange }: UnlinkConfirmDialogProps) {
  const { t } = useTranslation();
  const toast = useAppToast();
  const { unlink } = useSocialLinks();
  const shownPlatform = useLastNonNull(platform);

  async function handleConfirm() {
    if (!platform) return;
    try {
      await unlink.mutateAsync(platform);
      toast.success('toast.socialLinks.unlinked', { platform: t(PLATFORM_NAME_KEY[platform]) });
      onOpenChange(false);
    } catch (error) {
      const code = (error as SocialLinkError | undefined)?.code;
      toast.error(
        code === 'unauthorized' ? 'toast.socialLinks.network' : 'toast.socialLinks.verificationFailed',
        { platform: t(PLATFORM_NAME_KEY[platform]) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {shownPlatform
              ? t('profile.socialLinks.unlinkTitle', { platform: t(PLATFORM_NAME_KEY[shownPlatform]) })
              : t('profile.socialLinks.unlink')}
          </DialogTitle>
          <DialogDescription>
            {shownPlatform && t('profile.socialLinks.unlinkBody', { platform: t(PLATFORM_NAME_KEY[shownPlatform]) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={unlink.isPending}
          >
            {t('profile.socialLinks.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={unlink.isPending || !shownPlatform}
            aria-busy={unlink.isPending}
          >
            {unlink.isPending ? (
              <>
                <Spinner />
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
