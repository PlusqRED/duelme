'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { SUPPORTED_CHAINS, MIN_WAGER } from '@/lib/constants';

export function CreateDuelForm() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState<'arbitrum' | 'polygon'>(
    'arbitrum'
  );
  const [isLoading, setIsLoading] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= MIN_WAGER;

  async function handleCreateDuel() {
    if (!isValidAmount) {
      toast.error(t('create.min'));
      return;
    }

    setIsLoading(true);
    // Wallet integration will be added when Privy is connected
    toast.error(t('nav.connectWallet'));
    setIsLoading(false);
  }

  return (
    <Card className="mx-auto w-full max-w-md border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          {t('create.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Amount input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="wager-amount"
            className="text-sm font-medium text-gray-700"
          >
            {t('create.amount')}
          </label>
          <div className="relative">
            <Input
              id="wager-amount"
              type="number"
              min={MIN_WAGER}
              step="1"
              placeholder={t('create.amountPlaceholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 border-gray-300 pr-16 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
              USDT
            </span>
          </div>
          {amount && !isValidAmount && (
            <p className="text-xs text-red-500">{t('create.min')}</p>
          )}
        </div>

        {/* Chain selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            {t('create.chain')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SUPPORTED_CHAINS) as Array<keyof typeof SUPPORTED_CHAINS>).map(
              (key) => {
                const chain = SUPPORTED_CHAINS[key];
                const isSelected = selectedChain === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedChain(key)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                    {chain.name}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Create button */}
        <Button
          size="lg"
          className="h-11 w-full bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={handleCreateDuel}
          disabled={isLoading || !isValidAmount}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t('create.button')}
            </span>
          ) : (
            t('create.button')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
