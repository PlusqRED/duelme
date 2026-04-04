'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseUnits, encodeFunctionData, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppToast } from '@/hooks/useAppToast';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useReadContract, useChainId } from 'wagmi';
import { USDT_DECIMALS } from '@/lib/constants';
import { balanceOfAbi, transferAbi, getUsdtAddress } from '@/lib/contracts';
import { Send, KeyRound, Wallet, Copy, Check } from 'lucide-react';
import { emitBalanceRefreshBurst, subscribeToBalanceRefresh } from '@/lib/balanceRefresh';

export function WalletSection() {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const { authenticated, exportWallet } = usePrivy();
  const chainId = useChainId();
  const { activeWallet, walletAddress } = useActiveWallet();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const usdtAddress = getUsdtAddress(chainId);

  const { data: usdtRaw, refetch } = useReadContract({
    address: usdtAddress,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: { enabled: !!walletAddress && !!usdtAddress, refetchInterval: 30_000, staleTime: 0 },
  });

  const balance = usdtRaw !== undefined
    ? parseFloat(formatUnits(usdtRaw, USDT_DECIMALS))
    : 0;

  const formattedBalance = balance.toFixed(2);

  const refetchBalance = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => subscribeToBalanceRefresh(() => {
    refetchBalance();
  }), [refetchBalance]);

  if (!authenticated || !walletAddress) return null;

  async function handleWithdraw() {
    if (!toAddress || !amount || !usdtAddress || !activeWallet) return;

    const numAmount = parseFloat(amount);
    if (numAmount <= 0 || numAmount > balance) {
      appToast.error('toast.invalidAmount');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      appToast.error('toast.invalidAddress');
      return;
    }

    setIsSending(true);
    try {
      const provider = await activeWallet.getEthereumProvider();
      const rawAmount = parseUnits(amount, USDT_DECIMALS);
      const data = encodeFunctionData({
        abi: transferAbi,
        functionName: 'transfer',
        args: [toAddress as `0x${string}`, rawAmount],
      });

      await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: usdtAddress,
          data,
        }],
      });

      appToast.success('toast.sentUsdt', { amount });
      setToAddress('');
      setAmount('');
      emitBalanceRefreshBurst();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('rejected') || msg.includes('denied')) {
        appToast.error('toast.transactionRejected');
      } else {
        appToast.error('toast.transferFailed');
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleCopyAddress() {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Wallet className="h-5 w-5 text-indigo-500" />
          {t('wallet.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Address + balance */}
        <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('wallet.addressLabel')}</span>
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t('wallet.copied') : t('wallet.copy')}
            </button>
          </div>
          <span className="font-mono text-sm text-slate-700 break-all">{walletAddress}</span>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs font-medium text-slate-500">{t('wallet.usdtBalance')}</span>
            <span className="text-lg font-bold text-slate-900">{formattedBalance} USDT</span>
          </div>
        </div>

        {/* Withdraw */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-slate-700">{t('wallet.sendUsdt')}</span>
          <Input
            placeholder={t('wallet.recipientPlaceholder')}
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="h-10 border-slate-300 font-mono text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder={t('wallet.amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 border-slate-300 pr-16 text-sm"
              />
              <button
                onClick={() => setAmount(balance.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {t('wallet.max')}
              </button>
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={isSending || !toAddress || !amount}
              className="h-10 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isSending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Export wallet */}
          <Button
            variant="outline"
            onClick={exportWallet}
            className="w-full border-slate-300 text-slate-600 hover:text-slate-900"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {t('wallet.exportKey')}
          </Button>
      </CardContent>
    </Card>
  );
}
