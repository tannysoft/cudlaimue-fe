import "server-only";

export type PaymentSuccessItem = {
  name: string;
  quantity: number;
  priceSatang: number;
};

export type PaymentSuccessInput = {
  customerName?: string | null;
  orderId: string;
  subtotalSatang: number;
  discountSatang: number;
  couponCode?: string | null;
  totalSatang: number;
  items: PaymentSuccessItem[];
  origin: string;
  customerEmail?: string | null;
};

export type PaymentSuccessEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderPaymentSuccessEmail(input: PaymentSuccessInput): PaymentSuccessEmail {
  const total = formatBaht(input.totalSatang);
  const subtotal = formatBaht(input.subtotalSatang);
  const discount = formatBaht(input.discountSatang);
  const hasDiscount = input.discountSatang > 0;
  const shortId = input.orderId.slice(-8).toUpperCase();
  const libraryUrl = `${input.origin}/auth/login?next=${encodeURIComponent("/account/library")}`;
  const nameLine = input.customerName?.trim() ? `คุณ${escapeHtml(input.customerName.trim())}` : "ลูกค้า";

  const subject = `ชำระเงินสำเร็จ — คำสั่งซื้อ #${shortId}`;

  const itemsHtml = input.items
    .map(
      (it) => `
        <tr>
          <td width="65%" style="padding:12px 12px 12px 0;border-bottom:1px solid #eee;color:#111;font-size:14px;line-height:1.5;vertical-align:top;">${escapeHtml(
            it.name,
          )}${it.quantity > 1 ? ` <span style="color:#888;">× ${it.quantity}</span>` : ""}</td>
          <td width="35%" align="right" style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;color:#111;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;vertical-align:top;">${formatBaht(
            it.priceSatang * it.quantity,
          )}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <div style="font-size:20px;font-weight:700;color:#111;letter-spacing:0.2px;">คัดลายมือ</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0;font-size:22px;line-height:1.4;color:#111;">ชำระเงินสำเร็จ</h1>
                <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#333;">
                  สวัสดี${nameLine} ขอบคุณสำหรับคำสั่งซื้อ คุณสามารถเข้าสู่ระบบเพื่อดาวน์โหลดไฟล์ได้ทันทีที่หน้า “ไฟล์ของฉัน”
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;background:#f9f9f7;border-radius:8px;">
                  <tr>
                    <td width="55%" style="padding:12px 8px 12px 14px;color:#666;">หมายเลขคำสั่งซื้อ</td>
                    <td width="45%" align="right" style="padding:12px 14px 12px 8px;text-align:right;color:#111;font-weight:600;font-variant-numeric:tabular-nums;">#${escapeHtml(
                      shortId,
                    )}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <div style="font-size:12px;font-weight:600;letter-spacing:0.6px;color:#888;text-transform:uppercase;padding-bottom:4px;">รายการสินค้า</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-collapse:collapse;">
                  ${itemsHtml}
                  ${
                    hasDiscount
                      ? `
                  <tr>
                    <td width="65%" style="padding:12px 12px 4px 0;color:#666;font-size:14px;">ยอดรวมก่อนส่วนลด</td>
                    <td width="35%" align="right" style="padding:12px 0 4px 0;text-align:right;color:#666;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;">${subtotal}</td>
                  </tr>
                  <tr>
                    <td width="65%" style="padding:4px 12px 12px 0;color:#1f7a3a;font-size:14px;border-bottom:1px solid #eee;">
                      ส่วนลด${
                        input.couponCode
                          ? ` <span style="color:#888;font-size:12px;">(โค้ด ${escapeHtml(input.couponCode)})</span>`
                          : ""
                      }
                    </td>
                    <td width="35%" align="right" style="padding:4px 0 12px 0;text-align:right;color:#1f7a3a;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;border-bottom:1px solid #eee;">−${discount}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td width="65%" style="padding:14px 12px 0 0;font-weight:600;color:#111;font-size:15px;">รวมทั้งสิ้น</td>
                    <td width="35%" align="right" style="padding:14px 0 0 0;text-align:right;font-weight:700;color:#111;font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap;">${total}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;" align="center">
                <a href="${libraryUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">
                  เข้าสู่ระบบเพื่อดูไฟล์ของฉัน
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px;" align="center">
                <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
                  ถ้าปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br/>
                  <span style="color:#555;word-break:break-all;">${escapeHtml(libraryUrl)}</span>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#999;">© คัดลายมือ · cudlaimue.com</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const itemsText = input.items
    .map((it) => `  - ${it.name}${it.quantity > 1 ? ` × ${it.quantity}` : ""}  ${formatBaht(it.priceSatang * it.quantity)}`)
    .join("\n");

  const text = [
    `สวัสดี${input.customerName?.trim() ? `คุณ${input.customerName.trim()}` : "ลูกค้า"},`,
    "",
    `ชำระเงินสำเร็จสำหรับคำสั่งซื้อ #${shortId}`,
    "",
    itemsText,
    "",
    ...(hasDiscount
      ? [
          `ยอดรวมก่อนส่วนลด: ${subtotal}`,
          `ส่วนลด${input.couponCode ? ` (โค้ด ${input.couponCode})` : ""}: −${discount}`,
        ]
      : []),
    `รวมทั้งสิ้น: ${total}`,
    "",
    "เข้าสู่ระบบเพื่อดาวน์โหลดไฟล์ของคุณ:",
    libraryUrl,
    "",
    "— คัดลายมือ",
  ].join("\n");

  return { subject, html, text };
}

function formatBaht(satang: number): string {
  const baht = satang / 100;
  return `฿${baht.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
