import { FormEvent, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Globe,
  LogOut,
  MapPin,
  Package,
  Search,
  ShieldAlert,
  Smartphone,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CrmCustomerFlag,
  CustomerGender,
  CustomerMessageRecord,
  CustomerProfile,
  OrderRecord,
} from '../../types';
import { CrmCustomerSummary, exportCustomersToCsv } from '../../utils/adminLogic';
import { joinFirstLastName, splitFullName } from '../../utils/customerAccountLogic';
import {
  BanDurationPreset,
  computeTemporaryBanExpiryIso,
  evaluateCustomerAccess,
} from '../../utils/customerModerationLogic';
import { formatINR, getCustomerOrders } from '../../utils/storeLogic';

interface AdminCustomersTabProps {
  crmCustomers: CrmCustomerSummary[];
  customers?: CustomerProfile[];
  orders?: OrderRecord[];
  customerMessages?: CustomerMessageRecord[];
  onSetCustomerFlag: (phoneOrKey: string, flag: CrmCustomerFlag) => void;
  onUpdateCustomerAdmin?: (updated: CustomerProfile) => void;
  onAdjustCustomerWallet?: (customer: CustomerProfile, deltaAmount: number, note: string) => void;
  onForceLogoutCustomer?: (customer: CustomerProfile) => void;
  onToggleCustomerStatus?: (customer: CustomerProfile) => void;
}

const CRM_FLAGS: CrmCustomerFlag[] = ['VIP', 'Standard', 'High-Risk RTO'];

function flagStyle(flag: CrmCustomerFlag): string {
  switch (flag) {
    case 'VIP':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
    case 'High-Risk RTO':
      return 'bg-red-500/15 text-red-700 dark:text-red-300';
    default:
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  }
}

export function AdminCustomersTab({
  crmCustomers,
  customers = [],
  orders = [],
  customerMessages = [],
  onSetCustomerFlag,
  onUpdateCustomerAdmin,
  onAdjustCustomerWallet,
  onForceLogoutCustomer,
  onToggleCustomerStatus,
}: AdminCustomersTabProps) {
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState<CrmCustomerFlag | 'All'>('All');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedCrmFallback, setSelectedCrmFallback] = useState<CrmCustomerSummary | null>(null);

  // Manage drawer local drafts
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<CustomerGender | ''>('');
  const [editLanguage, setEditLanguage] = useState<'en' | 'hi'>('en');
  const [walletMode, setWalletMode] = useState<'credit' | 'debit'>('credit');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [drawerMessage, setDrawerMessage] = useState('');
  const [drawerError, setDrawerError] = useState('');

  // Temporary Ban / Permanent Block state
  const [banPreset, setBanPreset] = useState<BanDurationPreset>('24h');
  const [customBanDate, setCustomBanDate] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');

  const selectedProfile = useMemo(
    () => (selectedProfileId ? customers.find((c) => c.id === selectedProfileId) ?? null : null),
    [selectedProfileId, customers]
  );

  const openManageDrawer = (profile: CustomerProfile | undefined, summary: CrmCustomerSummary) => {
    setSelectedCrmFallback(summary);
    if (profile) {
      const split = splitFullName(profile.fullName);
      setSelectedProfileId(profile.id);
      setEditFirstName(profile.firstName ?? split.firstName);
      setEditLastName(profile.lastName ?? split.lastName);
      setEditPhone(profile.phone);
      setEditEmail(profile.email);
      setEditGender(profile.gender ?? '');
      setEditLanguage(profile.preferredLanguage ?? 'en');
      setBanReasonInput(profile.banReason ?? '');
    } else {
      setSelectedProfileId(null);
      setBanReasonInput('');
    }
    setBanPreset('24h');
    setCustomBanDate('');
    setWalletMode('credit');
    setWalletAmount('');
    setWalletNote('');
    setDrawerMessage('');
    setDrawerError('');
  };

  const handleSaveProfileEdit = (e: FormEvent) => {
    e.preventDefault();
    setDrawerError('');
    if (!selectedProfile || !onUpdateCustomerAdmin) return;
    const fullName = joinFirstLastName(editFirstName, editLastName) || selectedProfile.fullName;
    const updated: CustomerProfile = {
      ...selectedProfile,
      firstName: editFirstName.trim() || undefined,
      lastName: editLastName.trim() || undefined,
      fullName,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      gender: editGender || undefined,
      preferredLanguage: editLanguage,
    };
    onUpdateCustomerAdmin(updated);
    setDrawerMessage('Customer profile saved and synced live.');
  };

  const handleApplyWalletAdjustment = (e: FormEvent) => {
    e.preventDefault();
    setDrawerError('');
    if (!selectedProfile || !onAdjustCustomerWallet) return;
    const num = Math.round(Number(walletAmount) || 0);
    if (num <= 0) {
      setDrawerError('Enter a valid wallet amount greater than ₹0.');
      return;
    }
    const delta = walletMode === 'credit' ? num : -num;
    onAdjustCustomerWallet(selectedProfile, delta, walletNote.trim());
    setWalletAmount('');
    setWalletNote('');
    setDrawerMessage(
      `${walletMode === 'credit' ? 'Credited' : 'Debited'} ₹${num} ${
        walletMode === 'credit' ? 'to' : 'from'
      } ${selectedProfile.fullName}'s BEE4 Wallet.`
    );
  };

  const handleTemporaryBan = () => {
    setDrawerError('');
    if (!selectedProfile || !onUpdateCustomerAdmin) return;
    const reason = banReasonInput.trim();
    if (reason.length < 3) {
      setDrawerError('Please enter a mandatory ban reason before applying a Temporary Ban.');
      return;
    }
    const expiryIso = computeTemporaryBanExpiryIso(banPreset, customBanDate);
    if (!expiryIso) {
      setDrawerError('Please pick a valid future custom date & time for the temporary ban.');
      return;
    }
    const nowIso = new Date().toISOString();
    onUpdateCustomerAdmin({
      ...selectedProfile,
      accountStatus: 'Suspended',
      banType: 'temporary',
      bannedUntil: expiryIso,
      banReason: reason,
      bannedAt: nowIso,
      forceLoggedOutAt: nowIso,
    });
    setDrawerMessage(
      `Temporary Ban applied until ${new Date(expiryIso).toLocaleString('en-IN')}.`
    );
  };

  const handlePermanentBlock = () => {
    setDrawerError('');
    if (!selectedProfile || !onUpdateCustomerAdmin) return;
    const reason = banReasonInput.trim();
    if (reason.length < 3) {
      setDrawerError('Please enter a mandatory block reason before permanently blocking.');
      return;
    }
    const nowIso = new Date().toISOString();
    onUpdateCustomerAdmin({
      ...selectedProfile,
      accountStatus: 'Suspended',
      banType: 'permanent',
      bannedUntil: null,
      banReason: reason,
      bannedAt: nowIso,
      forceLoggedOutAt: nowIso,
    });
    setDrawerMessage(`Account permanently blocked for ${selectedProfile.fullName}.`);
  };

  const handleUnblockCustomer = () => {
    setDrawerError('');
    if (!selectedProfile || !onUpdateCustomerAdmin) return;
    onUpdateCustomerAdmin({
      ...selectedProfile,
      accountStatus: 'Active',
      banType: null,
      bannedUntil: null,
      banReason: undefined,
      bannedAt: null,
    });
    setBanReasonInput('');
    setDrawerMessage(`Account unblocked and restored to Active for ${selectedProfile.fullName}.`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crmCustomers.filter((c) => {
      if (flagFilter !== 'All' && c.flag !== flagFilter) return false;
      if (!q) return true;
      return [c.fullName, c.phone, c.email, c.city, c.state, c.gender || '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [crmCustomers, search, flagFilter]);

  const handleExportCsv = () => {
    const csv = exportCustomersToCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bee4-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const activeSummary = selectedCrmFallback;
  const activeOrders = useMemo(() => {
    if (selectedProfile) {
      return getCustomerOrders(orders, selectedProfile);
    }
    if (activeSummary) {
      const p10 = activeSummary.phone.replace(/\D/g, '').slice(-10);
      return orders.filter(
        (o) =>
          (p10 && o.customer.phone.replace(/\D/g, '').slice(-10) === p10) ||
          (activeSummary.email &&
            o.customer.email.toLowerCase() === activeSummary.email.toLowerCase())
      );
    }
    return [];
  }, [selectedProfile, activeSummary, orders]);

  const activeMessages = useMemo(() => {
    const phone10 = (selectedProfile?.phone || activeSummary?.phone || '')
      .replace(/\D/g, '')
      .slice(-10);
    const email = (selectedProfile?.email || activeSummary?.email || '').toLowerCase();
    return customerMessages.filter(
      (m) =>
        (selectedProfile && m.userId === selectedProfile.id) ||
        (phone10 && m.phone.replace(/\D/g, '').slice(-10) === phone10) ||
        (email && (m.email ?? '').toLowerCase() === email)
    );
  }, [selectedProfile, activeSummary, customerMessages]);

  return (
    <div className="space-y-5">
      <div className="glass-surface rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, city, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm glass-input rounded-xl focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['All', ...CRM_FLAGS] as const).map((flag) => (
            <button
              key={flag}
              type="button"
              onClick={() => setFlagFilter(flag)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                flagFilter === flag ? 'glass-btn-ink' : 'glass-subtle text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {flag}
            </button>
          ))}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="glass-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Customer CRM Directory ({filtered.length})
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Click any customer row to inspect details &amp; moderation controls
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Customer &amp; Profile</th>
                <th className="py-3 px-4">Preferences &amp; Security</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Wallet &amp; LTV</th>
                <th className="py-3 px-4 text-center">Account</th>
                <th className="py-3 px-4 text-right">CRM &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {filtered.map((cust) => {
                const phoneKey = cust.phone.replace(/\D/g, '').slice(-10) || cust.email;
                const registeredProfile = customers.find(
                  (p) =>
                    p.id === cust.id ||
                    (phoneKey && p.phone.replace(/\D/g, '').slice(-10) === phoneKey)
                );
                const moderation = evaluateCustomerAccess(registeredProfile);
                const statusBadgeText = !moderation.allowed
                  ? moderation.banKind === 'temporary'
                    ? 'Temp Banned'
                    : 'Permanent Block'
                  : cust.accountStatus ?? 'Active';

                return (
                  <tr
                    key={cust.id}
                    onClick={() => openManageDrawer(registeredProfile, cust)}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-bold text-zinc-900 dark:text-white">{cust.fullName}</p>
                        {cust.gender && (
                          <span className="px-1.5 py-0.5 rounded-md glass-subtle text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                            {cust.gender}
                          </span>
                        )}
                        {cust.emailVerified === true && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <BadgeCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                        {cust.emailVerified === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                        {cust.phone || 'No phone'} · {cust.email || 'No email'}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {cust.city}, {cust.state} · Active {cust.lastOrderDate.slice(0, 10)}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          {cust.preferredLanguage === 'hi' ? 'हिन्दी' : 'English'}
                        </span>
                        {typeof cust.activeDevicesCount === 'number' && (
                          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                            <Smartphone className="w-3 h-3" />
                            {cust.activeDevicesCount} dev
                          </span>
                        )}
                        {typeof cust.savedAddressesCount === 'number' && (
                          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                            <MapPin className="w-3 h-3" />
                            {cust.savedAddressesCount} addr
                          </span>
                        )}
                      </div>
                      {cust.notificationSummary && (
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                          Alerts: {cust.notificationSummary} · {cust.paymentPreference}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold tabular-nums text-zinc-900 dark:text-white">
                      <div>{cust.totalOrders}</div>
                      {cust.returnCount > 0 && (
                        <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          {cust.returnCount} return{cust.returnCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-bold tabular-nums text-zinc-900 dark:text-white">
                      <div>LTV {formatINR(cust.ltv)}</div>
                      {typeof cust.walletBalance === 'number' && (
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Wallet {formatINR(cust.walletBalance)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !moderation.allowed || cust.accountStatus === 'Suspended'
                              ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {statusBadgeText}
                        </span>
                        {cust.deactivationRequested && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            Deactivation Req
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <select
                          aria-label={`CRM flag for ${cust.fullName}`}
                          value={cust.flag}
                          onChange={(e) =>
                            onSetCustomerFlag(phoneKey, e.target.value as CrmCustomerFlag)
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border border-transparent focus:outline-none ${flagStyle(cust.flag)}`}
                        >
                          {CRM_FLAGS.map((fl) => (
                            <option key={fl} value={fl}>
                              {fl}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => openManageDrawer(registeredProfile, cust)}
                          className="px-2.5 py-1 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-zinc-500 dark:text-zinc-400">
                    <p className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {crmCustomers.length === 0
                        ? '0 Registered or Checkout Customers Yet'
                        : 'No customers match your current filters.'}
                    </p>
                    <p className="mt-1 text-xs">
                      Verified sign-ups and live checkout customers sync automatically from your live store backend.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Customer Inspector & Moderation Drawer */}
      {(selectedProfile || selectedCrmFallback) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect customer ${(selectedProfile || selectedCrmFallback)?.fullName}`}
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/55"
          onClick={() => {
            setSelectedProfileId(null);
            setSelectedCrmFallback(null);
          }}
        >
          <div
            className="w-full max-w-xl h-full glass-drawer p-5 sm:p-6 overflow-y-auto space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Customer Inspector &amp; Moderation Controls
                </p>
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                  {selectedProfile?.fullName || selectedCrmFallback?.fullName}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                  Wallet: {formatINR(selectedProfile?.walletBalance ?? selectedCrmFallback?.walletBalance ?? 0)} ·
                  Orders: <strong>{activeOrders.length}</strong> · Status:{' '}
                  <strong>{selectedProfile?.accountStatus ?? 'Active'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfileId(null);
                  setSelectedCrmFallback(null);
                }}
                aria-label="Close customer drawer"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {drawerMessage && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium text-emerald-800 dark:text-emerald-200"
              >
                {drawerMessage}
              </div>
            )}

            {drawerError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-200"
              >
                {drawerError}
              </div>
            )}

            {/* Temporary Ban / Permanent Block Moderation Controls */}
            {selectedProfile && onUpdateCustomerAdmin && (
              <div className="glass-subtle rounded-2xl p-4 space-y-3 border border-rose-200/70 dark:border-rose-500/20">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Account Moderation (Temp Ban / Permanent Block)</span>
                  </h3>
                  {!evaluateCustomerAccess(selectedProfile).allowed && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      {selectedProfile.banType === 'temporary' ? 'Temporary Ban' : 'Permanent Block'}
                    </span>
                  )}
                </div>

                {!evaluateCustomerAccess(selectedProfile).allowed && (
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {evaluateCustomerAccess(selectedProfile).message}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: '24h', label: '24 Hours' },
                      { id: '7d', label: '7 Days' },
                      { id: '30d', label: '30 Days' },
                      { id: 'custom', label: 'Custom' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBanPreset(opt.id)}
                      className={`h-8 rounded-lg text-[11px] font-semibold border ${
                        banPreset === opt.id
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'glass-btn-secondary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {banPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customBanDate}
                    onChange={(e) => setCustomBanDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                  />
                )}

                <input
                  type="text"
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Mandatory Ban / Block Reason (visible to user on login) *"
                  className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTemporaryBan}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Apply Temporary Ban</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePermanentBlock}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Permanent Block</span>
                  </button>
                  {selectedProfile.accountStatus === 'Suspended' && (
                    <button
                      type="button"
                      onClick={handleUnblockCustomer}
                      className="px-3.5 py-2 rounded-xl glass-btn-ink text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Unblock Account</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="glass-subtle rounded-2xl p-4 space-y-2.5">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>Order History ({activeOrders.length})</span>
              </h3>
              {activeOrders.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No orders recorded for this customer yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeOrders.map((ord) => (
                    <div
                      key={ord.orderNumber}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-slate-900 dark:text-white">
                          {ord.orderNumber} · {ord.status}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {ord.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}
                        </p>
                      </div>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                        {formatINR(ord.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Addresses */}
            {selectedProfile && (
              <div className="glass-subtle rounded-2xl p-4 space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Saved Addresses ({selectedProfile.addresses?.length ?? 0})</span>
                </h3>
                {(selectedProfile.addresses ?? []).length === 0 ? (
                  <p className="text-xs text-zinc-500">No saved addresses.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedProfile.addresses.map((addr) => (
                      <div key={addr.id} className="text-xs text-zinc-700 dark:text-zinc-300">
                        <strong>{addr.label}:</strong> {addr.address}, {addr.city}, {addr.state} –{' '}
                        {addr.pinCode}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Support Messages */}
            {activeMessages.length > 0 && (
              <div className="glass-subtle rounded-2xl p-4 space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Help Center Messages ({activeMessages.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeMessages.map((msg) => (
                    <div key={msg.id} className="text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                      <p className="font-bold">{msg.topic} · {msg.status}</p>
                      <p className="text-zinc-600 dark:text-zinc-300">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Profile Details */}
            {selectedProfile && onUpdateCustomerAdmin && (
              <form onSubmit={handleSaveProfileEdit} className="glass-subtle rounded-2xl p-4 space-y-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Edit Customer Profile
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Gender</label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as CustomerGender | '')}
                      className="w-full h-9 px-2.5 rounded-xl glass-input text-xs focus:outline-none"
                    >
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Language</label>
                    <select
                      value={editLanguage}
                      onChange={(e) => setEditLanguage(e.target.value as 'en' | 'hi')}
                      className="w-full h-9 px-2.5 rounded-xl glass-input text-xs focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl glass-btn-ink text-xs font-semibold"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {/* Adjust BEE4 Wallet Balance & Ledger */}
            {selectedProfile && onAdjustCustomerWallet && (
              <form
                onSubmit={handleApplyWalletAdjustment}
                className="glass-subtle rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>BEE4 Wallet &amp; Ledger</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    Current: {formatINR(selectedProfile.walletBalance ?? 0)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={walletMode}
                    onChange={(e) => setWalletMode(e.target.value as 'credit' | 'debit')}
                    className="h-9 px-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="credit">+ Credit ₹</option>
                    <option value="debit">- Debit ₹</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Amount ₹"
                    className="col-span-2 h-9 px-3 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={walletNote}
                  onChange={(e) => setWalletNote(e.target.value)}
                  placeholder="Reason note (e.g. Loyalty Bonus, Goodwill Refund)"
                  className="w-full h-9 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                  >
                    Apply Wallet Adjustment
                  </button>
                </div>

                {(selectedProfile.walletTransactions ?? []).length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1 max-h-32 overflow-y-auto">
                    {(selectedProfile.walletTransactions ?? []).slice(0, 6).map((tx) => (
                      <div key={tx.id} className="flex justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-zinc-300 truncate">{tx.note}</span>
                        <span className="font-bold tabular-nums">
                          {tx.type === 'debit_order' ? '−' : '+'}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* Security Actions */}
            {selectedProfile && (
              <div className="glass-subtle rounded-2xl p-4 space-y-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Security &amp; Session Actions
                </h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  Active logged-in devices: <strong>{selectedProfile.devices?.length ?? 0}</strong> · Saved UPI IDs:{' '}
                  <strong>{selectedProfile.savedUpiIds?.length ?? 0}</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {onForceLogoutCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        onForceLogoutCustomer(selectedProfile);
                        setDrawerMessage(`Force-logged out all active sessions for ${selectedProfile.fullName}.`);
                      }}
                      className="px-3.5 py-2 rounded-xl glass-btn-secondary text-amber-700 dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Force Logout All Devices</span>
                    </button>
                  )}

                  {onToggleCustomerStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextSuspended = selectedProfile.accountStatus !== 'Suspended';
                        onToggleCustomerStatus(selectedProfile);
                        setDrawerMessage(
                          nextSuspended
                            ? `Account suspended for ${selectedProfile.fullName}.`
                            : `Account reactivated for ${selectedProfile.fullName}.`
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
                    >
                      {selectedProfile.accountStatus === 'Suspended' ? 'Quick Activate' : 'Quick Suspend'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
