import { useEffect, useMemo, useState } from 'react';
import type {
  AdminAuditLog,
  AdminModuleRoute,
  CouponRecord,
  CrmCustomerFlag,
  CustomerInquiry,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  InventoryAdjustmentRecord,
  OrderRecord,
  PrintJobRecord,
  Product,
  ReturnRequestRecord,
  StoreSettings,
  ThemeMode,
} from '../types';
import {
  buildCustomerCrmList,
  buildExecutiveDashboardSummary,
} from '../utils/adminLogic';
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
import { AdminSettingsTab } from './admin/AdminSettingsTab';

interface AdminPanelViewProps {
  activeModule: AdminModuleRoute;
  theme: ThemeMode;
  products: Product[];
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  inventoryAdjustments?: InventoryAdjustmentRecord[];
  inquiries: CustomerInquiry[];
  customers: CustomerProfile[];
  coupons: CouponRecord[];
  printJobs: PrintJobRecord[];
  spools: FilamentSpool[];
  auditLogs: AdminAuditLog[];
  crmFlagsByPhone: Record<string, CrmCustomerFlag>;
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
    }
  ) => void;
  onUpdateReturnRequest?: (
    prevReturn: ReturnRequestRecord,
    nextUpdates: RmaTransitionUpdates,
    options?: { forceQueuePrint?: boolean }
  ) => string | void;
  onSaveCoupon: (coupon: CouponRecord) => void;
  onDeleteCoupon: (couponId: string) => void;
  onSavePrintJob: (job: PrintJobRecord) => void;
  onSaveFilamentSpool: (spool: FilamentSpool) => void;
  onSetCustomerFlag: (phoneOrKey: string, flag: CrmCustomerFlag) => void;
  onToggleInquiryStatus: (id: string) => void;
  onChangeAdminPasswordHash: (nextHash: string) => void;
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
  customers,
  coupons,
  printJobs,
  spools,
  auditLogs,
  crmFlagsByPhone,
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
  onUpdateReturnRequest,
  onSaveCoupon,
  onDeleteCoupon,
  onSavePrintJob,
  onSaveFilamentSpool,
  onSetCustomerFlag,
  onToggleInquiryStatus,
  onChangeAdminPasswordHash,
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

        {activeModule === 'discounts' && (
          <AdminDiscountsTab
            coupons={coupons}
            settings={settings}
            onSaveCoupon={(c) => {
              onSaveCoupon(c);
              notify(`Coupon ${c.code} saved (${c.active ? 'Active' : 'Paused'}).`);
            }}
            onDeleteCoupon={(cid) => {
              onDeleteCoupon(cid);
              notify('Coupon deleted.');
            }}
            onUpdateSettings={(next) => {
              onUpdateSettings(next);
              notify('Saved gift wrap fees and Gift Finder weights to storefront.');
            }}
          />
        )}

        {activeModule === 'customers' && (
          <AdminCustomersTab
            crmCustomers={crmCustomers}
            onSetCustomerFlag={(phoneKey, flag) => {
              onSetCustomerFlag(phoneKey, flag);
              notify(`Updated CRM flag to ${flag}.`);
            }}
          />
        )}

        {activeModule === 'settings' && (
          <AdminSettingsTab
            settings={settings}
            adminPasswordHash={adminPasswordHash}
            inquiries={inquiries}
            auditLogs={auditLogs}
            onUpdateSettings={(next) => {
              onUpdateSettings(next);
              notify('Published storefront CMS, payment, and fee changes live.');
            }}
            onChangeAdminPasswordHash={(nextHash) => {
              onChangeAdminPasswordHash(nextHash);
              notify('Studio owner passphrase updated.');
            }}
            onToggleInquiryStatus={onToggleInquiryStatus}
            onSyncCatalogToCloud={
              onSyncCatalogToCloud
                ? async () => {
                    await onSyncCatalogToCloud();
                    notify('Synchronized seed catalog, coupons & settings to Supabase Postgres.');
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
