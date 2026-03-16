import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';
import { sendEmailViaSES } from '../services/email.service.js';

const router = Router();

/**
 * Employer actions over candidates (applications).
 *
 * POST /api/employer/candidates/email
 * Body: { to: string, subject: string, body: string }
 *
 * Notes:
 * - Uses AWS SES credentials from email.service.ts
 * - Keeps backend minimal; UI is responsible for placeholder substitution logic
 */
router.post('/candidates/email', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { to, subject, body } = req.body ?? {};
    const toEmail = typeof to === 'string' ? to.trim() : '';
    const subj = typeof subject === 'string' ? subject.trim() : '';
    const msg = typeof body === 'string' ? body.trim() : '';

    if (!toEmail || !subj || !msg) {
      res.status(400).json({ success: false, error: 'to, subject, and body are required' });
      return;
    }

    const userRow = await query(
      'SELECT first_name, last_name, email FROM users WHERE id = $1',
      [req.user.id]
    );

    const first = String(userRow.rows?.[0]?.first_name || '').trim();
    const last = String(userRow.rows?.[0]?.last_name || '').trim();
    const employerName = `${first} ${last}`.trim() || String(userRow.rows?.[0]?.email || 'Employer');

    const lines = msg.split("\n").map((line: string) => line.trim());

    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        out.push("<br/>");
        continue;
      }

      // Render checkbox-like rows for legacy human interview availability emails.
      const checkboxMatch = line.match(/^\[checkbox\]\s*(.*)$/i);
      if (checkboxMatch) {
        const label = checkboxMatch[1] || "";
        out.push(`<p>☐ ${escapeHtml(label)}</p>`);
        continue;
      }

      // Render a real email button:
      // UI sends:
      //   [button] Review and Book Slot
      //   https://...
      const buttonMatch = line.match(/^\[button\]\s*(.*)$/i);
      if (buttonMatch) {
        const label = (buttonMatch[1] || "").trim() || "Open";
        const href = String(lines[i + 1] || "").trim();
        if (href) {
          out.push(`
            <div style="text-align:center; margin: 24px 0;">
              <a href="${href}"
                 style="display:inline-block; background-color: hsl(38 92% 50%); color:#000000; padding: 14px 22px;
                        border-radius: 10px; text-decoration:none; font-weight:700; font-size: 15px;">
                ${escapeHtml(label)}
              </a>
            </div>
            <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
            <p style="font-size: 13px; color:#555;">${escapeHtml(href)}</p>
          `);
          i++; // consume URL line
          continue;
        }

        // If URL line missing, just render the label as text
        out.push(`<p><strong>${escapeHtml(label)}</strong></p>`);
        continue;
      }

      out.push(`<p>${escapeHtml(line)}</p>`);
    }

    const html = out.join("");

    await sendEmailViaSES(toEmail, subj, html, 'cardin@cardinaltalent.ai', {
      fromDisplayName: employerName,
      replyTo: String(userRow.rows?.[0]?.email || '').trim() || undefined,
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('POST /employer/candidates/email failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to send email' });
  }
});

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export default router;
