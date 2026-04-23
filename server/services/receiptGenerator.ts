import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { randomInt } from 'crypto';
import path from 'path';

// Register DejaVu Sans for clean receipt rendering
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Receipt');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'ReceiptBold');

export interface ReceiptOptions {
  date: string;     // Free-form, e.g. "Monday, July 15, 2007"
  amount: string;   // e.g. "39.99" or "$39.99"
  itemName: string;
}

export async function generateXboxReceipt(opts: ReceiptOptions): Promise<Buffer> {
  const W = 620;
  const H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const orderNum = String(randomInt(1000000000, 9999999999));

  // Strip leading $ and any spaces from amount, then format to 2dp
  const rawAmt = opts.amount.replace(/[^0-9.]/g, '');
  const amt = parseFloat(rawAmt || '0').toFixed(2);

  const dateLabel = opts.date.trim();
  const ML = 40;
  const MR = W - 40;

  // ── White background ──────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Microsoft logo ────────────────────────────────────────────────────────
  const lx = ML, ly = 30, sq = 11, gap = 2;
  ctx.fillStyle = '#F25022'; ctx.fillRect(lx,           ly,           sq, sq);
  ctx.fillStyle = '#7FBA00'; ctx.fillRect(lx + sq + gap, ly,           sq, sq);
  ctx.fillStyle = '#00A4EF'; ctx.fillRect(lx,           ly + sq + gap, sq, sq);
  ctx.fillStyle = '#FFB900'; ctx.fillRect(lx + sq + gap, ly + sq + gap, sq, sq);
  ctx.fillStyle = '#737373';
  ctx.font = '15px Receipt';
  ctx.fillText('Microsoft', lx + sq * 2 + gap + 9, ly + sq + gap / 2 + 5);

  // ── Hi there ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#111111';
  ctx.font = '38px ReceiptBold';
  ctx.fillText('Hi there,', ML, 107);

  // ── Thank you text ────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '16px Receipt';
  ctx.fillText(`Thank you for shopping with us on ${dateLabel}.`, ML, 148);

  ctx.fillStyle = '#444444';
  ctx.font = '13px Receipt';
  ctx.fillText('Any downloads you bought (except pre-orders) are available now.', ML, 172);

  ctx.fillStyle = '#444444';
  ctx.font = '13px Receipt';
  ctx.fillText(`Order ${orderNum}`, ML, 194);

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(ML, 207, MR - ML, 1);

  // ── Fortnite thumbnail ───────────────────────────────────────────────────
  const thumbY = 220, thumbSize = 63;
  try {
    const thumbPath = path.resolve(process.cwd(), 'public/assets/fortnite_thumb.png');
    const thumbImg = await loadImage(thumbPath);
    // Draw image exactly into the box — no gap, no border
    ctx.drawImage(thumbImg, 0, 0, thumbImg.width, thumbImg.height, ML, thumbY, thumbSize, thumbSize);
  } catch {
    // fallback: dark blue placeholder
    ctx.fillStyle = '#1b3c5c';
    ctx.fillRect(ML, thumbY, thumbSize, thumbSize);
    ctx.fillStyle = '#f5c842';
    ctx.font = '8px ReceiptBold';
    ctx.textAlign = 'center';
    ctx.fillText('FORTNITE', ML + thumbSize / 2, thumbY + thumbSize / 2);
    ctx.textAlign = 'left';
  }

  // ── Product name + qty ────────────────────────────────────────────────────
  const nameX = ML + thumbSize + 14;

  // Word-wrap item name across two lines (~36 chars per line)
  const words = opts.itemName.split(' ');
  let line1 = '', line2 = '';
  let used = 0;
  for (const w of words) {
    if (used + w.length < 36) { line1 += (line1 ? ' ' : '') + w; used += w.length + 1; }
    else { line2 += (line2 ? ' ' : '') + w; }
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px Receipt';
  ctx.fillText(line1, nameX, thumbY + 18);
  if (line2) ctx.fillText(line2, nameX, thumbY + 36);

  ctx.fillStyle = '#666666';
  ctx.font = '13px Receipt';
  ctx.fillText('Quantity 1', nameX, line2 ? thumbY + 56 : thumbY + 38);

  // Price right-aligned at product row level
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px Receipt';
  const priceStr = `$${amt}`;
  ctx.fillText(priceStr, MR - ctx.measureText(priceStr).width, thumbY + 18);

  // ── Subtotal / Tax ────────────────────────────────────────────────────────
  const subY = 325;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px ReceiptBold';
  ctx.fillText('Subtotal', ML, subY);
  const sub1 = `$${amt}`;
  ctx.fillText(sub1, MR - ctx.measureText(sub1).width, subY);

  ctx.fillText('Tax', ML, subY + 26);
  const taxStr = '$0.00';
  ctx.fillText(taxStr, MR - ctx.measureText(taxStr).width, subY + 26);

  // ── Total ─────────────────────────────────────────────────────────────────
  const totalY = 415;
  ctx.fillStyle = '#111111';
  ctx.font = '34px ReceiptBold';
  ctx.fillText('Total', ML, totalY);
  const totalStr = `$${amt}`;
  ctx.fillText(totalStr, MR - ctx.measureText(totalStr).width, totalY);

  // ── Payment method ────────────────────────────────────────────────────────
  ctx.fillStyle = '#999999';
  ctx.font = '12px Receipt';
  ctx.fillText('Payment method', ML, 462);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px Receipt';
  ctx.fillText('Microsoft account balance', ML, 483);
  const balStr = `$${amt}`;
  ctx.fillText(balStr, MR - ctx.measureText(balStr).width, 483);

  // ── Blue Button ───────────────────────────────────────────────────────────
  const btnX = ML, btnY = 548, btnW = 210, btnH = 36, btnR = 3;
  ctx.fillStyle = '#0067b8';
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
  ctx.font = '13px Receipt';
  const btnLabel = 'View or manage your order';
  ctx.fillText(btnLabel, btnX + (btnW - ctx.measureText(btnLabel).width) / 2, btnY + 23);

  // ── Footer separator ──────────────────────────────────────────────────────
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(ML, 612, MR - ML, 1);

  // ── "Microsoft: Get organized!" ───────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '12px Receipt';
  ctx.fillText('Microsoft: Get organized!', ML, 633);
  ctx.fillStyle = '#0067b8';
  const calText = 'Set up a family calendar';
  ctx.fillText(calText, MR - ctx.measureText(calText).width, 633);

  // ── Always know heading (centered) ────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '19px ReceiptBold';
  const alwaysText = "Always know what's happening";
  ctx.fillText(alwaysText, (W - ctx.measureText(alwaysText).width) / 2, 665);

  // ── Body text (centered) ──────────────────────────────────────────────────
  ctx.fillStyle = '#444444';
  ctx.font = '12.5px Receipt';
  const bodyLine1 = "Keep track of your family\u2019s schedule \u2013 events, appointments, vacations \u2013";
  const bodyLine2 = 'in one place that everyone can see.';
  ctx.fillText(bodyLine1, (W - ctx.measureText(bodyLine1).width) / 2, 690);
  ctx.fillText(bodyLine2, (W - ctx.measureText(bodyLine2).width) / 2, 708);

  // ── Learn how (centered, blue) ────────────────────────────────────────────
  ctx.fillStyle = '#0067b8';
  ctx.font = '12px Receipt';
  const learnText = 'Learn how';
  ctx.fillText(learnText, (W - ctx.measureText(learnText).width) / 2, 730);

  // ── Bottom separator ──────────────────────────────────────────────────────
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(ML, 747, MR - ML, 1);

  // ── Fine print ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '11px Receipt';
  ctx.fillText('We recommend that you print and save this confirmation email and Terms of Sale.', ML, 765);

  return canvas.toBuffer('image/png');
}
