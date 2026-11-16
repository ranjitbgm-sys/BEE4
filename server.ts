import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import type {
  OrderNotificationChannelResult,
  OrderNotificationDispatchResult,
  OrderRecord,
} from './src/types.ts';
import {
  buildOrderConfirmationEmailPayload,
  buildOrderSmsConfirmationText,
  normalizeIndianPhoneDigits10,
} from './src/utils/orderNotifications.ts';
import { INITIAL_PRODUCTS } from './src/data/catalog.ts';
import { generateRobotsTxt, generateSitemapXml } from './src/utils/sitemap.ts';

const PORT = Number(process.env.PORT || 3000);

async function dispatchSmsConfirmation(
  order: OrderRecord,
  whatsappNumber?: string
): Promise<OrderNotificationChannelResult> {
  const phone10 = normalizeIndianPhoneDigits10(order.customer.phone);
  const e164Phone = `+91${phone10}`;
  const smsText = buildOrderSmsConfirmationText(order, { whatsappNumber });

  if (!/^[6-9]\d{9}$/.test(phone10)) {
    return {
      channel: 'sms',
      target: order.customer.phone,
      status: 'failed',
      provider: 'validation',
      detail: 'Invalid 10-digit Indian mobile number for SMS delivery.',
      previewText: smsText,
    };
  }

  // Option 1: Twilio SMS
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const formBody = new URLSearchParams({
        To: e164Phone,
        From: twilioFrom,
        Body: smsText,
      });
      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody.toString(),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Twilio HTTP ${res.status}: ${errText}`);
      }
      return {
        channel: 'sms',
        target: e164Phone,
        status: 'sent',
        provider: 'twilio',
        detail: `Confirmation SMS delivered to ${e164Phone}.`,
        previewText: smsText,
      };
    } catch (error) {
      return {
        channel: 'sms',
        target: e164Phone,
        status: 'failed',
        provider: 'twilio',
        detail: error instanceof Error ? error.message : 'Twilio SMS delivery failed.',
        previewText: smsText,
      };
    }
  }

  // Option 2: Fast2SMS (India)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY?.trim();
  if (fast2SmsKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: smsText,
          language: 'english',
          flash: 0,
          numbers: phone10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Fast2SMS HTTP ${res.status}: ${errText}`);
      }
      return {
        channel: 'sms',
        target: e164Phone,
        status: 'sent',
        provider: 'fast2sms',
        detail: `Confirmation SMS delivered to ${e164Phone}.`,
        previewText: smsText,
      };
    } catch (error) {
      return {
        channel: 'sms',
        target: e164Phone,
        status: 'failed',
        provider: 'fast2sms',
        detail: error instanceof Error ? error.message : 'Fast2SMS delivery failed.',
        previewText: smsText,
      };
    }
  }

  return {
    channel: 'sms',
    target: e164Phone,
    status: 'preview',
    provider: 'instant-preview',
    detail: `Confirmation message prepared for ${e164Phone}. Copy the message or open via WhatsApp.`,
    previewText: smsText,
  };
}

async function dispatchEmailConfirmationAndInvoice(
  order: OrderRecord,
  options?: { supportEmail?: string; whatsappNumber?: string }
): Promise<OrderNotificationChannelResult> {
  const recipientEmail = order.customer.email.trim();
  const payload = buildOrderConfirmationEmailPayload(order, options);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return {
      channel: 'email',
      target: recipientEmail || 'Not provided',
      status: 'failed',
      provider: 'validation',
      detail: 'Valid email address is required to send confirmation and invoice.',
      previewText: payload.textBody,
      invoiceFilename: payload.invoiceFilename,
    };
  }

  // Option 1: SMTP / Gmail via Nodemailer
  const smtpHost =
    process.env.SMTP_HOST?.trim() || (process.env.GMAIL_USER ? 'smtp.gmail.com' : '');
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const fromEmail =
    process.env.EMAIL_FROM?.trim() || smtpUser || options?.supportEmail || 'hello@bee4.in';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `BEE4 Store <${fromEmail}>`,
        to: recipientEmail,
        subject: payload.subject,
        text: payload.textBody,
        html: payload.htmlBody,
        attachments: [
          {
            filename: payload.invoiceFilename,
            content: payload.invoiceHtml,
            contentType: 'text/html',
          },
        ],
      });

      return {
        channel: 'email',
        target: recipientEmail,
        status: 'sent',
        provider: 'smtp',
        detail: `Confirmation email with attached invoice (${payload.invoiceFilename}) sent to ${recipientEmail}.`,
        previewText: payload.textBody,
        invoiceFilename: payload.invoiceFilename,
      };
    } catch (error) {
      return {
        channel: 'email',
        target: recipientEmail,
        status: 'failed',
        provider: 'smtp',
        detail: error instanceof Error ? error.message : 'SMTP email delivery failed.',
        previewText: payload.textBody,
        invoiceFilename: payload.invoiceFilename,
      };
    }
  }

  // Option 2: Resend API
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const resendFrom =
        process.env.EMAIL_FROM?.trim() || 'BEE4 Store <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [recipientEmail],
          subject: payload.subject,
          text: payload.textBody,
          html: payload.htmlBody,
          attachments: [
            {
              filename: payload.invoiceFilename,
              content: Buffer.from(payload.invoiceHtml, 'utf-8').toString('base64'),
            },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend HTTP ${res.status}: ${errText}`);
      }
      return {
        channel: 'email',
        target: recipientEmail,
        status: 'sent',
        provider: 'resend',
        detail: `Confirmation email with attached invoice (${payload.invoiceFilename}) sent to ${recipientEmail}.`,
        previewText: payload.textBody,
        invoiceFilename: payload.invoiceFilename,
      };
    } catch (error) {
      return {
        channel: 'email',
        target: recipientEmail,
        status: 'failed',
        provider: 'resend',
        detail: error instanceof Error ? error.message : 'Resend email delivery failed.',
        previewText: payload.textBody,
        invoiceFilename: payload.invoiceFilename,
      };
    }
  }

  return {
    channel: 'email',
    target: recipientEmail,
    status: 'preview',
    provider: 'instant-preview',
    detail: `Confirmation email & invoice (${payload.invoiceFilename}) prepared for ${recipientEmail}.`,
    previewText: payload.textBody,
    invoiceFilename: payload.invoiceFilename,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/orders/notify', async (req, res) => {
    const body = req.body as {
      order?: OrderRecord;
      supportEmail?: string;
      whatsappNumber?: string;
    };

    const order = body?.order;
    if (
      !order ||
      typeof order.orderNumber !== 'string' ||
      !order.customer ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    ) {
      res.status(400).json({ error: 'Invalid order payload for confirmation dispatch.' });
      return;
    }

    const [sms, email] = await Promise.all([
      dispatchSmsConfirmation(order, body.whatsappNumber),
      dispatchEmailConfirmationAndInvoice(order, {
        supportEmail: body.supportEmail,
        whatsappNumber: body.whatsappNumber,
      }),
    ]);

    const result: OrderNotificationDispatchResult = {
      orderNumber: order.orderNumber,
      dispatchedAt: new Date().toISOString(),
      sms,
      email,
    };
    res.json(result);
  });

  const resolveRequestOrigin = (req: express.Request): string => {
    const envUrl = (
      process.env.SITE_URL ||
      process.env.URL ||
      process.env.APP_URL ||
      ''
    ).trim();
    if (envUrl && envUrl !== 'MY_APP_URL') {
      return envUrl;
    }
    const host = req.get('host');
    if (host) {
      return `${req.protocol}://${host}`;
    }
    return 'https://bee4.in';
  };

  app.get('/sitemap.xml', (req, res) => {
    const xml = generateSitemapXml({
      products: INITIAL_PRODUCTS,
      origin: resolveRequestOrigin(req),
    });
    res.status(200).type('application/xml; charset=utf-8').send(xml);
  });

  app.get('/robots.txt', (req, res) => {
    const txt = generateRobotsTxt(resolveRequestOrigin(req));
    res.status(200).type('text/plain; charset=utf-8').send(txt);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BEE4 server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
