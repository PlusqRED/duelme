'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, encodeFunctionData } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { SUPPORTED_CHAINS, USDT_DECIMALS } from '@/lib/constants';
import { Send, KeyRound, Wallet, Copy, Check } from 'lucide-react';

const balanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const transferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

function getUsdtAddress(chainId: number | undefined) {
  if (chainId === 421614) return SUPPORTED_CHAINS.arbitrumSepolia.usdt;
  if (chainId === 42161) return SUPPORTED_CHAINS.arbitrum.usdt;
  if (chainId === 137) return SUPPORTED_CHAINS.polygon.usdt;
  return undefined;
}

export function WalletSection() {
  const { authenticated, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const chainId = useChainId();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address as `0x${string}` | undefined;
  const usdtAddress = getUsdtAddress(chainId);

  const { data: usdtRaw, refetch } = useReadContract({
    address: usdtAddress,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: { enabled: !!walletAddress && !!usdtAddress },
  });

  const balance = usdtRaw !== undefined
    ? parseFloat(formatUnits(usdtRaw, USDT_DECIMALS))
    : 0;

  const formattedBalance = balance.toFixed(2);

  if (!authenticated || !walletAddress) return null;

  async function handleWithdraw() {
    if (!toAddress || !amount || !usdtAddress || !activeWallet) return;

    const numAmount = parseFloat(amount);
    if (numAmount <= 0 || numAmount > balance) {
      toast.error('Invalid amount');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      toast.error('Invalid address');
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

      toast.success(`Sent ${amount} USDT`);
      setToAddress('');
      setAmount('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      if (msg.includes('rejected') || msg.includes('denied')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Transfer failed');
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
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Address + balance */}
        <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Your address</span>
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <span className="font-mono text-sm text-slate-700 break-all">{walletAddress}</span>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs font-medium text-slate-500">USDT Balance</span>
            <span className="text-lg font-bold text-slate-900">{formattedBalance} USDT</span>
          </div>
        </div>

        {/* Withdraw */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-slate-700">Send USDT</span>
          <Input
            placeholder="Recipient address (0x...)"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="h-10 border-slate-300 font-mono text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 border-slate-300 pr-16 text-sm"
              />
              <button
                onClick={() => setAmount(balance.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                MAX
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
          Export Private Key
        </Button>
      </CardContent>
    </Card>
  );
}
