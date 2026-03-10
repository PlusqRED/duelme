'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { SUPPORTED_CHAINS, MIN_WAGER, USDT_DECIMALS, DUELME_ADDRESSES } from '@/lib/constants';
import { erc20Abi } from '@/lib/contracts';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useDuelActions } from '@/hooks/useDuelActions';
import { Swords, Shield, Zap, DollarSign } from 'lucide-react';

const PRESETS = [5, 10, 25, 50, 100];

export function CreateDuelForm() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState<keyof typeof SUPPORTED_CHAINS>(
    'arbitrumSepolia'
  );

  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];

  const chainConfig = SUPPORTED_CHAINS[selectedChain];
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];
  const { createDuel, approveToken, isPending, isConfirming, isSuccess, error, reset } =
    useDuelActions(chainConfig.id);

  // Track whether we're in the approve step or create step
  const [step, setStep] = useState<'idle' | 'approving' | 'creating'>('idle');
  const pendingAmount = useRef<bigint>(0n);

  // Check current allowance
  const walletAddress = activeWallet?.address as `0x${string}` | undefined;
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: chainConfig.usdt,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress && contractAddress ? [walletAddress, contractAddress] : undefined,
    chainId: chainConfig.id,
    query: { enabled: !!walletAddress && !!contractAddress },
  });

  // When approval tx confirms, proceed to createDuel
  useEffect(() => {
    if (isSuccess && step === 'approving') {
      refetchAllowance();
      reset();
      setStep('creating');
      toast.info('Creating duel...');
      createDuel(pendingAmount.current);
    }
  }, [isSuccess, step, refetchAllowance, reset, createDuel]);

  // When create tx confirms, redirect
  useEffect(() => {
    if (isSuccess && step === 'creating') {
      setStep('idle');
      toast.success('Duel created!');
    }
  }, [isSuccess, step]);

  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= MIN_WAGER;
  const isLoading = isPending || isConfirming;
  const potAmount = numericAmount * 2;

  async function handleCreateDuel() {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    if (!activeWallet?.address) {
      toast.error('Wallet not ready. Please try again.');
      return;
    }

    if (!isValidAmount) {
      toast.error(t('create.min'));
      return;
    }

    const rawAmount = parseUnits(amount, USDT_DECIMALS);
    pendingAmount.current = rawAmount;

    // Check if we already have sufficient allowance
    if (currentAllowance !== undefined && currentAllowance >= rawAmount) {
      setStep('creating');
      toast.info('Creating duel...');
      createDuel(rawAmount);
    } else {
      setStep('approving');
      toast.info('Approve USDT spending first...');
      approveToken(chainConfig.usdt, rawAmount);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
          <Swords className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('create.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {t('create.subtitle')}
        </p>
      </div>

      {/* Form card */}
      <div className="card-glow animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Wager section */}
        <div className="flex flex-col gap-3">
          <label
            htmlFor="wager-amount"
            className="text-sm font-semibold text-slate-700"
          >
            {t('create.amount')}
          </label>

          {/* Amount input with USDT suffix */}
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="wager-amount"
              type="number"
              min={MIN_WAGER}
              step="1"
              placeholder={t('create.amountPlaceholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 border-slate-200 pl-9 pr-16 text-lg font-semibold focus:border-indigo-300 focus:ring-indigo-200"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              USDT
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  parseFloat(amount) === preset
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {amount && !isValidAmount && (
            <p className="text-xs text-red-500">{t('create.min')}</p>
          )}
        </div>

        {/* Divider */}
        <div className="my-6 h-px bg-slate-100" />

        {/* Chain selector */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">
            {t('create.chain')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(SUPPORTED_CHAINS) as Array<keyof typeof SUPPORTED_CHAINS>).map(
              (key) => {
                const chain = SUPPORTED_CHAINS[key];
                const isSelected = selectedChain === key;
                const isArbitrum = key === 'arbitrum' || key === 'arbitrumSepolia';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedChain(key)}
                    className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Network color dot */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                        isArbitrum
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      <span className="text-base font-bold">
                        {isArbitrum ? 'A' : 'P'}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-indigo-700' : 'text-slate-600'
                      }`}
                    >
                      {chain.name}
                    </span>
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-px -right-px h-5 w-5 rounded-bl-lg rounded-tr-[10px] bg-indigo-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Pot preview */}
        {numericAmount > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">
                {t('create.pot')}
              </span>
              <span className="text-xl font-bold text-slate-900">
                {potAmount} <span className="text-sm font-medium text-slate-400">USDT</span>
              </span>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {t('create.potHint')}
            </span>
          </div>
        )}

        {/* Create button */}
        <Button
          size="lg"
          className="mt-6 h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-200"
          onClick={handleCreateDuel}
          disabled={isLoading || (authenticated && !isValidAmount)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {isPending ? 'Confirm in wallet...' : 'Processing...'}
            </span>
          ) : !authenticated ? (
            t('nav.connectWallet')
          ) : (
            <>
              <Swords className="mr-2 h-4 w-4" />
              {t('create.button')}
            </>
          )}
        </Button>

        {error && (
          <p className="mt-3 text-xs text-red-500 text-center">
            {error.message.includes('User rejected')
              ? 'Transaction rejected'
              : 'Transaction failed'}
          </p>
        )}
      </div>

      {/* Trust badges */}
      <div className="mt-6 flex items-center justify-center gap-6 animate-fade-in animation-delay-300">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <DollarSign className="h-3.5 w-3.5" />
          <span>{t('create.noFees')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5" />
          <span>{t('create.smartContract')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="h-3.5 w-3.5" />
          <span>{t('create.instant')}</span>
        </div>
      </div>
    </div>
  );
}
