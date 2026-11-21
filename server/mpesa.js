/**
 * M-Pesa Express (STK Push) via Safaricom Daraja.
 *
 * Modes (MPESA_ENV):
 *   mock        – default when no credentials are set. Simulates the phone prompt: succeeds after ~4s,
 *                 fails if the phone number ends in 000 (to test failures). No Safaricom account needed.
 *   sandbox     – https://sandbox.safaricom.co.ke (Daraja test credentials)
 *   production  – https://api.safaricom.co.ke (your live Paybill / Till)
 *
 * Env:
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET   – from your Daraja app
 *   MPESA_TILL                                  – Buy Goods till that receives the money (default 1750964, Rizz)
 *   MPESA_SHORTCODE                             – Store / Head-Office number linked to the till, used to sign requests.
 *                                                 Safaricom gives this with the Lipa na M-Pesa Online passkey; defaults to the till.
 *   MPESA_PASSKEY                               – Lipa na M-Pesa Online passkey
 *   MPESA_TRANSACTION_TYPE                      – CustomerBuyGoodsOnline (Till, default) or CustomerPayBillOnline (Paybill)
 *   MPESA_CALLBACK_URL                          – public HTTPS base URL of this server, e.g. https://rizz.example.com
 *   MPESA_BASE_URL                              – optional override of the Daraja host (used by tests)
 */
import crypto from 'node:crypto';

const ENV = process.env.MPESA_ENV || (process.env.MPESA_CONSUMER_KEY ? 'sandbox' : 'mock');
const BASE = process.env.MPESA_BASE_URL || (ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke');
const KEY = process.env.MPESA_CONSUMER_KEY || '';
const SECRET = process.env.MPESA_CONSUMER_SECRET || '';
/** Rizz's Buy Goods till — shown to guests and used as the receiving party. */
export const TILL = process.env.MPESA_TILL || '1750964';
// The Daraja sandbox only knows its test shortcode 174379, so sandbox calls use that for both sides.
const SANDBOX = ENV !== 'production';
const SHORTCODE = process.env.MPESA_SHORTCODE || (SANDBOX ? '174379' : TILL);
const PASSKEY = process.env.MPESA_PASSKEY || '';
const TX_TYPE = process.env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline';
const PARTY_B = process.env.MPESA_PARTY_B || (TX_TYPE === 'CustomerBuyGoodsOnline' ? (SANDBOX ? SHORTCODE : TILL) : SHORTCODE);
const CALLBACK_BASE = (process.env.MPESA_CALLBACK_URL || '').replace(/\/+$/, '');
/** Secret path segment so random callers can't fake payment confirmations. */
export const CALLBACK_SECRET = process.env.MPESA_CALLBACK_SECRET || crypto.createHash('sha256').update(`rizz:${KEY}:${PASSKEY}:${SHORTCODE}`).digest('hex').slice(0, 24);

export const mpesaInfo = () => ({ mode: ENV, till: TILL, type: TX_TYPE === 'CustomerBuyGoodsOnline' ? 'till' : 'paybill', shortcode: ENV === 'mock' ? null : SHORTCODE, callbackConfigured: !!CALLBACK_BASE });

/** 0712345678 / +254712345678 / 712345678 → 254712345678 (Safaricom 07xx and 01xx numbers). */
export function normalizePhone(input) {
  const d = String(input || '').replace(/\D/g, '');
  let p = d;
  if (/^0[17]\d{8}$/.test(d)) p = '254' + d.slice(1);
  else if (/^[17]\d{8}$/.test(d)) p = '254' + d;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}

/** Daraja wants local Kenyan time: YYYYMMDDHHmmss */
function timestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g('year')}${g('month')}${g('day')}${g('hour')}${g('minute')}${g('second')}`;
}
const password = (ts) => Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString('base64');

let token = null;
let tokenExp = 0;
async function accessToken() {
  if (token && Date.now() < tokenExp) return token;
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64') },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`M-Pesa auth failed (${res.status}). Check MPESA_CONSUMER_KEY/SECRET.`);
  token = data.access_token;
  tokenExp = Date.now() + (Number(data.expires_in || 3599) - 60) * 1000;
  return token;
}

async function daraja(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/**
 * Send the PIN prompt to the customer's phone.
 * Resolves { checkoutRequestId, merchantRequestId, message } or throws with a guest-friendly message.
 * In mock mode `onMockResult` is called later with a simulated callback.
 */
export async function stkPush({ phone, amount, reference, description, onMockResult }) {
  if (ENV === 'mock') {
    const checkoutRequestId = `ws_CO_MOCK_${crypto.randomBytes(6).toString('hex')}`;
    setTimeout(() => {
      const fail = phone.endsWith('000');
      onMockResult?.(parseCallback({ Body: { stkCallback: {
        MerchantRequestID: 'mock', CheckoutRequestID: checkoutRequestId,
        ResultCode: fail ? 1032 : 0, ResultDesc: fail ? 'Request cancelled by user' : 'The service request is processed successfully.',
        ...(fail ? {} : { CallbackMetadata: { Item: [
          { Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: `S${crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 9)}` },
          { Name: 'TransactionDate', Value: Number(timestamp()) }, { Name: 'PhoneNumber', Value: Number(phone) }] } }),
      } } }));
    }, Number(process.env.MPESA_MOCK_DELAY_MS || 4000));
    return { checkoutRequestId, merchantRequestId: 'mock', message: 'Test mode: approve the simulated prompt.' };
  }
  if (!KEY || !SECRET || !PASSKEY) throw new Error('M-Pesa is not configured on the server yet.');
  if (!CALLBACK_BASE) throw new Error('M-Pesa callback URL (MPESA_CALLBACK_URL) is not set on the server.');
  const ts = timestamp();
  const { ok, data } = await daraja('/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: SHORTCODE,
    Password: password(ts),
    Timestamp: ts,
    TransactionType: TX_TYPE,
    Amount: Math.ceil(amount),
    PartyA: phone,
    PartyB: PARTY_B,
    PhoneNumber: phone,
    CallBackURL: `${CALLBACK_BASE}/api/mpesa/callback/${CALLBACK_SECRET}`,
    AccountReference: String(reference).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'Rizz',
    TransactionDesc: String(description || 'Rizz Bar').slice(0, 13),
  });
  if (!ok || data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.CustomerMessage || data.ResponseDescription || 'M-Pesa could not send the prompt. Try again.');
  }
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID, message: data.CustomerMessage };
}

/** Ask Daraja for the status of a prompt (fallback when the callback can't reach this server). */
export async function stkQuery(checkoutRequestId) {
  if (ENV === 'mock') return null; // mock results arrive by simulated callback
  const ts = timestamp();
  const { data } = await daraja('/mpesa/stkpushquery/v1/query', {
    BusinessShortCode: SHORTCODE, Password: password(ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId,
  });
  // While the customer hasn't answered, Daraja returns an error code like 500.001.1001 ("being processed")
  if (data.ResultCode === undefined) return null;
  return { checkoutRequestId, success: String(data.ResultCode) === '0', resultCode: Number(data.ResultCode), resultDesc: data.ResultDesc };
}

/** Normalise Daraja's callback body. */
export function parseCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb) return null;
  const meta = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    success: Number(cb.ResultCode) === 0,
    resultCode: Number(cb.ResultCode),
    resultDesc: cb.ResultDesc,
    receipt: meta.MpesaReceiptNumber,
    amount: meta.Amount,
    phone: meta.PhoneNumber ? String(meta.PhoneNumber) : undefined,
  };
}

/** Friendly text for common STK result codes. */
export function friendlyResult(code, desc) {
  return ({
    1: 'Insufficient M-Pesa balance.',
    1032: 'You cancelled the M-Pesa prompt.',
    1037: "We couldn't reach your phone — make sure it's on and try again.",
    2001: 'Wrong M-Pesa PIN entered.',
    1019: 'The prompt expired — please try again.',
    1001: 'Another M-Pesa transaction is in progress on this number — wait a moment and retry.',
  })[code] || desc || 'Payment failed.';
}
