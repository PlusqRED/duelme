'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import { PROFILE_LIMITS } from '@/lib/profile';
import type { ProfileRequest } from '@/lib/profile';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { truncateAddress } from '@/lib/utils';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ArrowLeft, Pencil, X, Check, Plus, User } from 'lucide-react';

type EditingField = 'nickname' | 'status' | 'firstName' | 'lastName' | 'gender' | 'aboutMe' | 'games' | null;

export default function MyProfilePage() {
  const { t, language } = useTranslation();
  const appToast = useAppToast();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  const { profile, isLoading, updateProfile, isSaving } = useMyProfile();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [gameInput, setGameInput] = useState('');
  const [editGames, setEditGames] = useState<string[]>([]);

  function startEdit(field: EditingField) {
    if (!field || !profile) {
      // New profile, use defaults
      if (field === 'games') {
        setEditGames([]);
        setGameInput('');
      } else {
        setEditValue('');
      }
      setEditingField(field);
      return;
    }

    if (field === 'games') {
      setEditGames(profile.games ?? []);
      setGameInput('');
    } else {
      setEditValue((profile[field] as string) ?? '');
    }
    setEditingField(field);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue('');
    setGameInput('');
    setEditGames([]);
  }

  async function saveField(field: Exclude<EditingField, null | 'games'>) {
    const limit = PROFILE_LIMITS[field];
    if (editValue.length > limit) return;

    const data: ProfileRequest = {
      nickname: profile?.nickname,
      status: profile?.status,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      gender: profile?.gender,
      aboutMe: profile?.aboutMe,
      games: profile?.games,
      [field]: editValue || null,
    };

    try {
      await updateProfile(data);
      appToast.success('toast.profileSaved');
      cancelEdit();
    } catch {
      appToast.error('toast.profileSaveFailed');
    }
  }

  async function saveGames() {
    const pending = gameInput.trim();
    const games = pending && !editGames.includes(pending)
      ? [...editGames, pending]
      : editGames;

    const data: ProfileRequest = {
      nickname: profile?.nickname,
      status: profile?.status,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      gender: profile?.gender,
      aboutMe: profile?.aboutMe,
      games,
    };

    try {
      await updateProfile(data);
      appToast.success('toast.profileSaved');
      cancelEdit();
    } catch {
      appToast.error('toast.profileSaveFailed');
    }
  }

  function addGame() {
    const tag = gameInput.trim();
    if (!tag || tag.length > PROFILE_LIMITS.gameTag || editGames.length >= PROFILE_LIMITS.gamesMax) return;
    if (editGames.includes(tag)) return;
    setEditGames([...editGames, tag]);
    setGameInput('');
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">{t('profile.signInToEdit')}</p>
        <Button className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700" onClick={login}>
          {t('nav.connectWallet')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const nickname = profile?.nickname;
  const displayName = nickname ?? truncateAddress(walletAddress ?? '');

  function renderField(
    field: Exclude<EditingField, null | 'games'>,
    label: string,
    placeholder: string,
    multiline = false,
  ) {
    const limit = PROFILE_LIMITS[field];
    const isEditing = editingField === field;
    const value = profile?.[field] as string | null;

    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              {multiline ? (
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  maxLength={limit}
                />
              ) : (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  maxLength={limit}
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveField(field);
                    }
                  }}
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t('profile.charCount', { count: editValue.length, max: limit })}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={() => saveField(field)}
                    disabled={isSaving || editValue.length > limit}
                  >
                    {isSaving ? t('profile.saving') : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
              {value || placeholder}
            </p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => startEdit(field)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.dashboard')}
      </Link>

      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
              <User className="h-8 w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              {profile?.status && (
                <p className="mt-1 text-sm text-white/80 truncate">{profile.status}</p>
              )}
              {walletAddress && (
                <p className="mt-1 font-mono text-xs text-white/60">{truncateAddress(walletAddress)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {/* Core fields */}
          {renderField('nickname', t('profile.nickname'), t('profile.nicknamePlaceholder'))}
          {renderField('status', t('profile.status'), t('profile.statusPlaceholder'))}

          {/* Personal info */}
          <div className="grid gap-4 sm:grid-cols-2">
            {renderField('firstName', t('profile.firstName'), '—')}
            {renderField('lastName', t('profile.lastName'), '—')}
          </div>
          {renderField('gender', t('profile.gender'), '—')}
          {renderField('aboutMe', t('profile.aboutMe'), t('profile.aboutMePlaceholder'), true)}

          {/* Games */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('profile.games')}</span>
              {editingField !== 'games' && (
                <button
                  onClick={() => startEdit('games')}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {editingField === 'games' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {editGames.map((game) => (
                    <span
                      key={game}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                    >
                      {game}
                      <button
                        onClick={() => setEditGames(editGames.filter((g) => g !== game))}
                        className="ml-0.5 text-indigo-400 hover:text-indigo-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={gameInput}
                    onChange={(e) => setGameInput(e.target.value)}
                    placeholder={t('profile.gamesPlaceholder')}
                    maxLength={PROFILE_LIMITS.gameTag}
                    className="h-9 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addGame();
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={addGame} disabled={!gameInput.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                    {t('profile.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={saveGames}
                    disabled={isSaving}
                  >
                    {isSaving ? t('profile.saving') : t('profile.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.games && profile.games.length > 0 ? (
                  profile.games.map((game) => (
                    <span
                      key={game}
                      className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                    >
                      {game}
                    </span>
                  ))
                ) : (
                  <span className="text-sm italic text-slate-400">{t('profile.gamesPlaceholder')}</span>
                )}
              </div>
            )}
          </div>

          {/* Account info */}
          <div className="grid gap-4 sm:grid-cols-2">
            {profile?.createdAt && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('profile.memberSince')}
                </div>
                <p className="text-sm text-slate-900">
                  {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
                </p>
              </div>
            )}
            {profile?.updatedAt && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('profile.lastUpdated')}
                </div>
                <p className="text-sm text-slate-900">
                  {new Date(profile.updatedAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
                </p>
              </div>
            )}
          </div>

          {walletAddress && (
            <div className="flex justify-center">
              <ReputationBadge address={walletAddress as `0x${string}`} chainId={SUPPORTED_CHAINS.arbitrumSepolia.id} showStats />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
