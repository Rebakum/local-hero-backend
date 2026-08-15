/**
 * Email system smoke test.
 * Renders EVERY transactional template via the real EmailService, then sends
 * the actual rendered content to a single recipient through the same SMTP
 * transport. Proves render + SMTP acceptance per type.
 *
 * SAFETY: no secrets printed. Per-template SMTP message IDs are printed.
 */
process.env.TS_NODE_TRANSPILE_ONLY = "true";
require("ts-node/register/transpile-only");
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const {
  sendTransactionalEmail,
  renderTransactionalEmail,
} = require("./src/app/utils/email");
const nodemailer = require("nodemailer");

const OWNER = process.env.SMTP_USER || "rebakpi@gmail.com";
const FROM = process.env.SMTP_FROM || `LocalHero <${OWNER}>`;
const smtp = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: (process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  BOOKING_REQUEST: {
    professionalName: "John Smith",
    trade: "Plumbing",
    customerName: "Alice Jones",
    postcode: "SW1A 1AA",
    bookingDate: "Fri Aug 15 2026",
    timeSlot: "Morning",
    description: "Leaking kitchen sink",
  },
  BOOKING_CONFIRMED: {
    customerName: "Alice Jones",
    trade: "Plumbing",
    bookingDate: "Fri Aug 15 2026",
    timeSlot: "Morning",
    priceInPence: 12000,
  },
  BOOKING_REJECTED: { customerName: "Alice Jones", trade: "Plumbing" },
  BOOKING_IN_PROGRESS: { customerName: "Alice Jones", trade: "Plumbing" },
  BOOKING_COMPLETED: { customerName: "Alice Jones", trade: "Plumbing" },
  BOOKING_CANCELLED: { name: "Alice Jones", role: "customer", trade: "Plumbing" },
  PAYMENT_SUCCESS_CUSTOMER: {
    customerName: "Alice Jones",
    trade: "Plumbing",
    amountInPence: 12000,
  },
  PAYMENT_SUCCESS_PROVIDER: {
    professionalName: "John Smith",
    trade: "Plumbing",
    amountInPence: 12000,
  },
  PAYMENT_FAILED: {
    customerName: "Alice Jones",
    trade: "Plumbing",
    amountInPence: 12000,
  },
  REFUND_ISSUED: {
    customerName: "Alice Jones",
    trade: "Plumbing",
    amountInPence: 12000,
  },
  NEW_LEAD: {
    professionalName: "John Smith",
    trade: "Plumbing",
    city: "London",
    postcode: "SW1A 1AA",
    description: "Burst pipe in bathroom",
  },
  QUOTE_RESPONSE: {
    customerName: "Alice Jones",
    trade: "Plumbing",
    professionalName: "John Smith",
    amountInPence: 12000,
    message: "Can start tomorrow",
  },
  QUOTE_ACCEPTED: {
    professionalName: "John Smith",
    trade: "Plumbing",
    amountInPence: 12000,
  },
  PROVIDER_APPROVED: { name: "John Smith", trade: "Plumbing" },
  PROVIDER_REJECTED: { name: "John Smith", trade: "Plumbing", reason: "Missing insurance documents" },
  PROVIDER_APPLICATION_SUBMITTED: {
    adminName: "Admin",
    companyName: "Smith Plumbing Ltd",
    trade: "Plumbing",
  },
  NEW_REVIEW: {
    professionalName: "John Smith",
    author: "Alice Jones",
    rating: 5,
    comment: "Excellent work, very tidy.",
  },
  REVIEW_RESPONSE: {
    authorName: "Alice Jones",
    businessName: "Smith Plumbing Ltd",
    response: "Thanks Alice, it was a pleasure.",
  },
  PASSWORD_RESET: { name: "Alice Jones", resetUrl: "http://localhost:5173/reset-password?token=abc123" },
};

(async () => {
  const results = [];

  for (const [type, data] of Object.entries(templates)) {
    // 1) Render via the real service.
    let rendered;
    try {
      rendered = renderTransactionalEmail(type, data);
    } catch (err) {
      results.push({ type, ok: false, detail: `render error: ${err.message}` });
      continue;
    }

    // 2) Exercise the exact runtime send path.
    try {
      await sendTransactionalEmail(type, OWNER, data);
    } catch (err) {
      results.push({ type, ok: false, detail: `service send error: ${err.message}` });
      continue;
    }

    // 3) Independent SMTP acceptance of the SAME rendered content.
    try {
      const info = await smtp.sendMail({
        from: FROM,
        to: OWNER,
        subject: rendered.subject,
        html: rendered.html,
      });
      if (info.messageId) {
        results.push({ type, ok: true, detail: `messageId=${info.messageId}` });
      } else {
        results.push({
          type,
          ok: false,
          detail: "smtp: no messageId returned",
        });
      }
    } catch (err) {
      results.push({
        type,
        ok: false,
        detail: `smtp: ${err.code || err.message}`,
      });
    }
  }

  console.log("=== EMAIL SMOKE TEST ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.type}  (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} templates rendered + accepted by SMTP`);
  process.exit(failed ? 1 : 0);
})();
