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

const ctaButton = (url: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:#111111;border-radius:6px;">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:inherit;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;

export const verificationEmail = (name: string, url: string) =>
  emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#111111;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 8px;font-size:14px;color:#333333;line-height:1.6;">Verify your email to complete your registration for MnC Resources.</p>
    <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">Click the button below to activate your account:</p>
    ${ctaButton(url, "Verify Email")}
    <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin:4px 0 0;font-size:12px;color:#999999;word-break:break-all;">${escapeHtml(url)}</p>
  `);

export const resetPasswordEmail = (name: string, url: string) =>
  emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;color:#111111;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 8px;font-size:14px;color:#333333;line-height:1.6;">We received a request to reset your password for MnC Resources.</p>
    <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">Click the button below to set a new password:</p>
    ${ctaButton(url, "Reset Password")}
    <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin:4px 0 0;font-size:12px;color:#999999;word-break:break-all;">${escapeHtml(url)}</p>
  `);
