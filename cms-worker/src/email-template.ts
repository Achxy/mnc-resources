const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const emailLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:20px 24px;">
              <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">MnC Resources</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const otpBlock = (code: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:#f4f4f4;border:2px solid #111111;border-radius:8px;padding:16px 40px;">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;color:#111111;letter-spacing:8px;">${escapeHtml(code)}</span>
    </td>
  </tr>
</table>`;

export const verificationOtpEmail = (name: string, code: string) =>
  emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#111111;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:14px;color:#333333;line-height:1.6;">Enter this code to verify your email and complete your registration:</p>
    ${otpBlock(code)}
    <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">This code expires in 10 minutes.</p>
  `);

export const resetOtpEmail = (name: string, code: string) =>
  emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#111111;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:14px;color:#333333;line-height:1.6;">Enter this code to reset your password:</p>
    ${otpBlock(code)}
    <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">This code expires in 10 minutes.</p>
  `);
