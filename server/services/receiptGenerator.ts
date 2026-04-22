import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { randomInt } from 'crypto';

// Register DejaVu Sans for clean receipt rendering
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Receipt');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'ReceiptBold');

export interface ReceiptOptions {
  date: string;       // YYYY-MM-DD
  amount: string;     // e.g. "39.99"
  email: string;
  itemName: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return `${days[d.getUTCDay()]}, ${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

function drawFortniteThumb(ctx: any, x: number, y: number, size: number) {
  // Sky gradient (top to bottom: light blue → darker blue)
  const skyGrad = ctx.createLinearGradient(x, y, x, y + size * 0.6);
  skyGrad.addColorStop(0, '#6bb8d4');
  skyGrad.addColorStop(1, '#2c7fa8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(x, y, size, size * 0.6);

  // Ground (dark teal-blue)
  const groundGrad = ctx.createLinearGradient(x, y + size * 0.6, x, y + size);
  groundGrad.addColorStop(0, '#1b5e7d');
  groundGrad.addColorStop(1, '#0d3349');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(x, y + size * 0.6, size, size * 0.4);

  // Storm circle / vortex in the sky (purple/dark)
  ctx.fillStyle = 'rgba(80, 20, 120, 0.55)';
  ctx.beginPath();
  ctx.arc(x + size * 0.75, y + size * 0.22, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Inner storm
  ctx.fillStyle = 'rgba(50, 10, 80, 0.7)';
  ctx.beginPath();
  ctx.arc(x + size * 0.75, y + size * 0.22, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Simple figure silhouette (character)
  ctx.fillStyle = '#0d2030';
  const cx = x + size * 0.3, cy = y + size * 0.68;
  // body
  ctx.fillRect(cx - 4, cy - 10, 8, 14);
  // head
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 5, 0, Math.PI * 2);
  ctx.fill();
  // legs
  ctx.fillRect(cx - 5, cy + 3, 4, 8);
  ctx.fillRect(cx + 1, cy + 3, 4, 8);

  // "FORTNITE" label at top of thumbnail
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, size, 14);
  ctx.fillStyle = '#f5c842';
  ctx.font = `${Math.round(size * 0.14)}px ReceiptBold`;
  ctx.textAlign = 'center';
  ctx.fillText('FORTNITE', x + size / 2, y + 11);
  ctx.textAlign = 'left';

  // thin border
  ctx.strokeStyle = '#c0c0c0';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, size, size);
}

export async function generateXboxReceipt(opts: ReceiptOptions): Promise<Buffer> {
  const W = 620;
  const H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const orderNum = String(randomInt(1000000000, 9999999999));
  const amt = parseFloat(opts.amount).toFixed(2);
  const dateLabel = formatDate(opts.date);
  const ML = 40;  // margin left
  const MR = W - 40; // margin right (580)

  // ── White background ─────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Microsoft logo ────────────────────────────────────────────────────────
  // 4 coloured squares (11px each, 2px gap)
  const lx = ML, ly = 30, sq = 11, gap = 2;
  ctx.fillStyle = '#F25022'; ctx.fillRect(lx,          ly,          sq, sq);
  ctx.fillStyle = '#7FBA00'; ctx.fillRect(lx + sq + gap, ly,          sq, sq);
  ctx.fillStyle = '#00A4EF'; ctx.fillRect(lx,          ly + sq + gap, sq, sq);
  ctx.fillStyle = '#FFB900'; ctx.fillRect(lx + sq + gap, ly + sq + gap, sq, sq);
  // "Microsoft" text
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

  // ── Product row ───────────────────────────────────────────────────────────
  const thumbY = 220, thumbSize = 63;
  drawFortniteThumb(ctx, ML, thumbY, thumbSize);

  // Product name (handle long names with optional second line)
  const nameX = ML + thumbSize + 14;
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

  // Price (right-aligned at product row level)
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

  // ── "Microsoft: Get organized!" + "Set up a family calendar" ─────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '12px Receipt';
  ctx.fillText('Microsoft: Get organized!', ML, 633);
  ctx.fillStyle = '#0067b8';
  ctx.font = '12px Receipt';
  const calText = 'Set up a family calendar';
  ctx.fillText(calText, MR - ctx.measureText(calText).width, 633);

  // ── Always know heading ───────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '19px ReceiptBold';
  const alwaysText = 'Always know what\'s happening';
  ctx.fillText(alwaysText, (W - ctx.measureText(alwaysText).width) / 2, 665);

  // ── Body text (centered, may need two lines) ──────────────────────────────
  ctx.fillStyle = '#444444';
  ctx.font = '12.5px Receipt';
  const bodyLine1 = "Keep track of your family's schedule \u2014 events, appointments, vacations \u2014";
  const bodyLine2 = 'in one place that everyone can see.';
  ctx.fillText(bodyLine1, (W - ctx.measureText(bodyLine1).width) / 2, 690);
  ctx.fillText(bodyLine2, (W - ctx.measureText(bodyLine2).width) / 2, 708);

  // ── Learn how ─────────────────────────────────────────────────────────────
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
