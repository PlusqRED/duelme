'use client';

import type { Hex } from 'viem';
import { SignActions } from '@/components/sign/SignActions';
import { SignList, type ItemFee } from '@/components/sign/SignList';
import type { SigningModel } from '@/components/sign/signingModel';
import { SignTicks, TxLink } from '@/components/sign/SignTicks';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Note } from '@/components/ui/note';
import { Spinner } from '@/components/ui/spinner';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { formatEthFee } from '@/lib/gasNeeds';
import type { SigningSpot } from '@/lib/signingSteps';

type WalletStep = 'sign' | 'approve' | 'send';

interface StepWords {
  /** The head before the press. */
  ready: TranslationKey;
  /** The head once the wallet is at it. */
  title: TranslationKey;
  wait: TranslationKey;
}

/**
 * A wallet step's heads and wait: what the player is asked to do in their wallet, or, with the
 * wallet in the app, which signs without a prompt of its own, what the press will do and then what
 * is happening.
 */
const STEP_WORDS: Record<'asked' | 'inApp', Record<WalletStep, StepWords>> = {
  asked: {
    sign: { ready: 'sign.sign.title', title: 'sign.sign.title', wait: 'sign.sign.wait' },
    approve: { ready: 'sign.approve.title', title: 'sign.approve.title', wait: 'sign.tx.wait' },
    send: { ready: 'sign.send.title', title: 'sign.send.title', wait: 'sign.tx.wait' },
  },
  inApp: {
    sign: { ready: 'sign.sign.ready.inApp', title: 'sign.sign.title.inApp', wait: 'sign.sign.wait.inApp' },
    approve: { ready: 'sign.approve.ready.inApp', title: 'sign.approve.title.inApp', wait: 'sign.tx.wait.inApp' },
    send: { ready: 'sign.send.ready.inApp', title: 'sign.send.title.inApp', wait: 'sign.tx.wait.inApp' },
  },
};

interface SignProgressProps {
  model: SigningModel;
  spot: SigningSpot;
  fees: (ItemFee | null)[];
  hash: Hex | undefined;
  /** The network has taken long to decide: the window offers a way out. */
  isSlow: boolean;
  /** The wallet in the app: this window is its confirmation, so it signs as soon as it is asked. */
  isInAppWallet: boolean;
  /** Asks the wallet for a step the flow reached without a press, such as after reopening. */
  onStartStep: () => void;
}

/**
 * The wallet and the network at work: the network switch, the signatures one by one, a transaction
 * waiting in the wallet, then the chain ticking off the send and the confirmation.
 */
export function SignProgress({ model, spot, fees, hash, isSlow, isInAppWallet, onStartStep }: SignProgressProps) {
  const { t, language } = useTranslation();
  const params = { network: model.chainName };

  if (spot.step === 'network') {
    return (
      <>
        <Lead>{t('sign.network.title', params)}</Lead>
        <Text>{t('sign.network.text', params)}</Text>
        {spot.phase === 'idle' ? <StartStep label={model.button} onStart={onStartStep} /> : <Waiting>{t('sign.network.wait')}</Waiting>}
      </>
    );
  }

  const signatures = model.items.filter((item) => item.kind === 'signature');
  const transactions = model.items.filter((item) => item.kind === 'transaction');
  const isApprove = spot.step === 'approve';
  const index = spot.step === 'sign'
    ? model.items.indexOf(signatures[model.signing.phase === 'request' && signatures.length > 1 ? 1 : 0])
    : isApprove ? 0 : model.items.length - 1;

  if (spot.phase === 'chain') {
    const fee = fees[index];
    return (
      <>
        <Lead>{t(isApprove ? 'sign.chain.approve' : 'sign.chain.title', params)}</Lead>
        <Text>{t('sign.chain.text')}</Text>
        {model.route === 'self' && <SignList items={model.items} current={index} fees={fees} />}
        <SignTicks
          ticks={[
            {
              text: t(isInAppWallet ? 'sign.tick.signed.inApp' : model.route === 'self' ? 'sign.tick.confirmedWallet' : 'sign.tick.signed'),
              status: 'done',
            },
            {
              text:
                model.route === 'self'
                  ? t('sign.tick.sentSelf', { eth: fee ? formatEthFee(fee.wei, language) : '…' })
                  : t('sign.tick.sent'),
              status: hash ? 'done' : 'busy',
            },
            { text: t('sign.tick.confirmed', params), status: hash ? 'busy' : 'next' },
          ]}
        />
        {hash && <TxLink chainId={model.chainId} hash={hash} />}
        {isSlow && <SlowNotice text={model.slowText} onLeave={model.onClose} />}
      </>
    );
  }

  const words = STEP_WORDS[isInAppWallet ? 'inApp' : 'asked'][spot.step === 'sign' ? 'sign' : isApprove ? 'approve' : 'send'];
  const isIdle = spot.phase === 'idle';
  const total = spot.step === 'sign' ? signatures.length : transactions.length;
  const position = spot.step === 'sign' ? signatures.indexOf(model.items[index]) : transactions.indexOf(model.items[index]);
  return (
    <>
      <Lead>{t(isIdle ? words.ready : words.title)}</Lead>
      {total > 1 && (
        <p className="-mt-2 text-sm font-strong text-ink-3">
          {t(spot.step === 'sign' ? 'sign.sign.count' : 'sign.tx.count', { n: position + 1, total })}
        </p>
      )}
      <SignList items={model.items} current={index} fees={fees} />
      {isIdle && isInAppWallet && <Note icon="pen">{t('sign.inApp.note')}</Note>}
      {isIdle ? <StartStep label={model.button} onStart={onStartStep} /> : <Waiting>{t(words.wait)}</Waiting>}
    </>
  );
}

function Lead({ children }: { children: string }) {
  return <h3 className="text-lg font-extrabold">{children}</h3>;
}

function Text({ children }: { children: string }) {
  return <p className="-mt-2 text-ink-2">{children}</p>;
}

function Waiting({ children }: { children: string }) {
  return (
    <p role="status" className="flex items-center gap-2.5 font-label text-ink-2">
      <Spinner />
      <span>{children}</span>
    </p>
  );
}

function StartStep({ label, onStart }: { label: string; onStart: () => void }) {
  return (
    <SignActions>
      <Button type="button" size="lg" data-primary onClick={onStart}>
        {label}
      </Button>
    </SignActions>
  );
}

/** Long past a confirmation's usual seconds: the result may still come, and the page will show it. */
function SlowNotice({ text, onLeave }: { text: string; onLeave: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid justify-items-start gap-2 rounded-2xl bg-canvas px-4 py-3.5">
      <p className="flex items-center gap-2 font-strong">
        <Icon name="clock" className="size-[18px] text-ink-2" />
        {t('sign.slow.title')}
      </p>
      <p className="text-sm text-pretty text-ink-2">{text}</p>
      <Button type="button" variant="paper" size="sm" onClick={onLeave}>
        {t('sign.slow.leave')}
      </Button>
    </div>
  );
}
