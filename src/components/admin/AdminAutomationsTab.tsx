import { FormEvent, useState } from 'react';
import { Bolt, Play, Plus, Power, Trash2, Zap } from 'lucide-react';
import type {
  AutomationActionType,
  AutomationConditionField,
  AutomationRule,
  AutomationTrigger,
} from '../../types';

interface AdminAutomationsTabProps {
  rules: AutomationRule[];
  onSaveRule: (rule: AutomationRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onRunRulesNow?: () => string;
}

const TRIGGERS: { value: AutomationTrigger; label: string }[] = [
  { value: 'new_order_placed', label: 'New Website Order Placed' },
  { value: 'marketplace_csv_imported', label: 'Marketplace CSV Imported' },
  { value: 'order_status_changed', label: 'Order Stage Updated' },
  { value: 'return_initiated', label: 'Customer Return / RMA Initiated' },
  { value: 'stock_below_threshold', label: 'Master Stock Below Threshold' },
];

const CONDITIONS: { value: AutomationConditionField; label: string; placeholder: string }[] = [
  { value: 'always', label: 'Always Match (All Events)', placeholder: 'None' },
  { value: 'payment_method_eq', label: 'Payment Method Equals', placeholder: 'upi | cod | card' },
  {
    value: 'source_channel_eq',
    label: 'Source Channel Equals',
    placeholder: 'bee4.in | Flipkart | Amazon | Meesho',
  },
  { value: 'order_total_gte', label: 'Order Total ≥ (INR)', placeholder: '999' },
  { value: 'state_eq', label: 'Customer State Equals', placeholder: 'Bihar | Maharashtra' },
  { value: 'reason_contains', label: 'Return Reason Contains', placeholder: 'Damaged | Missing' },
];

const ACTIONS: { value: AutomationActionType; label: string; placeholder: string }[] = [
  { value: 'auto_accept_order', label: 'Auto-Accept to Ready for Process', placeholder: 'Ready for Process' },
  { value: 'assign_courier', label: 'Assign Preferred Courier Partner', placeholder: 'Delhivery | BlueDart | Shiprocket' },
  { value: 'generate_gst_label_ready', label: 'Pre-Stage GST Invoice & Thermal Label', placeholder: '4x6 Label Ready' },
  { value: 'send_to_print_queue', label: 'Queue 3D Print Batch in Banka Lab', placeholder: 'Priority Batch' },
  { value: 'flag_crm_vip_or_rto', label: 'Auto-Tag Customer CRM', placeholder: 'VIP | High-Risk RTO' },
  { value: 'file_spf_alert', label: 'Flag Return for Priority SPF Claim', placeholder: 'Priority Claim' },
];

export function AdminAutomationsTab({
  rules,
  onSaveRule,
  onDeleteRule,
  onRunRulesNow,
}: AdminAutomationsTabProps) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>('new_order_placed');
  const [conditionField, setConditionField] = useState<AutomationConditionField>('payment_method_eq');
  const [conditionValue, setConditionValue] = useState('upi');
  const [actionType, setActionType] = useState<AutomationActionType>('auto_accept_order');
  const [actionValue, setActionValue] = useState('Ready for Process');
  const [runSummary, setRunSummary] = useState('');

  const handleCreateRule = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveRule({
      id: `rule-${Date.now()}`,
      name: name.trim(),
      enabled: true,
      trigger,
      conditionField,
      conditionValue: conditionField === 'always' ? '' : conditionValue.trim(),
      actionType,
      actionValue: actionValue.trim(),
      executionCount: 0,
      createdAt: new Date().toISOString(),
    });
    setName('');
  };

  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((s, r) => s + (r.executionCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Active Automation Rules</span>
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {activeRulesCount} / {rules.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Evaluated automatically on checkout &amp; CSV import
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Total Real Executions</span>
            <Bolt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {totalExecutions}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            100% live event executions (zero simulated runs)
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5 flex flex-col justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Manual Batch Evaluator
          </p>
          <button
            type="button"
            onClick={() => {
              if (onRunRulesNow) {
                setRunSummary(onRunRulesNow());
              }
            }}
            className="mt-3 px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Active Rules on Open Orders</span>
          </button>
          {runSummary && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {runSummary}
            </p>
          )}
        </div>
      </div>

      {/* IF -> THEN Rule Builder */}
      <form onSubmit={handleCreateRule} className="glass-surface rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
            Create Automatic Order Action Rule (IF → THEN)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto-assign BlueDart for Maharashtra Prepaid orders"
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
              IF Event Trigger
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
              AND Condition
            </label>
            <select
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value as AutomationConditionField)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {conditionField !== 'always' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                Condition Value
              </label>
              <input
                type="text"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder={
                  CONDITIONS.find((c) => c.value === conditionField)?.placeholder || 'Value'
                }
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
              THEN Execute Action
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as AutomationActionType)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
              Action Parameter
            </label>
            <input
              type="text"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              placeholder={ACTIONS.find((a) => a.value === actionType)?.placeholder || 'Parameter'}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
            >
              + Save &amp; Enable Rule
            </button>
          </div>
        </div>
      </form>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                  {rule.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                    rule.enabled
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-zinc-900/8 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {rule.enabled ? 'ON' : 'OFF'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/12 text-amber-800 dark:text-amber-300 text-[11px] font-semibold tabular-nums">
                  {rule.executionCount} runs
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                <strong>IF</strong> {rule.trigger}
                {rule.conditionField !== 'always'
                  ? ` AND ${rule.conditionField} = "${rule.conditionValue}"`
                  : ''}{' '}
                → <strong>THEN</strong> {rule.actionType}{' '}
                {rule.actionValue ? `(${rule.actionValue})` : ''}
              </p>
              {rule.lastExecutedAt && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Last executed: {new Date(rule.lastExecutedAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSaveRule({ ...rule, enabled: !rule.enabled })}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                  rule.enabled ? 'glass-btn-ink' : 'glass-btn-secondary'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{rule.enabled ? 'Disable' : 'Enable'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                aria-label={`Delete rule ${rule.name}`}
                className="p-2 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
