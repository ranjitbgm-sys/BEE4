import { useMemo, useState } from 'react';
import { BadgeCheck, Download, Search, ShieldAlert, Users } from 'lucide-react';
import type { CrmCustomerFlag } from '../../types';
import { CrmCustomerSummary, exportCustomersToCsv } from '../../utils/adminLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminCustomersTabProps {
  crmCustomers: CrmCustomerSummary[];
  onSetCustomerFlag: (phoneOrKey: string, flag: CrmCustomerFlag) => void;
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
  onSetCustomerFlag,
}: AdminCustomersTabProps) {
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState<CrmCustomerFlag | 'All'>('All');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crmCustomers.filter((c) => {
      if (flagFilter !== 'All' && c.flag !== flagFilter) return false;
      if (!q) return true;
      return [c.fullName, c.phone, c.email, c.city, c.state].join(' ').toLowerCase().includes(q);
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

  return (
    <div className="space-y-5">
      <div className="glass-surface rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
            Customer CRM Directory ({filtered.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Lifetime Value</th>
                <th className="py-3 px-4 text-center">Payment Pref</th>
                <th className="py-3 px-4 text-right">CRM Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {filtered.map((cust) => {
                const phoneKey = cust.phone.replace(/\D/g, '').slice(-10) || cust.email;
                return (
                  <tr key={cust.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-bold text-zinc-900 dark:text-white">{cust.fullName}</p>
                        {cust.emailVerified === true && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <BadgeCheck className="w-3 h-3" />
                            <span>Verified Email</span>
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
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      <div>
                        {cust.city}, {cust.state}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        Last active {cust.lastOrderDate.slice(0, 10)}
                      </div>
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
                      {formatINR(cust.ltv)}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-zinc-700 dark:text-zinc-300">
                      {cust.paymentPreference}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
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
                      Verified sign-ups and live checkout customers sync automatically from Supabase.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
