'use client';
import { useState } from 'react';
import { User as UserIcon, Lock, Save, Wallet, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface ProfilePageProps {
  /** Worker-only: shows UPI/bank default payment details section */
  showPaymentDetails?: boolean;
}

export function ProfilePage({ showPaymentDetails = false }: ProfilePageProps) {
  const { user, updateUser } = useAuthStore();

  // ── Profile info form ─────────────────────────────────────────────────────
  const [name, setName]           = useState(user?.name ?? '');
  // NEW: phone — required by Cashfree before a customer can place an order.
  // Editable here so it can be set up-front instead of only at checkout time.
  const [phone, setPhone]         = useState(user?.phone ?? '');
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
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      if (data.success) {
        updateUser({ name: name.trim(), phone: phone.trim() || user?.phone });
        toast.success('Profile updated successfully.');
      }
    } catch (err: any) {
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your account details</p>
      </div>

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
            <Label>Email address</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-gray-500">Email cannot be changed.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone number
            </Label>
            <Input
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
            <p className="text-xs text-gray-500">
              Required to place orders — used by our payment partner to process your payment.
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
    </div>
  );
}
