'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Menu, X, Swords, LogOut, User, Wallet, Globe, Send, Copy, Check, ChevronDown, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { usePrivy, useWallets, useExportWallet } from '@privy-io/react-auth';
import { useReadContract } from 'wagmi';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { SUPPORTED_CHAINS, USDT_DECIMALS } from '@/lib/constants';
import { toast } from 'sonner';

const CHAIN_NAMES: Record<number, string> = {
  421614: 'Arb Sepolia',
  42161: 'Arbitrum',
  137: 'Polygon',
};

function getUsdtAddress(chainId: number | undefined) {
  if (chainId === 421614) return SUPPORTED_CHAINS.arbitrumSepolia.usdt;
  if (chainId === 42161) return SUPPORTED_CHAINS.arbitrum.usdt;
  if (chainId === 137) return SUPPORTED_CHAINS.polygon.usdt;
  return undefined;
}

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

export function Header() {
  const { t, language, setLanguage } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState<42161 | 137>(42161);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();

  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address as `0x${string}` | undefined;
  const walletShort = walletAddress
    ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)
    : null;

  const displayName = user?.google?.name
    ?? user?.email?.address?.split('@')[0]
    ?? walletShort
    ?? '';

  // Read balances from both chains
  const { data: arbRaw, refetch: refetchArb } = useReadContract({
    address: SUPPORTED_CHAINS.arbitrum.usdt,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 42161,
    query: { enabled: !!walletAddress },
  });

  const { data: polyRaw, refetch: refetchPoly } = useReadContract({
    address: SUPPORTED_CHAINS.polygon.usdt,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 137,
    query: { enabled: !!walletAddress },
  });

  const arbBalance = arbRaw !== undefined ? parseFloat(formatUnits(arbRaw, USDT_DECIMALS)) : 0;
  const polyBalance = polyRaw !== undefined ? parseFloat(formatUnits(polyRaw, USDT_DECIMALS)) : 0;

  const balance = selectedChain === 42161 ? arbBalance : polyBalance;
  const formattedUsdt = balance.toFixed(2);
  const totalUsdt = (arbBalance + polyBalance).toFixed(2);
  const chainName = CHAIN_NAMES[selectedChain];
  const usdtAddress = getUsdtAddress(selectedChain);

  function refetch() {
    refetchArb();
    refetchPoly();
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWalletOpen(false);
      }
    }
    if (walletOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [walletOpen]);

  async function handleCopy() {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!toAddress || !sendAmount || !usdtAddress || !activeWallet || !walletAddress) return;

    const num = parseFloat(sendAmount);
    if (num <= 0 || num > balance) {
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
      const raw = parseUnits(sendAmount, USDT_DECIMALS);
      const data = encodeFunctionData({
        abi: transferAbi,
        functionName: 'transfer',
        args: [toAddress as `0x${string}`, raw],
      });

      await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: usdtAddress, data }],
      });

      toast.success(`Sent ${sendAmount} USDT`);
      setToAddress('');
      setSendAmount('');
      setWalletOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg.includes('reject') || msg.includes('denied') ? 'Transaction rejected' : 'Transfer failed');
    } finally {
      setIsSending(false);
    }
  }

  const langToggle = (
    <div className="flex items-center rounded-lg border border-slate-200 p-0.5">
      <button
        onClick={() => setLanguage('en')}
        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
          language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ru')}
        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
          language === 'ru' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        RU
      </button>
    </div>
  );

  // Wallet dropdown panel (shared between desktop & mobile)
  const walletDropdown = (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      {/* Address */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{walletShort}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t('wallet.copied') : t('wallet.copy')}
        </button>
      </div>

      {/* Chain switcher */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
        <button
          onClick={() => setSelectedChain(42161)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedChain === 42161
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Arbitrum
        </button>
        <button
          onClick={() => setSelectedChain(137)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedChain === 137
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Polygon
        </button>
      </div>

      {/* Balance */}
      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{t('wallet.balance')}</span>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
            <Globe className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">{chainName}</span>
          </div>
        </div>
        <span className="text-lg font-bold text-slate-900">{formattedUsdt} <span className="text-sm font-normal text-slate-400">USDT</span></span>
        <div className="mt-1 flex items-center gap-1.5 border-t border-slate-200 pt-1.5">
          <span className="text-[10px] text-slate-400">{t('wallet.totalChains')}</span>
          <span className="text-[10px] font-semibold text-slate-500">{totalUsdt} USDT</span>
        </div>
      </div>

      {/* Send form */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-600">{t('wallet.sendUsdt')}</span>
        <Input
          placeholder={t('wallet.recipientPlaceholder')}
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          className="h-9 border-slate-200 font-mono text-xs"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder={t('wallet.amountPlaceholder')}
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              className="h-9 border-slate-200 pr-14 text-sm"
            />
            <button
              onClick={() => setSendAmount(balance.toString())}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100"
            >
              MAX
            </button>
          </div>
          <Button
            onClick={handleSend}
            disabled={isSending || !toAddress || !sendAmount}
            size="sm"
            className="h-9 bg-indigo-600 px-3 text-white hover:bg-indigo-700"
          >
            {isSending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Export private key */}
      <button
        onClick={exportWallet}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {t('wallet.exportKey')}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-indigo-600" />
          <span className="text-lg font-bold text-slate-900">DuelMe</span>
        </Link>

        {/* Right side — Desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {langToggle}

          {ready && authenticated ? (
            <div className="flex items-center gap-2">
              {/* My Duels link */}
              <Link href="/dashboard">
                <button
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <Swords className="h-3.5 w-3.5" />
                  {t('nav.dashboard')}
                </button>
              </Link>

              {/* User name */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{displayName}</span>
              </div>

              {/* Wallet button + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setWalletOpen(!walletOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <Wallet className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700">{totalUsdt}</span>
                  <span className="text-xs text-slate-400">USDT</span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${walletOpen ? 'rotate-180' : ''}`} />
                </button>

                {walletOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80">
                    {walletDropdown}
                  </div>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-slate-700">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={login} disabled={!ready}>
              {t('nav.connectWallet')}
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:text-slate-900 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex items-center gap-2">
            {langToggle}
            {ready && authenticated ? (
              <div className="flex flex-1 items-center gap-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                  <button
                    className={`flex w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === '/dashboard'
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    <Swords className="h-3.5 w-3.5" />
                    {t('nav.dashboard')}
                  </button>
                </Link>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 truncate">{displayName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-slate-700">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" className="flex-1" onClick={login} disabled={!ready}>
                {t('nav.connectWallet')}
              </Button>
            )}
          </div>

          {/* Mobile wallet panel */}
          {ready && authenticated && (
            <div className="mt-3">
              {walletDropdown}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
