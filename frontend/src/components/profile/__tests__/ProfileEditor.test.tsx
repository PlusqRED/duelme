// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { Profile } from '@/lib/profile';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toast }));

const { ProfileEditor } = await import('@/components/profile/ProfileEditor');

const PROFILE: Profile = {
  walletAddress: '0xaaaa',
  nickname: 'alice',
  status: null,
  aboutMe: null,
  games: ['Chess'],
  socialLinks: null,
  createdAt: null,
  updatedAt: null,
};

const en = translations.en;
const updateProfile = vi.fn();

function edit(field: string) {
  fireEvent.click(screen.getByRole('button', { name: `Edit: ${field}` }));
}

beforeEach(() => {
  updateProfile.mockReset();
  updateProfile.mockResolvedValue(PROFILE);
  toast.success.mockClear();
  toast.error.mockClear();
});

afterEach(cleanup);

describe('ProfileEditor', () => {
  it('shows each field as it is, or what it is for while empty', () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);

    expect([screen.getByText('alice'), screen.getByText(en['profile.statusPlaceholder'])]).toHaveLength(2);
  });

  it('saves a field with the rest of the profile as it was', async () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.status']);

    fireEvent.change(screen.getByRole('textbox', { name: en['profile.status'] }), { target: { value: 'ready' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: en['profile.save'] })));

    expect(updateProfile).toHaveBeenCalledWith({ nickname: 'alice', status: 'ready', aboutMe: null, games: ['Chess'] });
    expect(toast.success).toHaveBeenCalledWith('toast.profileSaved');
  });

  it('saves a single-line field with Enter', async () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.nickname']);

    await act(async () => fireEvent.keyDown(screen.getByRole('textbox', { name: en['profile.nickname'] }), { key: 'Enter' }));

    expect(updateProfile).toHaveBeenCalledOnce();
  });

  it('leaves a field unsaved with Escape', () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.nickname']);

    fireEvent.keyDown(screen.getByRole('textbox', { name: en['profile.nickname'] }), { key: 'Escape' });

    expect([screen.queryByRole('textbox'), updateProfile.mock.calls.length]).toEqual([null, 0]);
  });

  it('keeps the field open and says so when the save fails', async () => {
    updateProfile.mockRejectedValue(new Error('down'));
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.nickname']);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: en['profile.save'] })));

    expect(toast.error).toHaveBeenCalledWith('toast.profileSaveFailed');
    expect(screen.getByRole('textbox', { name: en['profile.nickname'] })).toBeTruthy();
  });

  it('edits one field at a time', () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.nickname']);

    edit(en['profile.status']);

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('counts the characters left as they are typed', () => {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.nickname']);

    expect(screen.getByText('5/30')).toBeTruthy();
  });
});

describe('ProfileGamesField in the editor', () => {
  function editGames() {
    render(<ProfileEditor profile={PROFILE} isSaving={false} updateProfile={updateProfile} />);
    edit(en['profile.games']);
    return screen.getByRole('textbox', { name: en['profile.addGame'] });
  }

  it('adds a typed game with Enter', () => {
    const box = editGames();

    fireEvent.change(box, { target: { value: 'CS 2' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(screen.getByText('CS 2')).toBeTruthy();
  });

  it('takes a game off the list', () => {
    editGames();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Chess' }));

    expect(screen.queryByText('Chess')).toBeNull();
  });

  it('will not add a game already listed', () => {
    const box = editGames();

    fireEvent.change(box, { target: { value: 'chess' } });

    expect((screen.getByRole('button', { name: en['profile.addGame'] }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves a game still in the box with the rest', async () => {
    const box = editGames();
    fireEvent.change(box, { target: { value: 'Dota 2' } });

    await act(async () => fireEvent.click(screen.getByRole('button', { name: en['profile.save'] })));

    expect(updateProfile).toHaveBeenCalledWith({ nickname: 'alice', status: null, aboutMe: null, games: ['Chess', 'Dota 2'] });
  });
});
