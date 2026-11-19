import { useEffect, useMemo, useState } from 'react';
import type {
  AdminAuditLog,
  AdminModuleRoute,
  AutomationRule,
  CouponRecord,
  CrmCustomerFlag,
  CustomerInquiry,
  CustomerMessageRecord,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  GiftCardRecord,
  InventoryAdjustmentRecord,
  MarketplaceChannel,
  MarketplaceIntegrationConfig,
  MonthlyAdSpendRecord,
  OperationalOrderBucket,
  OrderRecord,
  OrderSettlementRecord,
  PackingVerificationProof,
  PrintJobRecord,
  PrinterIntegrationConfig,
  Product,
  ProductQuestionRecord,
  ProductReviewRecord,
  ReturnRequestRecord,
  StoreSettings,
  SupportMessageRecord,
  SupportTicketRecord,
  ThemeMode,
  ViralReelRecord,
} from '../types';
import {
  buildCustomerCrmList,
  buildExecutiveDashboardSummary,
} from '../utils/adminLogic';
import { isTicketOpenForExecutive } from '../utils/supportChatLogic';
import type { RmaTransitionUpdates } from '../utils/rmaLogic';
import { AdminShell } from './admin/AdminShell';
import { AdminCommandPalette } from './admin/AdminCommandPalette';
import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminReturnsTab } from './admin/AdminReturnsTab';
import { AdminProductsTab } from './admin/AdminProductsTab';
import { AdminInventoryTab } from './admin/AdminInventoryTab';
import { AdminDiscountsTab } from './admin/AdminDiscountsTab';
import { AdminCustomersTab } from './admin/AdminCustomersTab';
import { AdminSupportTab } from './admin/AdminSupportTab';
import { AdminMessagesQaTab } from './admin/AdminMessagesQaTab';
import { AdminReviewsTab } from './admin/AdminReviewsTab';
import { AdminIntegrationsTab } from './admin/AdminIntegrationsTab';
import { AdminAutomationsTab } from './admin/AdminAutomationsTab';
import { AdminReconciliationTab } from './admin/AdminReconciliationTab';
import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminReelsTab } from './admin/AdminReelsTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';

interface AdminPanelViewProps {
  activeModule: AdminModuleRoute;
  theme: ThemeMode;
  products: Product[];
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  inventoryAdjustments?: InventoryAdjustmentRecord[];
  inquiries: CustomerInquiry[];
  customerMessages?: CustomerMessageRecord[];
  productReviews?: ProductReviewRecord[];
  productQuestions?: ProductQuestionRecord[];
  supportTickets?: SupportTicketRecord[];
  supportMessages?: SupportMessageRecord[];
  customers: CustomerProfile[];
  coupons: CouponRecord[];
  giftCards?: GiftCardRecord[];
  printJobs: PrintJobRecord[];
  spools: FilamentSpool[];
  auditLogs: AdminAuditLog[];
  crmFlagsByPhone: Record<string, CrmCustomerFlag>;
  integrations?: MarketplaceIntegrationConfig[];
  printerIntegrations?: PrinterIntegrationConfig[];
  viralReels?: ViralReelRecord[];
  automationRules?: AutomationRule[];
  adSpendLogs?: MonthlyAdSpendRecord[];
  settings: StoreSettings;
  adminPasswordHash: string;
  cloudAdminEmail?: string | null;
  cloudSignedInEmail?: string | null;
  supabaseConfigured?: boolean;
  onSelectModule: (module: AdminModuleRoute) => void;
  onToggleTheme: () => void;
  onConnectCloudAdmin?: () => Promise<void>;
  onSyncCatalogToCloud?: () => Promise<void>;
  onUpdateSettings: (next: StoreSettings) => void;
  onSaveProduct: (product: Product) => void;
  onAdjustProductStock: (productId: string, nextQuantity: number) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog: () => void;
  onUpdateOrderLogistics: (
    orderNumber: string,
    updates: {
      fulfillmentStage: FulfillmentStage;
      courierPartner?: string;
      awbNumber?: string;
      trackingUrl?: string;
      internalNotes?: string;
      operationalBucket?: OperationalOrderBucket;
      labelGeneratedAt?: string;
      picklistGeneratedAt?: string;
      packingProof?: PackingVerificationProof;
    }
  ) => void;
  onBulkUpdateOrders?: (orders: OrderRecord[], label: string) => void;
  onCancelOrderAdmin?: (payload: {
    orderNumber: string;
    reason: string;
    autoRestock: boolean;
    issueRefundCredit: boolean;
  }) => Promise<void> | void;
  onUpdateOrderSettlement?: (orderNumber: string, settlement: OrderSettlementRecord) => void;
  onUpdateReturnRequest?: (
    prevReturn: ReturnRequestRecord,
    nextUpdates: RmaTransitionUpdates,
    options?: {
      forceQueuePrint?: boolean;
      receivedAtHub?: boolean;
      claimFiled?: boolean;
      claimReferenceId?: string;
      qcOutcome?: ReturnRequestRecord['qcOutcome'];
    }
  ) => string | void;
  onSaveCoupon: (coupon: CouponRecord) => void;
  onDeleteCoupon: (couponId: string) => void;
  onCreateGiftCardAdmin?: (input: {
    amount: number;
    recipientName: string;
    recipientEmail: string;
    message: string;
    issuedBy?: 'Customer' | 'Admin';
  }) => Promise<GiftCardRecord> | GiftCardRecord;
  onToggleGiftCardActive?: (card: GiftCardRecord) => void;
  onSavePrintJob: (job: PrintJobRecord) => void;
  onSaveFilamentSpool: (spool: FilamentSpool) => void;
  onSetCustomerFlag: (phoneOrKey: string, flag: CrmCustomerFlag) => void;
  onUpdateCustomerAdmin?: (updated: CustomerProfile) => void;
  onAdjustCustomerWallet?: (customer: CustomerProfile, deltaAmount: number, note: string) => void;
  onForceLogoutCustomer?: (customer: CustomerProfile) => void;
  onToggleCustomerStatus?: (customer: CustomerProfile) => void;
  onToggleInquiryStatus: (id: string) => void;
  onUpdateCustomerMessage?: (updated: CustomerMessageRecord) => void;
  onDeleteCustomerMessage?: (id: string) => void;
  onBulkDeleteCustomerMessages?: (ids: string[]) => void;
  onSaveProductReview?: (review: ProductReviewRecord, isNew?: boolean) => void;
  onDeleteProductReview?: (id: string) => void;
  onSaveProductQuestion?: (question: ProductQuestionRecord) => void;
  onDeleteProductQuestion?: (id: string) => void;
  onSendExecutiveSupportReply?: (ticket: SupportTicketRecord, replyText: string) => void;
  onUpdateSupportTicketStatus?: (
    ticket: SupportTicketRecord,
    nextStatus: SupportTicketRecord['status'],
    closedBy?: 'Executive'
  ) => void;
  onSaveIntegration?: (config: MarketplaceIntegrationConfig) => void;
  onSavePrinterIntegration?: (printer: PrinterIntegrationConfig) => void;
  onImportOrders?: (orders: OrderRecord[], channel: MarketplaceChannel) => void;
  onSaveViralReel?: (reel: ViralReelRecord) => void;
  onDeleteViralReel?: (id: string) => void;
  onSaveAutomationRule?: (rule: AutomationRule) => void;
  onDeleteAutomationRule?: (ruleId: string) => void;
  onRunAutomationRulesNow?: () => string;
  onSaveAdSpend?: (entry: MonthlyAdSpendRecord) => void;
  onChangeAdminPasswordHash: (nextHash: string) => void;
  onPurgeTestData?: () => Promise<{ clearedTables: string[]; errors: string[] }>;
  onRefreshOrders?: () => Promise<void>;
  onLockAdmin: () => void;
  onBackToStore: () => void;
}

export function AdminPanelView({
  activeModule,
  theme,
  products,
  orders,
  returns = [],
  inventoryAdjustments = [],
  inquiries,
  customerMessages = [],
  productReviews = [],
  productQuestions = [],
  supportTickets = [],
  supportMessages = [],
  customers,
  coupons,
  giftCards = [],
  printJobs,
  spools,
  auditLogs,
  crmFlagsByPhone,
  integrations = [],
  printerIntegrations = [],
  viralReels = [],
  automationRules = [],
  adSpendLogs = [],
  settings,
  adminPasswordHash,
  cloudAdminEmail = null,
  cloudSignedInEmail = null,
  supabaseConfigured = false,
  onSelectModule,
  onToggleTheme,
  onConnectCloudAdmin,
  onSyncCatalogToCloud,
  onUpdateSettings,
  onSaveProduct,
  onAdjustProductStock,
  onDeleteProduct,
  onResetCatalog,
  onUpdateOrderLogistics,
  onBulkUpdateOrders,
  onCancelOrderAdmin,
  onUpdateOrderSettlement,
  onUpdateReturnRequest,
  onSaveCoupon,
  onDeleteCoupon,
  onCreateGiftCardAdmin,
  onToggleGiftCardActive,
  onSavePrintJob,
  onSaveFilamentSpool,
  onSetCustomerFlag,
  onUpdateCustomerAdmin,
  onAdjustCustomerWallet,
  onForceLogoutCustomer,
  onToggleCustomerStatus,
  onToggleInquiryStatus,
  onUpdateCustomerMessage,
  onDeleteCustomerMessage,
  onBulkDeleteCustomerMessages,
  onSaveProductReview,
  onDeleteProductReview,
  onSaveProductQuestion,
  onDeleteProductQuestion,
  onSendExecutiveSupportReply,
  onUpdateSupportTicketStatus,
  onSaveIntegration,
  onSavePrinterIntegration,
  onImportOrders,
  onSaveViralReel,
  onDeleteViralReel,
  onSaveAutomationRule,
  onDeleteAutomationRule,
  onRunAutomationRulesNow,
  onSaveAdSpend,
  onChangeAdminPasswordHash,
  onPurgeTestData,
  onRefreshOrders,
  onLockAdmin,
  onBackToStore,
}: AdminPanelViewProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [selectedRmaNo, setSelectedRmaNo] = useState<string | null>(null);
  const [editingProductTrigger, setEditingProductTrigger] = useState<Product | null>(null);
  const [newProductCounter, setNewProductCounter] = useState(0);

  // Global Cmd/Ctrl + K Command Palette hotkey
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const executiveSummary = useMemo(
    () => buildExecutiveDashboardSummary({ orders, products, returns, period: 'all' }),
    [orders, products, returns]
  );

  const pendingReturnsCount = useMemo(
    () => returns.filter((r) => r.status === 'Return Requested').length,
    [returns]
  );

  const openSupportTicketsCount = useMemo(
    () => supportTickets.filter((t) => isTicketOpenForExecutive(t)).length,
    [supportTickets]
  );

  const messagesQaBadgeCount = useMemo(
    () =>
      customerMessages.filter((m) => m.status === 'Unread').length +
      productQuestions.filter((q) => q.status === 'Pending').length,
    [customerMessages, productQuestions]
  );

  const pendingReviewsCount = useMemo(
    () => productReviews.filter((r) => r.status === 'Pending').length,
    [productReviews]
  );

  const crmCustomers = useMemo(
    () =>
      buildCustomerCrmList({
        orders,
        customers,
        returns,
        flagsByPhone: crmFlagsByPhone,
      }),
    [orders, customers, returns, crmFlagsByPhone]
  );

  const notify = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((cur) => (cur === msg ? '' : cur));
    }, 4500);
  };

  return (
    <>
      <AdminShell
        activeModule={activeModule}
        theme={theme}
        pendingDispatchCount={executiveSummary.immediateDispatchOrders.length}
        pendingReturnsCount={pendingReturnsCount}
        openSupportTicketsCount={openSupportTicketsCount}
        messagesQaBadgeCount={messagesQaBadgeCount}
        pendingReviewsCount={pendingReviewsCount}
        lowStockCount={executiveSummary.lowStockProducts.length}
        totalOrdersCount={orders.length}
        totalProductsCount={products.length}
        cloudAdminEmail={cloudAdminEmail}
        cloudSignedInEmail={cloudSignedInEmail}
        supabaseConfigured={supabaseConfigured}
        cloudSyncLoading={cloudLoading}
        statusNotice={statusNotice}
        onSelectModule={onSelectModule}
        onToggleTheme={onToggleTheme}
        onOpenCommandPalette={() => setCommandOpen(true)}
        onNewProduct={() => {
          onSelectModule('products');
          setNewProductCounter((c) => c + 1);
        }}
        onBackToStore={onBackToStore}
        onLockAdmin={onLockAdmin}
        onConnectCloudAdmin={
          onConnectCloudAdmin
            ? async () => {
                setCloudLoading(true);
                try {
                  await onConnectCloudAdmin();
                  notify('Initiated Supabase OAuth connection for real-time sync.');
                } finally {
                  setCloudLoading(false);
                }
              }
            : undefined
        }
        onSyncCatalogToCloud={
          onSyncCatalogToCloud
            ? async () => {
                setCloudLoading(true);
                try {
                  await onSyncCatalogToCloud();
                  notify('Catalog, orders, coupons & CMS settings synced to Supabase Postgres.');
                } finally {
                  setCloudLoading(false);
                }
              }
            : undefined
        }
      >
        {activeModule === 'dashboard' && (
          <AdminDashboardTab
            orders={orders}
            products={products}
            spools={spools}
            returns={returns}
            onNavigateModule={onSelectModule}
            onInspectOrder={(orderNumber) => {
              setSelectedOrderNo(orderNumber);
              onSelectModule('orders');
            }}
          />
        )}

        {activeModule === 'orders' && (
          <AdminOrdersTab
            orders={orders}
            products={products}
            returns={returns}
            supportEmail={settings.supportEmail}
            whatsappNumber={settings.whatsappNumber}
            cloudAdminEmail={cloudAdminEmail}
            supabaseConfigured={supabaseConfigured}
            onConnectCloudAdmin={onConnectCloudAdmin}
            onRefreshOrders={
              onRefreshOrders
                ? async () => {
                    await onRefreshOrders();
                    notify('Synced live customer orders from Supabase.');
                  }
                : undefined
            }
            initialSelectedOrderNumber={selectedOrderNo}
            onClearInitialSelection={() => setSelectedOrderNo(null)}
            onInspectRma={(rmaNumber) => {
              setSelectedRmaNo(rmaNumber);
              onSelectModule('returns');
            }}
            onUpdateOrderLogistics={(orderNumber, updates) => {
              onUpdateOrderLogistics(orderNumber, updates);
              notify(`Updated order ${orderNumber} logistics (${updates.fulfillmentStage}).`);
            }}
            onBulkUpdateOrders={(updatedOrders, label) => {
              onBulkUpdateOrders?.(updatedOrders, label);
              notify(label);
            }}
            onCancelOrderAdmin={
              onCancelOrderAdmin
                ? async (payload) => {
                    await onCancelOrderAdmin(payload);
                    notify(`Cancelled ${payload.orderNumber} (${payload.reason}).`);
                  }
                : undefined
            }
          />
        )}

        {activeModule === 'returns' && (
          <AdminReturnsTab
            returns={returns}
            orders={orders}
            products={products}
            crmCustomers={crmCustomers}
            spools={spools}
            initialSelectedRmaNumber={selectedRmaNo}
            onClearInitialSelection={() => setSelectedRmaNo(null)}
            onUpdateReturnRequest={(prevReturn, nextUpdates, options) => {
              const summaryText = onUpdateReturnRequest?.(prevReturn, nextUpdates, options);
              notify(
                typeof summaryText === 'string' && summaryText
                  ? summaryText
                  : `Updated ${prevReturn.rmaNumber} -> ${nextUpdates.status}.`
              );
            }}
            onInspectOrder={(orderNumber) => {
              setSelectedOrderNo(orderNumber);
              onSelectModule('orders');
            }}
          />
        )}

        {activeModule === 'products' && (
          <AdminProductsTab
            products={products}
            initialEditProduct={editingProductTrigger}
            openNewTrigger={newProductCounter}
            onClearInitialEdit={() => setEditingProductTrigger(null)}
            onSaveProduct={(prod) => {
              onSaveProduct(prod);
              notify(`Saved "${prod.title}" to the live BEE4 catalog.`);
            }}
            onDeleteProduct={(pid) => {
              onDeleteProduct(pid);
              notify('Removed product from catalog.');
            }}
            onResetCatalog={() => {
              onResetCatalog();
              notify('Restored BEE4 starter catalog.');
            }}
          />
        )}

        {activeModule === 'inventory' && (
          <AdminInventoryTab
            products={products}
            printJobs={printJobs}
            spools={spools}
            inventoryAdjustments={inventoryAdjustments}
            onAdjustProductStock={(pid, nextQty) => {
              onAdjustProductStock(pid, nextQty);
              notify(`Updated stock count to ${nextQty} units.`);
            }}
            onSaveProduct={(prod) => {
              onSaveProduct(prod);
              notify(`Saved omnichannel inventory settings for "${prod.title}".`);
            }}
            onSavePrintJob={(job) => {
              onSavePrintJob(job);
              notify(`Print batch "${job.productTitle}" updated to ${job.stage}.`);
            }}
            onSaveFilamentSpool={(spool) => {
              onSaveFilamentSpool(spool);
              notify(`Filament spool "${spool.name}" updated (${spool.remainingGrams}g).`);
            }}
          />
        )}

        {activeModule === 'integrations' && (
          <AdminIntegrationsTab
            integrations={integrations}
            printerIntegrations={printerIntegrations}
            orders={orders}
            products={products}
            onSaveIntegration={(config) => {
              onSaveIntegration?.(config);
              notify(`Saved ${config.name} connector settings.`);
            }}
            onSavePrinterIntegration={(printer) => {
              onSavePrinterIntegration?.(printer);
              notify(`Saved 3D printer connector "${printer.name}".`);
            }}
            onImportOrders={(imported, channel) => {
              onImportOrders?.(imported, channel);
              notify(`Imported ${imported.length} order(s) from ${channel} & synced stock.`);
            }}
          />
        )}

        {activeModule === 'reels' && (
          <AdminReelsTab
            reels={viralReels}
            products={products}
            onSaveReel={(reel) => {
              onSaveViralReel?.(reel);
              notify(`Saved viral reel "${reel.title}".`);
            }}
            onDeleteReel={(id) => {
              onDeleteViralReel?.(id);
              notify('Deleted viral reel from storefront carousel.');
            }}
          />
        )}

        {activeModule === 'automations' && (
          <AdminAutomationsTab
            rules={automationRules}
            onSaveRule={(rule) => {
              onSaveAutomationRule?.(rule);
              notify(`Saved rule "${rule.name}" (${rule.enabled ? 'Active' : 'Paused'}).`);
            }}
            onDeleteRule={(ruleId) => {
              onDeleteAutomationRule?.(ruleId);
              notify('Deleted automation rule.');
            }}
            onRunRulesNow={() => {
              const summary = onRunAutomationRulesNow?.() ?? 'Evaluated active rules.';
              notify(summary);
              return summary;
            }}
          />
        )}

        {activeModule === 'reconciliation' && (
          <AdminReconciliationTab
            orders={orders}
            products={products}
            returns={returns}
            adSpends={adSpendLogs}
            onSaveAdSpend={(entry) => {
              onSaveAdSpend?.(entry);
              notify(`Logged ₹${Math.round(entry.amount)} ad spend for ${entry.month}.`);
            }}
            onUpdateOrderSettlement={(orderNumber, settlement) => {
              onUpdateOrderSettlement?.(orderNumber, settlement);
              notify(`Updated payment settlement & UTR for ${orderNumber}.`);
            }}
          />
        )}

        {activeModule === 'analytics' && (
          <AdminAnalyticsTab orders={orders} products={products} returns={returns} />
        )}

        {activeModule === 'discounts' && (
          <AdminDiscountsTab
            coupons={coupons}
            giftCards={giftCards}
            settings={settings}
            onSaveCoupon={(c) => {
              onSaveCoupon(c);
              notify(`Coupon ${c.code} saved (${c.active ? 'Active' : 'Paused'}).`);
            }}
            onDeleteCoupon={(cid) => {
              onDeleteCoupon(cid);
              notify('Coupon deleted.');
            }}
            onCreateGiftCard={
              onCreateGiftCardAdmin
                ? async (input) => {
                    const created = await onCreateGiftCardAdmin(input);
                    notify(`Issued gift card ${created.code} (₹${created.initialAmount}).`);
                    return created;
                  }
                : undefined
            }
            onToggleGiftCardActive={
              onToggleGiftCardActive
                ? (card) => {
                    onToggleGiftCardActive(card);
                    notify(
                      `Gift card ${card.code} ${card.active ? 'disabled' : 'reactivated'}.`
                    );
                  }
                : undefined
            }
            onUpdateSettings={(next) => {
              onUpdateSettings(next);
              notify('Saved gift wrap fees and Gift Finder weights to storefront.');
            }}
          />
        )}

        {activeModule === 'customers' && (
          <AdminCustomersTab
            crmCustomers={crmCustomers}
            customers={customers}
            orders={orders}
            customerMessages={customerMessages}
            onSetCustomerFlag={(phoneKey, flag) => {
              onSetCustomerFlag(phoneKey, flag);
              notify(`Updated CRM flag to ${flag}.`);
            }}
            onUpdateCustomerAdmin={(updated) => {
              onUpdateCustomerAdmin?.(updated);
              notify(`Saved customer profile for ${updated.fullName}.`);
            }}
            onAdjustCustomerWallet={(cust, delta, note) => {
              onAdjustCustomerWallet?.(cust, delta, note);
              notify(
                `${delta >= 0 ? 'Credited' : 'Debited'} ₹${Math.abs(delta)} on ${cust.fullName}'s wallet.`
              );
            }}
            onForceLogoutCustomer={(cust) => {
              onForceLogoutCustomer?.(cust);
              notify(`Forced device logout for ${cust.fullName}.`);
            }}
            onToggleCustomerStatus={(cust) => {
              onToggleCustomerStatus?.(cust);
              notify(
                cust.accountStatus === 'Suspended'
                  ? `Reactivated ${cust.fullName}.`
                  : `Suspended ${cust.fullName}.`
              );
            }}
          />
        )}

        {activeModule === 'support' && (
          <AdminSupportTab
            tickets={supportTickets}
            messages={supportMessages}
            orders={orders}
            customers={customers}
            whatsappNumber={settings.whatsappNumber}
            onSendExecutiveReply={(ticket, replyText) => {
              onSendExecutiveSupportReply?.(ticket, replyText);
              notify(`Sent executive reply on Token #${ticket.tokenNumber}.`);
            }}
            onUpdateTicketStatus={(ticket, nextStatus, closedBy) => {
              onUpdateSupportTicketStatus?.(ticket, nextStatus, closedBy);
              notify(`Updated Token #${ticket.tokenNumber} -> ${nextStatus}.`);
            }}
          />
        )}

        {activeModule === 'messages-qa' && (
          <AdminMessagesQaTab
            messages={customerMessages}
            productQuestions={productQuestions}
            onUpdateMessage={(updated) => {
              onUpdateCustomerMessage?.(updated);
              notify(`Updated note from ${updated.customerName} (${updated.status}).`);
            }}
            onDeleteMessage={(id) => {
              onDeleteCustomerMessage?.(id);
              notify('Deleted customer message.');
            }}
            onBulkDeleteMessages={(ids) => {
              onBulkDeleteCustomerMessages?.(ids);
              notify(`Deleted ${ids.length} customer message(s).`);
            }}
            onSaveQuestion={(q) => {
              onSaveProductQuestion?.(q);
              notify(`Published Team BEE4 answer for ${q.productName}.`);
            }}
            onDeleteQuestion={(id) => {
              onDeleteProductQuestion?.(id);
              notify('Deleted product question.');
            }}
          />
        )}

        {activeModule === 'reviews' && (
          <AdminReviewsTab
            reviews={productReviews}
            products={products}
            onSaveReview={(review, isNew) => {
              onSaveProductReview?.(review, isNew);
              notify(
                isNew
                  ? `Added review by ${review.customerName} (${review.status}).`
                  : `Updated review for ${review.productName} (${review.status}).`
              );
            }}
            onDeleteReview={(id) => {
              onDeleteProductReview?.(id);
              notify('Deleted product review and recalculated ratings.');
            }}
          />
        )}

        {activeModule === 'settings' && (
          <AdminSettingsTab
            settings={settings}
            adminPasswordHash={adminPasswordHash}
            inquiries={inquiries}
            auditLogs={auditLogs}
            onOpenMessagesReviews={() => onSelectModule('messages-qa')}
            onUpdateSettings={(next) => {
              onUpdateSettings(next);
              notify('Published storefront CMS, payment, and fee changes live.');
            }}
            onChangeAdminPasswordHash={(nextHash) => {
              onChangeAdminPasswordHash(nextHash);
              notify('Studio owner passphrase updated.');
            }}
            onToggleInquiryStatus={onToggleInquiryStatus}
            onPurgeTestData={onPurgeTestData}
            onSyncCatalogToCloud={
              onSyncCatalogToCloud
                ? async () => {
                    await onSyncCatalogToCloud();
                    notify('Synchronized catalog, coupons & settings to Supabase Postgres.');
                  }
                : undefined
            }
          />
        )}
      </AdminShell>

      <AdminCommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        orders={orders}
        returns={returns}
        products={products}
        coupons={coupons}
        customers={crmCustomers}
        onNavigateModule={onSelectModule}
        onSelectOrder={(orderNumber) => {
          setSelectedOrderNo(orderNumber);
          onSelectModule('orders');
        }}
        onSelectRma={(rmaNumber) => {
          setSelectedRmaNo(rmaNumber);
          onSelectModule('returns');
        }}
        onSelectProduct={(prod) => {
          setEditingProductTrigger(prod);
          onSelectModule('products');
        }}
      />
    </>
  );
}
