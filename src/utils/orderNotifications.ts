import type { OrderRecord } from '../types.ts';

function formatInrPlain(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₹${safeAmount.toLocaleString('en-IN')}`;
}

function escapeHtmlSafe(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWaDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits.length >= 10 ? digits : '919800004004';
}

function formatWaReadable(raw: string): string {
  const digits = normalizeWaDigits(raw);
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

export function normalizeIndianPhoneDigits10(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function getInvoiceFilename(orderNumber: string): string {
  const safeOrderNo = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '') || 'ORDER';
  return `BEE4-Invoice-${safeOrderNo}.html`;
}

export function buildOrderInvoiceHtml(
  order: OrderRecord,
  options?: { supportEmail?: string; whatsappNumber?: string }
): string {
  const supportEmail = options?.supportEmail?.trim() || 'hello@bee4.in';
  const whatsappDisplay = formatWaReadable(options?.whatsappNumber || '9800004004');

  const normalizedPay = (order.paymentMethod || '').trim().toLowerCase();
  const isCod = normalizedPay === 'cod' || normalizedPay.includes('cash on delivery');
  const paymentLabel = isCod
    ? 'Cash on Delivery (COD)'
    : normalizedPay.includes('wallet')
      ? 'BEE4 Wallet (Prepaid)'
      : normalizedPay === 'card'
        ? 'Credit / Debit Card (Prepaid)'
        : 'Direct UPI / QR (Prepaid)';

  const orderDate = new Date(order.createdAt);
  const formattedDate = Number.isNaN(orderDate.getTime())
    ? escapeHtmlSafe(order.createdAt)
    : orderDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const itemRows = order.items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;color:#52525b;">${index + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">
            <strong style="color:#18181b;">${escapeHtmlSafe(item.title)}</strong><br/>
            <span style="font-size:12px;color:#71717a;">${escapeHtmlSafe(item.variant)} · ${escapeHtmlSafe(item.category)}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-variant-numeric:tabular-nums;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-variant-numeric:tabular-nums;">${escapeHtmlSafe(formatInrPlain(item.price))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtmlSafe(formatInrPlain(item.price * item.quantity))}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BEE4 Invoice ${escapeHtmlSafe(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #18181b; background: #f7f6f2; }
    .sheet { max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #e6e4dd; border-radius: 16px; padding: 32px; }
    .toolbar { max-width: 780px; margin: 0 auto 14px; display: flex; justify-content: flex-end; }
    .print-btn { background: #18181b; color: #ffffff; border: 0; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .sheet { border: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <main class="sheet">
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:20px;border-bottom:1px solid #e6e4dd;flex-wrap:wrap;">
      <div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;">BEE4</div>
        <p style="margin:4px 0 0;font-size:12px;color:#52525b;">3D-Print Dispatch Studio · Banka, Bihar, India 813103</p>
        <p style="margin:2px 0 0;font-size:12px;color:#52525b;">${escapeHtmlSafe(supportEmail)} · WhatsApp ${escapeHtmlSafe(whatsappDisplay)}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;font-weight:700;color:#b45309;">TAX / ORDER INVOICE</div>
        <div style="margin-top:4px;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;">${escapeHtmlSafe(order.orderNumber)}</div>
        <div style="margin-top:2px;font-size:12px;color:#52525b;">Date: ${formattedDate} · Status: ${escapeHtmlSafe(order.status)}</div>
      </div>
    </header>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;padding:20px 0;border-bottom:1px solid #e6e4dd;font-size:13px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:#71717a;margin-bottom:6px;">BILLED &amp; DELIVERED TO</div>
        <div style="font-weight:700;color:#18181b;">${escapeHtmlSafe(order.customer.fullName)}</div>
        <div style="margin-top:4px;color:#3f3f46;line-height:1.5;">
          ${escapeHtmlSafe(order.customer.address)}<br/>
          ${escapeHtmlSafe(order.customer.city)}, ${escapeHtmlSafe(order.customer.state)} — ${escapeHtmlSafe(order.customer.pinCode)}
        </div>
        <div style="margin-top:4px;color:#52525b;">Phone: ${escapeHtmlSafe(order.customer.phone)}${order.customer.email ? ` · ${escapeHtmlSafe(order.customer.email)}` : ''}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:#71717a;margin-bottom:6px;">PAYMENT &amp; FULFILLMENT</div>
        <div style="color:#18181b;"><strong>Payment Method:</strong> ${escapeHtmlSafe(paymentLabel)}</div>
        <div style="margin-top:4px;color:#3f3f46;"><strong>Gift Wrap:</strong> ${order.giftWrap ? 'Included (Kraft Wrap &amp; Note Card)' : 'Standard Eco Packaging'}</div>
        ${order.giftMessage ? `<div style="margin-top:4px;color:#52525b;"><strong>Gift Note:</strong> &ldquo;${escapeHtmlSafe(order.giftMessage)}&rdquo;</div>` : ''}
      </div>
    </section>

    <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;">
      <thead>
        <tr style="background:#f7f6f2;text-align:left;font-size:12px;color:#52525b;">
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">#</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">Item</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Qty</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Price</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <section style="margin-top:20px;display:flex;justify-content:flex-end;">
      <div style="width:100%;max-width:300px;font-size:13px;line-height:1.8;">
        <div style="display:flex;justify-content:space-between;color:#52525b;">
          <span>Subtotal (incl. GST)</span>
          <span style="font-variant-numeric:tabular-nums;">${escapeHtmlSafe(formatInrPlain(order.subtotal))}</span>
        </div>
        ${
          order.discount > 0
            ? `<div style="display:flex;justify-content:space-between;color:#047857;">
                <span>Promo Discount</span>
                <span style="font-variant-numeric:tabular-nums;">&minus;${escapeHtmlSafe(formatInrPlain(order.discount))}</span>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;color:#52525b;">
          <span>Shipping</span>
          <span style="font-variant-numeric:tabular-nums;">${order.shippingFee === 0 ? 'FREE' : escapeHtmlSafe(formatInrPlain(order.shippingFee))}</span>
        </div>
        ${
          order.giftWrapFee > 0
            ? `<div style="display:flex;justify-content:space-between;color:#52525b;">
                <span>Kraft Gift Wrap</span>
                <span style="font-variant-numeric:tabular-nums;">${escapeHtmlSafe(formatInrPlain(order.giftWrapFee))}</span>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:10px;border-top:2px solid #18181b;font-size:16px;font-weight:800;color:#18181b;">
          <span>Grand Total</span>
          <span style="font-variant-numeric:tabular-nums;">${escapeHtmlSafe(formatInrPlain(order.total))}</span>
        </div>
      </div>
    </section>

    <footer style="margin-top:28px;padding-top:16px;border-top:1px solid #e6e4dd;font-size:11px;color:#71717a;">
      Thank you for shopping with BEE4 India. All prices include applicable taxes. For order support, contact ${escapeHtmlSafe(supportEmail)} or WhatsApp ${escapeHtmlSafe(whatsappDisplay)}.
    </footer>
  </main>
</body>
</html>`;
}

export function buildOrderSmsConfirmationText(
  order: OrderRecord,
  options?: { whatsappNumber?: string }
): string {
  const whatsappDisplay = formatWaReadable(options?.whatsappNumber || '9800004004');
  const normalizedPay = (order.paymentMethod || '').trim().toLowerCase();
  const paymentShort =
    normalizedPay === 'cod' || normalizedPay.includes('cash on delivery')
      ? 'COD'
      : normalizedPay.includes('wallet')
        ? 'BEE4 WALLET'
        : 'UPI / PREPAID';
  const emailPart = order.customer.email.trim()
    ? ` Invoice emailed to ${order.customer.email.trim()}.`
    : '';

  return (
    `BEE4 Order Confirmed! Order ${order.orderNumber} for ${formatInrPlain(order.total)} (${paymentShort}) ` +
    `is scheduled for ${order.customer.city} (PIN ${order.customer.pinCode}) within 3-5 business days.` +
    `${emailPart} Support: WhatsApp ${whatsappDisplay}.`
  );
}

export function buildOrderConfirmationEmailPayload(
  order: OrderRecord,
  options?: { supportEmail?: string; whatsappNumber?: string }
): {
  subject: string;
  textBody: string;
  htmlBody: string;
  invoiceFilename: string;
  invoiceHtml: string;
} {
  const supportEmail = options?.supportEmail?.trim() || 'hello@bee4.in';
  const whatsappDisplay = formatWaReadable(options?.whatsappNumber || '9800004004');
  const invoiceFilename = getInvoiceFilename(order.orderNumber);
  const invoiceHtml = buildOrderInvoiceHtml(order, options);
  const normalizedPay = (order.paymentMethod || '').trim().toLowerCase();
  const paymentLabel =
    normalizedPay === 'cod' || normalizedPay.includes('cash on delivery')
      ? 'Cash on Delivery (COD)'
      : normalizedPay.includes('wallet')
        ? 'BEE4 Wallet (Prepaid)'
        : normalizedPay === 'card'
          ? 'Credit / Debit Card (Prepaid)'
          : 'Direct UPI / QR (Prepaid)';

  const subject = `BEE4 Order Confirmed: ${order.orderNumber} (${formatInrPlain(order.total)}) + Invoice`;

  const itemsText = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.title} (${item.variant}) × ${item.quantity} — ${formatInrPlain(item.price * item.quantity)}`
    )
    .join('\n');

  const textLines: Array<string | false> = [
    `Hi ${order.customer.fullName},`,
    '',
    `Thank you for your order with BEE4! Your order ${order.orderNumber} is confirmed and being prepared at our Banka, Bihar studio (813103).`,
    '',
    'Order Summary:',
    itemsText,
    `Subtotal: ${formatInrPlain(order.subtotal)}`,
    order.discount > 0 && `Promo Discount: -${formatInrPlain(order.discount)}`,
    `Shipping: ${order.shippingFee === 0 ? 'FREE' : formatInrPlain(order.shippingFee)}`,
    order.giftWrapFee > 0 && `Kraft Gift Wrap: ${formatInrPlain(order.giftWrapFee)}`,
    `Total (${paymentLabel}): ${formatInrPlain(order.total)}`,
    '',
    `Delivering to: ${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pinCode}`,
    `Expected delivery: 3-5 business days across India.`,
    '',
    `Your tax/order invoice (${invoiceFilename}) is attached to this email.`,
    `Need help? Reply to ${supportEmail} or message us on WhatsApp at ${whatsappDisplay}.`,
  ];

  const textBody = textLines.filter((line): line is string => typeof line === 'string').join('\n');

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eceae2;font-size:13px;color:#18181b;">
            <strong>${escapeHtmlSafe(item.title)}</strong>
            <div style="font-size:12px;color:#71717a;">${escapeHtmlSafe(item.variant)} × ${item.quantity}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eceae2;text-align:right;font-size:13px;font-weight:600;color:#18181b;">
            ${escapeHtmlSafe(formatInrPlain(item.price * item.quantity))}
          </td>
        </tr>`
    )
    .join('');

  const htmlBody = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f7f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e6e2d8;border-radius:18px;padding:28px;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eceae2;padding-bottom:16px;">
      <div>
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">BEE4</div>
        <div style="font-size:12px;color:#71717a;">Curated Indian Lifestyle &amp; Gifting</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:#047857;">ORDER CONFIRMED</div>
        <div style="font-size:15px;font-weight:700;color:#18181b;">${escapeHtmlSafe(order.orderNumber)}</div>
      </div>
    </div>

    <p style="margin:18px 0 8px;font-size:15px;font-weight:600;">Hi ${escapeHtmlSafe(order.customer.fullName)},</p>
    <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#52525b;">
      Thank you for shopping with BEE4! Your order is confirmed and queued for dispatch within 48 hours.
      Your detailed invoice (<strong>${escapeHtmlSafe(invoiceFilename)}</strong>) is attached with this email.
    </p>

    <table style="width:100%;border-collapse:collapse;">
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:14px;padding:14px;background:#faf9f5;border-radius:12px;font-size:13px;line-height:1.7;">
      <div style="display:flex;justify-content:space-between;color:#52525b;"><span>Subtotal</span><span>${escapeHtmlSafe(formatInrPlain(order.subtotal))}</span></div>
      ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#047857;"><span>Promo Discount</span><span>−${escapeHtmlSafe(formatInrPlain(order.discount))}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;color:#52525b;"><span>Shipping</span><span>${order.shippingFee === 0 ? 'FREE' : escapeHtmlSafe(formatInrPlain(order.shippingFee))}</span></div>
      ${order.giftWrapFee > 0 ? `<div style="display:flex;justify-content:space-between;color:#52525b;"><span>Kraft Gift Wrap</span><span>${escapeHtmlSafe(formatInrPlain(order.giftWrapFee))}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #e6e2d8;font-size:15px;font-weight:800;color:#18181b;">
        <span>Total · ${escapeHtmlSafe(paymentLabel)}</span>
        <span>${escapeHtmlSafe(formatInrPlain(order.total))}</span>
      </div>
    </div>

    <div style="margin-top:18px;font-size:12px;line-height:1.6;color:#52525b;">
      <strong style="color:#18181b;">Delivery Address:</strong><br/>
      ${escapeHtmlSafe(order.customer.address)}, ${escapeHtmlSafe(order.customer.city)}, ${escapeHtmlSafe(order.customer.state)} — ${escapeHtmlSafe(order.customer.pinCode)}<br/>
      Phone: ${escapeHtmlSafe(order.customer.phone)}
    </div>

    <p style="margin:20px 0 0;padding-top:14px;border-top:1px solid #eceae2;font-size:11px;color:#71717a;">
      Support: ${escapeHtmlSafe(supportEmail)} · WhatsApp ${escapeHtmlSafe(whatsappDisplay)}
    </p>
  </div>
</body>
</html>`;

  return {
    subject,
    textBody,
    htmlBody,
    invoiceFilename,
    invoiceHtml,
  };
}
