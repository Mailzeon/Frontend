'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Lock, Save, Wallet, Phone, Camera, Loader2, Bell, BellOff, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isTelegramMiniApp, supportsTelegramContactRequest, requestTelegramPhoneNumber } from '@/lib/telegram';
import {
  isPushSupported, getExistingSubscription,
  enablePushNotifications, disablePushNotifications,
} from '@/lib/pushNotifications';

interface ProfilePageProps {
  /** Worker-only: shows UPI/bank default payment details section */
  showPaymentDetails?: boolean;
}

export function ProfilePage({ showPaymentDetails = false }: ProfilePageProps) {
  const { user, updateUser, clearAuth } = useAuthStore();
  const router = useRouter();

  // ── Profile picture ───────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Allow re-selecting the same file next time
    if (!file) return;

    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const { data } = await api.post('/users/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        updateUser({ profileImage: data.data.profileImage });
        toast.success('Profile picture updated.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Telegram-origin accounts get an internal placeholder email (see
  // backend auth.service.ts telegramLogin()) — showing that raw string as
  // if it were a real, user-set email is confusing ("why do I have this
  // random address?"). Treated everywhere below as if the email field is
  // simply empty, inviting them to set a real one.
  const isPlaceholderTelegramEmail = (email?: string): boolean =>
    !!email && /^tg_\d+@telegram\.mailzeon\.internal$/.test(email);
  const hasNoRealEmail = isPlaceholderTelegramEmail(user?.email);

  // ── Profile info form ─────────────────────────────────────────────────────
  const [name, setName]           = useState(user?.name ?? '');
  // NEW: email is now editable — it used to be permanently locked, but
  // that left anyone whose email failed verification with no way to fix
  // it. Re-verified on every change (see saveProfile()). Starts blank
  // (not the raw placeholder) for a Telegram-origin account with no real
  // email set yet — see hasNoRealEmail above.
  const [email, setEmail]         = useState(hasNoRealEmail ? '' : (user?.email ?? ''));
  // NEW: phone — required by Cashfree before a customer can place an order.
  // Editable here so it can be set up-front instead of only at checkout time.
  const [phone, setPhone]         = useState(user?.phone ?? '');
  // Only ever shown for accounts with a real Telegram identity, actually
  // running inside the Telegram Mini App WebView right now, AND on a
  // platform (Android/iOS) where Telegram actually supports the native
  // "share your number" popup — see lib/telegram.ts
  // supportsTelegramContactRequest() for why Desktop/Web are excluded.
  const [fetchingTgPhone, setFetchingTgPhone] = useState(false);
  const showTelegramPhoneButton = !!user?.telegramId && isTelegramMiniApp() && supportsTelegramContactRequest();

  const handleFillFromTelegram = async () => {
    setFetchingTgPhone(true);
    try {
      const number = await requestTelegramPhoneNumber();
      if (number) {
        setPhone(number);
        toast.success('Number filled in from Telegram — tap Save Changes to verify it.');
      } else {
        toast.error("Couldn't get a usable number from Telegram — you can type it in manually instead.");
      }
    } finally {
      setFetchingTgPhone(false);
    }
  };
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password change form ──────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Worker payment details ────────────────────────────────────────────────
  const [upiId, setUpiId] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name cannot be empty.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: name.trim(),
        ...(email.trim().toLowerCase() !== user?.email ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      if (data.success) {
        // Use the backend's returned user object directly rather than a
        // manual partial merge — phoneVerified/emailVerificationStatus are
        // computed server-side (see user.routes.ts PUT /profile), so
        // building it by hand here would just guess wrong.
        updateUser(data.data);
        const emailChanged = email.trim().toLowerCase() !== user?.email;
        const phoneChanged = phone.trim() && phone.trim() !== user?.phone;
        toast.success(
          emailChanged && phoneChanged ? 'Email and phone verified — profile updated!'
          : emailChanged ? 'Email verified and profile updated!'
          : phoneChanged ? 'Phone verified and profile updated!'
          : 'Profile updated successfully.'
        );
      }
    } catch (err: any) {
      // Backend gives a specific reason (invalid number, VOIP rejected,
      // email doesn't exist, provider unreachable) — surface it as-is
      // rather than a generic failure message, since the person needs to
      // know WHAT to fix.
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { toast.error('Fill in all password fields.'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match.'); return; }

    setChangingPassword(true);
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (data.success) {
        toast.success('Password changed successfully.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const savePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) { toast.error('Enter a UPI ID.'); return; }
    setSavingPayment(true);
    try {
      const { data } = await api.put('/users/profile', { upiId: upiId.trim() });
      if (data.success) {
        toast.success('Default UPI ID saved. You can still enter a different one at withdrawal time.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save payment details.');
    } finally {
      setSavingPayment(false);
    }
  };

  // ── Push notifications (order alerts even when the site is closed) ────────
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled]     = useState(false);
  const [pushLoading, setPushLoading]     = useState(false);
  const [pushChecked, setPushChecked]     = useState(false);

  useEffect(() => {
    setPushSupported(isPushSupported());
    getExistingSubscription()
      .then(sub => setPushEnabled(!!sub))
      .finally(() => setPushChecked(true));
  }, []);

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
        toast.info('Push notifications turned off.');
      } else {
        await enablePushNotifications();
        setPushEnabled(true);
        toast.success('Push notifications enabled! You\'ll get alerts even when the site is closed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update push notification settings.');
    } finally {
      setPushLoading(false);
    }
  };

  // ── Delete my account ──────────────────────────────────────────────────
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText]  = useState('');
  const [deletingAccount, setDeletingAccount]      = useState(false);

  const deleteMyAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Type DELETE exactly to confirm.');
      return;
    }
    setDeletingAccount(true);
    try {
      const { data } = await api.delete('/users/me');
      if (data.success) {
        toast.success('Your account has been deleted.');
        clearAuth();
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your account details</p>
      </div>

      {/* Unverified phone — blocks placing/accepting orders, see
          order.service.ts createOrder()/acceptOrder() */}
      {!user?.phoneVerified && (
        <div className="glass-card p-4 border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <Phone className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Verify your phone number</p>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              You need a verified phone number to place or accept orders. Add one below — it's checked
              instantly and only takes a moment.
            </p>
          </div>
        </div>
      )}

      {/* Profile picture */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-purple-600/20 border-2 border-purple-500/30 flex items-center justify-center overflow-hidden">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-purple-300">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 border-2 border-[#08080D] flex items-center justify-center transition-colors disabled:opacity-60"
            title="Change profile picture"
          >
            {uploadingImage ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">JPG, PNG or WEBP — max 5MB</p>
        </div>
      </div>

      {/* Push notifications */}
      {pushChecked && pushSupported && (
        <div className="glass-card p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              {pushEnabled ? <Bell className="w-5 h-5 text-purple-400" /> : <BellOff className="w-5 h-5 text-gray-500" />}
            </div>
            <div>
              <p className="font-medium text-white text-sm">Push Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Get alerted on this device even when Mailzeon isn't open
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={pushEnabled ? 'outline' : 'default'}
            size="sm"
            loading={pushLoading}
            onClick={togglePush}
          >
            {pushEnabled ? 'Turn off' : 'Enable'}
          </Button>
        </div>
      )}

      {/* Profile info */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-purple-400" />
          <h2 className="font-semibold text-white">Account Information</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Email address</Label>
              {hasNoRealEmail && (
                <span className="text-[10px] font-semibold text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                  No email set — Telegram account
                </span>
              )}
              {!hasNoRealEmail && user?.emailVerificationStatus === 'valid' && (
                <span className="text-[10px] font-semibold text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                  ✓ Verified
                </span>
              )}
              {!hasNoRealEmail && user?.emailVerificationStatus === 'invalid' && (
                <span className="text-[10px] font-semibold text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                  ⛔ Doesn't exist
                </span>
              )}
              {!hasNoRealEmail && (!user?.emailVerificationStatus || user?.emailVerificationStatus === 'unknown') && (
                <span className="text-[10px] font-semibold text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                  Not confirmed
                </span>
              )}
            </div>
            <Input type="email" placeholder={hasNoRealEmail ? 'you@example.com' : undefined} value={email} onChange={e => setEmail(e.target.value)} />
            <p className="text-xs text-gray-500">
              {hasNoRealEmail
                ? "You signed up via Telegram, so there's no email on file yet. Add one to enable email notifications and account recovery."
                : user?.emailVerificationStatus === 'invalid'
                ? "This address doesn't appear to exist — please update it, or you won't be able to place or accept orders."
                : 'This is your login email. Changing it will re-verify it.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone number
              </Label>
              {user?.phoneVerified ? (
                <span className="text-[10px] font-semibold text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                  Not verified
                </span>
              )}
            </div>
            <Input
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
            {showTelegramPhoneButton && (
              <button
                type="button"
                onClick={handleFillFromTelegram}
                disabled={fetchingTgPhone}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium disabled:opacity-50"
              >
                {fetchingTgPhone ? 'Asking Telegram…' : '📱 Fill in from Telegram'}
              </button>
            )}
            <p className="text-xs text-gray-500">
              {user?.phoneVerified
                ? 'Required to place or accept orders. Changing this will re-verify it.'
                : 'A real, active mobile number is required to place or accept orders — VOIP/virtual numbers are not accepted.'}
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-purple-400" />
          <h2 className="font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={changingPassword}>
              <Lock className="w-4 h-4 mr-2" /> Change Password
            </Button>
          </div>
        </form>
      </div>

      {/* Worker-only: default payment details */}
      {showPaymentDetails && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-purple-400" />
            <h2 className="font-semibold text-white">Default Payment Details</h2>
          </div>
          <form onSubmit={savePaymentDetails} className="space-y-4">
            <div className="space-y-1.5">
              <Label>UPI ID</Label>
              <Input placeholder="yourname@okhdfcbank" value={upiId} onChange={e => setUpiId(e.target.value)} />
              <p className="text-xs text-gray-500">
                Saving this here is optional — you can also enter a UPI ID directly when requesting a withdrawal.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingPayment}>
                <Save className="w-4 h-4 mr-2" /> Save UPI ID
              </Button>
            </div>
          </form>
        </div>
      )}
      {/* Danger zone — delete my account */}
      <div className="glass-card p-5 border border-red-500/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-white">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Permanently deletes your account. Your name and email will be removed and you won't be
          able to log in again. Any orders, transactions, or ratings tied to your account stay in
          the system as they were — this only removes your ability to sign in as this account.
        </p>
        <Button variant="destructive" onClick={() => { setDeleteConfirmText(''); setShowDeleteAccount(true); }}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
        </Button>
      </div>

      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Your Account?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
              This cannot be undone. If you have any order still in progress, deletion will be
              blocked until it's finished, cancelled, or resolved.
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="font-mono text-white">DELETE</span> to confirm</Label>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>Cancel</Button>
              <Button variant="destructive" loading={deletingAccount} onClick={deleteMyAccount}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
