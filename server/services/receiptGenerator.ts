import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { randomInt } from 'crypto';

export interface ReceiptOptions {
  date: string;       // YYYY-MM-DD
  amount: string;     // e.g. "39.99"
  email: string;
  itemName: string;   // e.g. "Fortnite - Standard Founder's Pack"
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return `${days[d.getUTCDay()]}, ${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

export async function generateXboxReceipt(opts: ReceiptOptions): Promise<Buffer> {
  const W = 620;
  const H = 820;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const orderNum = String(randomInt(100000000, 999999999));
  const amt = parseFloat(opts.amount).toFixed(2);
  const dateLabel = formatDate(opts.date);

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // outer border line at top
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, W, 3);

  // ── Microsoft logo ────────────────────────────────────────────────────────
  const lx = 40, ly = 32, sq = 10, gap = 2;
  ctx.fillStyle = '#F25022'; ctx.fillRect(lx, ly, sq, sq);
  ctx.fillStyle = '#7FBA00'; ctx.fillRect(lx + sq + gap, ly, sq, sq);
  ctx.fillStyle = '#00A4EF'; ctx.fillRect(lx, ly + sq + gap, sq, sq);
  ctx.fillStyle = '#FFB900'; ctx.fillRect(lx + sq + gap, ly + sq + gap, sq, sq);

  ctx.fillStyle = '#737373';
  ctx.font = '14px sans-serif';
  ctx.fillText('Microsoft', lx + sq * 2 + gap + 8, ly + sq + gap / 2 + 4);

  // ── Greeting ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Hi there,', 40, 105);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(`Thank you for shopping with us on ${dateLabel}.`, 40, 138);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#444444';
  ctx.fillText('Any downloads you bought (except pre-orders) are available now.', 40, 163);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Order ${orderNum}`, 40, 192);

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 205, W - 80, 1);

  // ── Product row ───────────────────────────────────────────────────────────
  // Small Fortnite icon placeholder
  ctx.fillStyle = '#1a3a5c';
  ctx.fillRect(40, 218, 58, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('FORTNITE', 43, 250);

  // Product name + qty
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px sans-serif';

  // Word wrap the item name if too long
  const itemWords = opts.itemName.split(' ');
  let line1 = '', line2 = '';
  let lineLen = 0;
  for (const word of itemWords) {
    if (lineLen + word.length < 32) { line1 += (line1 ? ' ' : '') + word; lineLen += word.length + 1; }
    else { line2 += (line2 ? ' ' : '') + word; }
  }
  ctx.fillText(line1 || opts.itemName, 112, 238);
  if (line2) { ctx.fillStyle = '#1a1a1a'; ctx.fillText(line2, 112, 256); }

  ctx.fillStyle = '#555555';
  ctx.font = '13px sans-serif';
  ctx.fillText('Quantity 1', 112, line2 ? 275 : 258);

  // Price (right aligned)
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px sans-serif';
  const priceText = `$${amt}`;
  const priceW = ctx.measureText(priceText).width;
  ctx.fillText(priceText, W - 40 - priceW, 248);

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 290, W - 80, 1);

  // ── Subtotal / Tax ────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Subtotal', 40, 320);
  const sub1W = ctx.measureText(`$${amt}`).width;
  ctx.fillText(`$${amt}`, W - 40 - sub1W, 320);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('Tax', 40, 348);
  const taxW = ctx.measureText('$0.00').width;
  ctx.fillText('$0.00', W - 40 - taxW, 348);

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 363, W - 80, 1);

  // ── Total ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Total', 40, 402);
  const totalW = ctx.measureText(`$${amt}`).width;
  ctx.fillText(`$${amt}`, W - 40 - totalW, 402);

  // ── Payment method ────────────────────────────────────────────────────────
  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.fillText('Payment method', 40, 435);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px sans-serif';
  ctx.fillText('Microsoft account balance', 40, 458);
  const balW = ctx.measureText(`$${amt}`).width;
  ctx.fillText(`$${amt}`, W - 40 - balW, 458);

  // ── Sent to ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Receipt sent to: ${opts.email}`, 40, 488);

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 505, W - 80, 1);

  // ── Blue button ───────────────────────────────────────────────────────────
  const btnX = 40, btnY = 522, btnW = 200, btnH = 36, btnR = 4;
  ctx.fillStyle = '#0078D4';
  ctx.beginPath();
  ctx.moveTo(btnX + btnR, btnY);
  ctx.lineTo(btnX + btnW - btnR, btnY);
  ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + btnR);
  ctx.lineTo(btnX + btnW, btnY + btnH - btnR);
  ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - btnR, btnY + btnH);
  ctx.lineTo(btnX + btnR, btnY + btnH);
  ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - btnR);
  ctx.lineTo(btnX, btnY + btnR);
  ctx.quadraticCurveTo(btnX, btnY, btnX + btnR, btnY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  const btnLabel = 'View or manage your order';
  const btnLabelW = ctx.measureText(btnLabel).width;
  ctx.fillText(btnLabel, btnX + (btnW - btnLabelW) / 2, btnY + 23);

  // ── Bottom separator ──────────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 580, W - 80, 1);

  // ── Footer promo block ────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Always know what\'s happening', 40, 615);

  ctx.fillStyle = '#555555';
  ctx.font = '12px sans-serif';
  ctx.fillText('Keep track of your family\'s schedule — events, vacations, and more.', 40, 638);

  ctx.fillStyle = '#0078D4';
  ctx.font = '12px sans-serif';
  ctx.fillText('Learn how', 40, 660);

  // ── Bottom micro footer ───────────────────────────────────────────────────
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(40, 680, W - 80, 1);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '11px sans-serif';
  ctx.fillText('We recommend that you print and save this confirmation email and Terms of Sale.', 40, 702);

  return canvas.toBuffer('image/png');
}
