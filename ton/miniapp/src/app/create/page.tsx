"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Swords, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Input";
import { TonAmount } from "@/components/ui/TonAmount";
import { ShareDialog } from "@/components/duel/ShareDialog";
import { useDuelActions } from "@/hooks/useDuelActions";
import { useWallet } from "@/hooks/useWallet";
import { useDuelCount } from "@/hooks/useDuel";
import { useTranslation } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { DEFAULT_WAGER_TON, MAX_MESSAGE_CODEPOINTS } from "@/lib/constants";
import { validateDuelMessage } from "@/lib/duelMessage";
import { generateInvite } from "@/lib/invite";
import { parseTon } from "@/lib/format";
import { MIN_WAGER_NANO } from "@/lib/ton/contract";

type Phase = "form" | "preparing" | "signing" | "success";

export default function CreatePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isConnected, openWallet } = useWallet();
  const { createDuel } = useDuelActions();
  const { toast } = useToast();
  const { data: existingCount } = useDuelCount();

  const [wager, setWager] = useState(DEFAULT_WAGER_TON);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [createdId, setCreatedId] = useState<bigint | null>(null);
  const [createdSecret, setCreatedSecret] = useState<bigint | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const wagerValidation = useMemo(() => {
    try {
      const nano = parseTon(wager);
      if (nano < MIN_WAGER_NANO) {
        return { valid: false, nano, error: t("errors.wagerTooSmall") } as const;
      }
      return { valid: true, nano, error: null } as const;
    } catch {
      return { valid: false, nano: 0n, error: t("errors.invalidWager") } as const;
    }
  }, [wager, t]);

  const messageValidation = validateDuelMessage(message);
  const canSubmit =
    isConnected && wagerValidation.valid && messageValidation.errors.length === 0 && phase === "form";

  // Auto-open the share sheet once the duel lands on-chain.
  useEffect(() => {
    if (phase === "success" && createdId !== null) {
      setShareOpen(true);
    }
  }, [phase, createdId]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setPhase("preparing");
    const baseCount = existingCount ?? 0n;
    try {
      const { secret, inviteHash } = await generateInvite();
      setPhase("signing");
      const res = await createDuel({
        inviteHash,
        wagerNano: wagerValidation.nano,
        message,
      });
      if (!res.ok) {
        setPhase("form");
        return;
      }
      // Optimistically assume the next duel id is `baseCount`. Re-validate on
      // success page that this matches a real duel via React Query refetch.
      setCreatedId(baseCount);
      setCreatedSecret(secret);
      setPhase("success");
    } catch (err) {
      toast((err as Error).message ?? t("errors.generic"), { tone: "error" });
      setPhase("form");
    }
  }

  if (!isConnected) {
    return (
      <Card className="space-y-3 text-center">
        <Wallet className="mx-auto size-8 text-link" aria-hidden />
        <p className="text-sm text-muted">{t("errors.walletNotConnected")}</p>
        <Button onClick={openWallet} size="lg">
          {t("home.ctaConnect")}
        </Button>
      </Card>
    );
  }

  if (phase === "success" && createdId !== null && createdSecret !== null) {
    return (
      <SuccessView
        duelId={createdId}
        secret={createdSecret}
        onShareOpen={() => setShareOpen(true)}
        onShareClose={() => setShareOpen(false)}
        shareOpen={shareOpen}
        onGoToDuel={() => router.push(`/duel/${createdId}`)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> {t("common.back")}
      </button>

      <Card className="space-y-5">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-link">{t("appName")}</p>
          <h1 className="text-xl font-bold">{t("create.title")}</h1>
          <p className="text-sm text-muted">
            {t("create.subtitle", { amount: wager || "0" })}
          </p>
        </header>

        <TextField
          label={t("create.wagerLabel")}
          type="text"
          inputMode="decimal"
          value={wager}
          onChange={(e) => setWager(e.target.value)}
          helper={t("create.wagerHelper")}
          error={wagerValidation.valid ? undefined : wagerValidation.error}
          suffix="TON"
          autoFocus
        />

        <TextField
          label={t("create.messageLabel")}
          value={message}
          maxLength={MAX_MESSAGE_CODEPOINTS * 4}
          onChange={(e) => setMessage(e.target.value)}
          helper={`${messageValidation.codePoints}/${MAX_MESSAGE_CODEPOINTS} · ${messageValidation.byteLength}/128 bytes`}
          error={
            messageValidation.errors.includes("tooManyCodePoints") ||
            messageValidation.errors.includes("tooManyBytes")
              ? t("errors.messageTooLong")
              : undefined
          }
          placeholder="Easy money 😏"
        />

        <div className="flex items-start gap-2 rounded-2xl border border-link/20 bg-link/5 p-3 text-xs text-link/90">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>Pull-based escrow.</strong> Your TON is locked on the DuelMe contract until the
            duel resolves. Loser&apos;s wager and yours both go to the winner.
          </span>
        </div>

        <Button
          size="block"
          icon={<Swords className="size-5" />}
          disabled={!canSubmit}
          loading={phase !== "form"}
          onClick={handleSubmit}
        >
          {phase === "preparing"
            ? t("create.generating")
            : phase === "signing"
            ? t("create.sending")
            : t("create.submit", { amount: wager || "0" })}
        </Button>

        <AnimatePresence>
          {phase !== "form" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-muted"
            >
              <TonAmount nano={wagerValidation.nano} size="sm" />
              {" "}<span className="text-muted">locked from your wallet</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function SuccessView({
  duelId,
  secret,
  shareOpen,
  onShareOpen,
  onShareClose,
  onGoToDuel,
}: {
  duelId: bigint;
  secret: bigint;
  shareOpen: boolean;
  onShareOpen: () => void;
  onShareClose: () => void;
  onGoToDuel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass relative overflow-hidden rounded-2xl p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="mx-auto grid size-16 place-items-center rounded-full bg-success/20 text-success"
        >
          <Swords className="size-7" aria-hidden />
        </motion.div>
        <h2 className="mt-4 text-lg font-bold">{t("create.success")}</h2>
        <p className="mt-1 text-sm text-muted">Duel #{duelId.toString()}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="block" onClick={onGoToDuel}>
            Open
          </Button>
          <Button size="block" onClick={onShareOpen}>
            {t("create.successCta")}
          </Button>
        </div>
      </motion.div>
      <ShareDialog
        open={shareOpen}
        onOpenChange={(open) => (open ? onShareOpen() : onShareClose())}
        duelId={duelId}
        inviteSecret={secret}
      />
    </>
  );
}
