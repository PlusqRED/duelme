'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, X, Swords, LogOut, User, Wallet, Globe, Send, Copy, Check, ChevronDown, KeyRound, Fuel, Instagram, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppToast } from '@/hooks/useAppToast';
import { useMyProfile } from '@/hooks/useMyProfile';
import { usePrivy, useExportWallet } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useReadContract, useBalance } from 'wagmi';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { SUPPORTED_CHAINS, USDT_DECIMALS } from '@/lib/constants';
import { emitBalanceRefreshBurst, subscribeToBalanceRefresh } from '@/lib/balanceRefresh';

const CHAIN_META: Record<number, { name: string; testnet?: boolean }> = {
  421614: { name: 'Arb Sepolia', testnet: true },
  42161: { name: 'Arbitrum' },
};

function getUsdtAddress(chainId: number | undefined) {
  if (chainId === 421614) return SUPPORTED_CHAINS.arbitrumSepolia.usdt;
  if (chainId === 42161) return SUPPORTED_CHAINS.arbitrum.usdt;
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
  const appToast = useAppToast();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(421614);
  const [balanceFlash, setBalanceFlash] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousTotalUsdtRef = useRef<string | null>(null);
  const { ready, authenticated, login, logout } = usePrivy();
  const { exportWallet } = useExportWallet();
  const { activeWallet, walletAddress } = useActiveWallet();
  const displayAddr = activeWallet?.address ?? '';
  const walletShort = displayAddr
    ? displayAddr.slice(0, 6) + '...' + displayAddr.slice(-4)
    : null;

  const { profile: myProfile } = useMyProfile();
  const displayName = myProfile?.nickname ?? walletShort ?? '';

  // Read balances from all chains
  const { data: arbSepoliaRaw, refetch: refetchArbSepolia } = useReadContract({
    address: SUPPORTED_CHAINS.arbitrumSepolia.usdt,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 421614,
    query: { enabled: !!walletAddress, refetchInterval: 30_000, staleTime: 0 },
  });

  const { data: arbRaw, refetch: refetchArb } = useReadContract({
    address: SUPPORTED_CHAINS.arbitrum.usdt,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 42161,
    query: { enabled: !!walletAddress, refetchInterval: 30_000, staleTime: 0 },
  });

  // Read ETH balance on selected chain (for gas)
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: walletAddress,
    chainId: selectedChain,
    query: { enabled: !!walletAddress, refetchInterval: 30_000, staleTime: 0 },
  });

  const ethBalance = ethBalanceData ? parseFloat(formatUnits(ethBalanceData.value, 18)) : 0;
  const formattedEth = ethBalance < 0.0001 && ethBalance > 0 ? '<0.0001' : ethBalance.toFixed(4);
  const lowGas = ethBalance < 0.0005;

  const balances: Record<number, number> = {
    421614: arbSepoliaRaw !== undefined ? parseFloat(formatUnits(arbSepoliaRaw, USDT_DECIMALS)) : 0,
    42161: arbRaw !== undefined ? parseFloat(formatUnits(arbRaw, USDT_DECIMALS)) : 0,
  };

  const balance = balances[selectedChain] ?? 0;
  const formattedUsdt = balance.toFixed(2);
  const totalUsdt = Object.values(balances).reduce((a, b) => a + b, 0).toFixed(2);
  const chainMeta = CHAIN_META[selectedChain];
  const usdtAddress = getUsdtAddress(selectedChain);

  const refetchBalances = useCallback(() => {
    void refetchArbSepolia();
    void refetchArb();
    void refetchEthBalance();
  }, [refetchArbSepolia, refetchArb, refetchEthBalance]);

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

  useEffect(() => subscribeToBalanceRefresh(() => {
    refetchBalances();
  }), [refetchBalances]);

  useEffect(() => {
    if (!authenticated) {
      previousTotalUsdtRef.current = null;
      setBalanceFlash(false);
      return;
    }

    if (previousTotalUsdtRef.current && previousTotalUsdtRef.current !== totalUsdt) {
      setBalanceFlash(true);
      const timeout = window.setTimeout(() => setBalanceFlash(false), 1400);
      previousTotalUsdtRef.current = totalUsdt;
      return () => window.clearTimeout(timeout);
    }

    previousTotalUsdtRef.current = totalUsdt;
    return undefined;
  }, [authenticated, totalUsdt]);

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

      appToast.success('toast.sentUsdt', { amount: sendAmount });
      setToAddress('');
      setSendAmount('');
      setWalletOpen(false);
      emitBalanceRefreshBurst();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('reject') || msg.includes('denied')) {
        appToast.error('toast.transactionRejected');
      } else {
        appToast.error('toast.transferFailed');
      }
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {Object.entries(CHAIN_META).map(([id, meta]) => {
            const chainId = Number(id);
            const isActive = selectedChain === chainId;
            return (
              <button
                key={id}
                onClick={() => setSelectedChain(chainId)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? meta.testnet
                      ? 'bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-200'
                      : 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {meta.name}
              </button>
            );
          })}
        </div>
        {chainMeta?.testnet && (
          <div className="flex items-center justify-center gap-1 rounded-md bg-amber-50 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-medium text-amber-700">Testnet</span>
          </div>
        )}
      </div>

      {/* Balance */}
      <div className={`rounded-lg px-3 py-2.5 transition-colors ${
        balanceFlash ? 'bg-emerald-50/80 ring-1 ring-emerald-200' : 'bg-slate-50'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{t('wallet.balance')}</span>
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
            chainMeta?.testnet
              ? 'bg-amber-50'
              : 'bg-emerald-50'
          }`}>
            <Globe className={`h-3 w-3 ${chainMeta?.testnet ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span className={`text-xs font-medium ${chainMeta?.testnet ? 'text-amber-700' : 'text-emerald-700'}`}>{chainMeta?.name}</span>
          </div>
        </div>
        <span className="text-lg font-bold text-slate-900">{formattedUsdt} <span className="text-sm font-normal text-slate-400">USDT</span></span>

        {/* ETH for gas */}
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Fuel className={`h-3 w-3 ${lowGas ? 'text-red-500' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${lowGas ? 'text-red-600' : 'text-slate-600'}`}>{formattedEth} ETH</span>
          </div>
          <span className="text-[10px] text-slate-400">gas</span>
        </div>
        {lowGas && (
          <p className="mt-1 text-[10px] text-red-500">
            {t('wallet.lowGasWarning')}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-200 pt-1.5">
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
                {t('wallet.max')}
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
        {/* Logo + socials */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-indigo-600" />
            <span className="text-lg font-bold text-slate-900">DuelMe</span>
          </Link>
          <div className="flex items-center gap-1">
            <a
              href="https://t.me/grapexel"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="Telegram"
              aria-label="Telegram"
            >
              <Send className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.instagram.com/rickes.oleg"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="Instagram"
              aria-label="Instagram"
            >
              <Instagram className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Right side — Desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {langToggle}

          <Link
            href="/games"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/games')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            {t('nav.games')}
          </Link>
          <Link
            href="/duels/open"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/duels/open')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Swords className="h-4 w-4" />
            {t('nav.openDuels')}
          </Link>

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

              {/* Profile link */}
              <Link href="/profile">
                <button
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith('/profile')
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  {displayName || t('nav.myProfile')}
                </button>
              </Link>

              {/* Wallet button + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setWalletOpen(!walletOpen)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all ${
                    balanceFlash
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
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
            <div className="flex items-center gap-1">
              <a
                href="https://t.me/grapexel"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Telegram"
                aria-label="Telegram"
              >
                <Send className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.instagram.com/rickes.oleg"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
            </div>
            {langToggle}
            <Link
              href="/games"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/games')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              {t('nav.games')}
            </Link>
            <Link
              href="/duels/open"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/duels/open')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Swords className="h-4 w-4" />
              {t('nav.openDuels')}
            </Link>
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
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
                    pathname.startsWith('/profile')
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600'
                  }`}>
                    <User className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium truncate">{displayName || t('nav.myProfile')}</span>
                  </div>
                </Link>
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
