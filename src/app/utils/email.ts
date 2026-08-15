import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import config from "../../config";

// ---------------------------------------------------------------------------
// Nodemailer + Gmail SMTP transport.
//
// Gmail SMTP requires an App Password (NOT the normal account password) and
// 2FA enabled on the Google account. It has a daily sending cap (~500/day on
// a regular Gmail account, ~2000/day on Workspace) and is intended here for
// transactional email only (verification, password reset, booking
// notifications) — not bulk/marketing mail.
//
// Everything provider-specific lives in this module: swapping to
// SES/SendGrid/Mailgun later only means changing the transporter below.
// ---------------------------------------------------------------------------

let transporter: Transporter | null = null;
let verifyPromise: Promise<void> | null = null;

const getTransporter = (): Transporter | null => {
  // No SMTP credentials configured (local development): treat as disabled so
  // the flow can still be exercised end to end via console logging.
  if (!config.smtp.host || !config.smtp.user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

// Verify the SMTP connection once on first use so a bad config fails loudly
// and early instead of only surfacing when the first real email is attempted.
const verifyTransporter = async (client: Transporter): Promise<void> => {
  if (!verifyPromise) {
    verifyPromise = client
      .verify()
      .then(() => {
        console.log("[Email] SMTP transporter verified successfully.");
      })
      .catch((error: unknown) => {
        verifyPromise = null; // allow a later retry
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          "[Email] SMTP transporter verification failed (check SMTP_* config):",
          message
        );
        throw new Error("Failed to connect to email server");
      });
  }
  return verifyPromise;
};

const brand = "#0f766e"; // LocalHero primary teal

const firstName = (name?: string): string =>
  (name || "there").trim().split(" ")[0];

const formatGBP = (pence?: number): string =>
  pence === undefined || pence === null
    ? ""
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(pence / 100);

const emailShell = (opts: {
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  note?: string;
}): string => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
              <tr>
                <td align="center" style="padding:36px 40px 0;">
                  <img src="${config.clientUrl}/logoWhite/logo1.png" alt="LocalHero" width="140" style="display:block;border:0;max-height:48px;object-fit:contain;" />
                </td>
              </tr>
              <tr>
                <td style="padding:28px 40px 8px;">
                  <h1 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;">
                    ${opts.title}
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 40px;">
                  ${opts.paragraphs
                    .map(
                      (p) =>
                        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">${p}</p>`
                    )
                    .join("")}
                </td>
              </tr>
              ${
                opts.cta
                  ? `<tr>
                <td align="center" style="padding:8px 40px;">
                  <a href="${opts.cta.url}" style="display:inline-block;background-color:${brand};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:12px;">
                    ${opts.cta.label}
                  </a>
                </td>
              </tr>`
                  : ""
              }
              ${
                opts.note
                  ? `<tr>
                <td style="padding:28px 40px 8px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                    ${opts.note}
                  </p>
                </td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding:32px 40px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                    © ${new Date().getFullYear()} LocalHero. Connecting you with vetted local pros.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

export type TransactionalEmailType =
  | "BOOKING_REQUEST"
  | "BOOKING_CONFIRMED"
  | "BOOKING_REJECTED"
  | "BOOKING_IN_PROGRESS"
  | "BOOKING_COMPLETED"
  | "BOOKING_COMPLETED_REVIEW"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCESS_CUSTOMER"
  | "PAYMENT_SUCCESS_PROVIDER"
  | "PAYMENT_FAILED"
  | "REFUND_ISSUED"
  | "NEW_LEAD"
  | "QUOTE_RESPONSE"
  | "QUOTE_ACCEPTED"
  | "PROVIDER_APPROVED"
  | "PROVIDER_REJECTED"
  | "PROVIDER_APPLICATION_SUBMITTED"
  | "NEW_REVIEW"
  | "REVIEW_RESPONSE"
  | "PASSWORD_RESET";

// Per-type subject + body. Receives only the fields each module has on hand.
const templates: Record<
  TransactionalEmailType,
  (d: any) => { subject: string; html: string }
> = {
  BOOKING_REQUEST: (d) => ({
    subject: `New booking request: ${d.trade}`,
    html: emailShell({
      title: `New ${d.trade} booking request`,
      paragraphs: [
        `Hi ${firstName(d.professionalName)}`,
        `You have a new ${d.trade} booking request from ${d.customerName} in ${d.postcode}.`,
        `When: ${d.bookingDate} at ${d.timeSlot}.`,
        `“${d.description}”`,
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/provider/bookings`,
      },
      note: "Reply to the customer or manage the booking from your dashboard.",
    }),
  }),
  BOOKING_CONFIRMED: (d) => ({
    subject: `Your ${d.trade} booking is confirmed`,
    html: emailShell({
      title: "Booking confirmed",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `Great news — your ${d.trade} booking has been accepted.`,
        `When: ${d.bookingDate} at ${d.timeSlot}.`,
        d.priceInPence
          ? `Your quoted price is ${formatGBP(d.priceInPence)}.`
          : "The professional will confirm pricing shortly.",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  BOOKING_REJECTED: (d) => ({
    subject: `Update on your ${d.trade} booking`,
    html: emailShell({
      title: "Booking not accepted",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `Unfortunately your ${d.trade} booking request was not accepted this time.`,
        "Don't worry — you can request another professional or post a quote request and let local pros come to you.",
      ],
      cta: {
        label: "Book another professional",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  BOOKING_IN_PROGRESS: (d) => ({
    subject: `Your ${d.trade} job is in progress`,
    html: emailShell({
      title: "Work in progress",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `The professional has started your ${d.trade} job.`,
        "Sit back — they'll keep you updated and mark the job complete when finished.",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  BOOKING_COMPLETED: (d) => ({
    subject: `Your ${d.trade} job is complete`,
    html: emailShell({
      title: "Job completed",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `Your ${d.trade} job has been completed.`,
        "If you're happy with the work, please leave a review — it helps the professional and other homeowners in your area.",
      ],
      cta: {
        label: "Leave a review",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
      note: "Reviews take less than a minute and go a long way.",
    }),
  }),
  BOOKING_COMPLETED_REVIEW: (d) => ({
    subject: `Your LocalHero service is complete — we'd love your review ⭐`,
    html: emailShell({
      title: "Your service has been completed",
      paragraphs: [
        `Hi ${firstName(d.name)}`,
        "Your service has been completed successfully.",
        "Thank you for choosing LocalHero.",
        "Your experience matters to us. Please take a moment to share your valuable feedback and rating. Your review helps other homeowners make confident decisions and helps great professionals build their reputation.",
      ],
      cta: {
        label: "⭐ Leave a Review",
        url: d.reviewUrl,
      },
      note: d.trade
        ? `We hope the ${d.trade} work met your expectations.`
        : undefined,
    }),
  }),
  BOOKING_CANCELLED: (d) => ({
    subject: `Booking cancelled: ${d.trade}`,
    html: emailShell({
      title: "Booking cancelled",
      paragraphs: [
        `Hi ${firstName(d.name)}`,
        `The ${d.trade} booking has been cancelled.`,
        d.role === "provider"
          ? "Your schedule has been freed up for other jobs."
          : "You can request another professional any time.",
      ],
      cta: {
        label: "Go to dashboard",
        url: `${config.clientUrl}/dashboard`,
      },
    }),
  }),
  PAYMENT_SUCCESS_CUSTOMER: (d) => ({
    subject: `Payment receipt: ${d.trade} booking`,
    html: emailShell({
      title: "Payment successful",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `Your payment of ${formatGBP(d.amountInPence)} for the ${d.trade} booking went through.`,
        "Thanks for using LocalHero!",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  PAYMENT_SUCCESS_PROVIDER: (d) => ({
    subject: `You received a payment of ${formatGBP(d.amountInPence)}`,
    html: emailShell({
      title: "Payment received",
      paragraphs: [
        `Hi ${firstName(d.professionalName)}`,
        `You received a payment of ${formatGBP(d.amountInPence)} for the ${d.trade} booking.`,
        "It usually lands in your bank within a few business days.",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/provider/bookings`,
      },
    }),
  }),
  PAYMENT_FAILED: (d) => ({
    subject: `Payment failed: ${d.trade} booking`,
    html: emailShell({
      title: "Payment failed",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `We couldn't complete your payment of ${formatGBP(d.amountInPence)} for the ${d.trade} booking.`,
        "Please check your payment method and try again from your bookings page.",
      ],
      cta: {
        label: "Try again",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  REFUND_ISSUED: (d) => ({
    subject: `Refund issued: ${formatGBP(d.amountInPence)}`,
    html: emailShell({
      title: "Refund issued",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `A refund of ${formatGBP(d.amountInPence)} for the ${d.trade} booking has been issued.`,
        "The money will appear on your original payment method within 5–10 business days.",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/user/bookings`,
      },
    }),
  }),
  NEW_LEAD: (d) => ({
    subject: `New ${d.trade} lead near ${d.city}`,
    html: emailShell({
      title: "New lead available",
      paragraphs: [
        `Hi ${firstName(d.professionalName)}`,
        `A new ${d.trade} job in ${d.city} is looking for quotes.`,
        `“${d.description}”`,
        `Postcode area: ${d.postcode}.`,
      ],
      cta: {
        label: "Send a quote",
        url: `${config.clientUrl}/dashboard/provider/quotes`,
      },
      note: "Leads are available on a first-come basis — respond quickly.",
    }),
  }),
  QUOTE_RESPONSE: (d) => ({
    subject: `New quote for your ${d.trade} request`,
    html: emailShell({
      title: "New quote received",
      paragraphs: [
        `Hi ${firstName(d.customerName)}`,
        `${d.professionalName} has quoted ${formatGBP(d.amountInPence)} for your ${d.trade} request.`,
        d.message ? `“${d.message}”` : "",
      ],
      cta: {
        label: "View quote",
        url: `${config.clientUrl}/dashboard/user/quotes`,
      },
    }),
  }),
  QUOTE_ACCEPTED: (d) => ({
    subject: `Your quote was accepted`,
    html: emailShell({
      title: "Quote accepted",
      paragraphs: [
        `Hi ${firstName(d.professionalName)}`,
        `The customer accepted your quote of ${formatGBP(d.amountInPence)} for a ${d.trade} job.`,
        "A booking has been created automatically — check your dashboard to get started.",
      ],
      cta: {
        label: "View booking",
        url: `${config.clientUrl}/dashboard/provider/bookings`,
      },
    }),
  }),
  PROVIDER_APPROVED: (d) => ({
    subject: "Your business is live on LocalHero",
    html: emailShell({
      title: "You're live on LocalHero 🎉",
      paragraphs: [
        `Hi ${firstName(d.name)}`,
        `Congratulations! Your ${d.trade} business has been approved and is now visible to customers.`,
        "Update your profile, set your availability, and start receiving leads and bookings.",
      ],
      cta: {
        label: "View my profile",
        url: `${config.clientUrl}/dashboard/provider/profile`,
      },
    }),
  }),
  PROVIDER_REJECTED: (d) => ({
    subject: "Update on your provider application",
    html: emailShell({
      title: "Application update",
      paragraphs: [
        `Hi ${firstName(d.name)}`,
        `We're sorry — your ${d.trade} provider application was not approved.`,
        d.reason ? `Reason: ${d.reason}` : "You can update your application and re-apply.",
      ],
      cta: {
        label: "Re-apply",
        url: `${config.clientUrl}/become-a-provider`,
      },
    }),
  }),
  PROVIDER_APPLICATION_SUBMITTED: (d) => ({
    subject: `New provider application: ${d.companyName}`,
    html: emailShell({
      title: "New provider application",
      paragraphs: [
        `Hi ${firstName(d.adminName)}`,
        `${d.companyName} applied to become a ${d.trade} provider.`,
        "Review the application in the admin dashboard.",
      ],
      cta: {
        label: "Review application",
        url: `${config.clientUrl}/admin/provider-applications`,
      },
    }),
  }),
  NEW_REVIEW: (d) => ({
    subject: `You received a ${d.rating}/5 review`,
    html: emailShell({
      title: "New review",
      paragraphs: [
        `Hi ${firstName(d.professionalName)}`,
        `${d.author} rated your service ${d.rating}/5 on LocalHero.`,
        `“${d.comment}”`,
      ],
      cta: {
        label: "View review",
        url: `${config.clientUrl}/dashboard/provider/reviews`,
      },
      note: "Great reviews help you win more jobs.",
    }),
  }),
  REVIEW_RESPONSE: (d) => ({
    subject: `${d.businessName} replied to your review`,
    html: emailShell({
      title: "The professional replied",
      paragraphs: [
        `Hi ${firstName(d.authorName)}`,
        `${d.businessName} replied to your review:`,
        `“${d.response}”`,
      ],
      cta: {
        label: "View review",
        url: `${config.clientUrl}/dashboard`,
      },
    }),
  }),
  PASSWORD_RESET: (d) => ({
    subject: "Reset your LocalHero password",
    html: emailShell({
      title: "Password reset",
      paragraphs: [
        `Hi ${firstName(d.name)}`,
        "We received a request to reset your LocalHero password.",
        "Use the button below to choose a new one. This link expires in 1 hour.",
      ],
      cta: {
        label: "Reset password",
        url: d.resetUrl,
      },
      note: "If you didn't request this, you can safely ignore this email.",
    }),
  }),
};

const renderTemplate = (
  type: TransactionalEmailType,
  data: any
): { subject: string; html: string } => templates[type](data);

const send = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  const client = getTransporter();

  // No SMTP configured (local development): log so the flow can still be
  // exercised end to end.
  if (!client) {
    console.log(`\n[DEV] Email to ${to}: ${subject}\n`);
    return;
  }

  await verifyTransporter(client);

  try {
    const info = await client.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    // Log the SMTP acceptance (message id) for observability. Never log the
    // recipient's content or any credentials.
    console.log(
      `[Email] Sent "${subject}" to ${to} (messageId: ${info.messageId})`
    );
  } catch (error) {
    // Log useful server-side detail (never credentials) and surface the same
    // error the app's callers already expect. A Nodemailer failure is never
    // treated as success.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send email to ${to}:`, message);
    throw new Error("Failed to send email");
  }
};

// Fire-and-forget wrapper so a failed email never breaks the business flow.
const sendEmailSafe = async (
  type: TransactionalEmailType,
  to: string,
  data: any
): Promise<void> => {
  if (!to) return;
  try {
    const { subject, html } = renderTemplate(type, data);
    await send(to, subject, html);
  } catch (error) {
    console.error(`[Email] ${type} to ${to} failed:`, error);
  }
};

const sendVerificationEmail = async (
  to: string,
  name: string,
  token: string
): Promise<void> => {
  const verifyUrl = `${config.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    to,
    "Verify your LocalHero email",
    emailShell({
      title: "Welcome to LocalHero 👋",
      paragraphs: [
        `Hi ${firstName(name)}`,
        "Thanks for creating your LocalHero account.",
        "Please verify your email address by clicking the button below.",
      ],
      cta: { label: "Verify Email", url: verifyUrl },
      note: `This link expires in ${config.emailVerification.expiresInMinutes} minutes. If you didn't create this account, you can safely ignore this email.`,
    })
  );
};

const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string
): Promise<void> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmailSafe("PASSWORD_RESET", to, { name, resetUrl });
};

const sendBookingCompletedReviewEmail = async (
  to: string,
  customerName: string,
  bookingId: string,
  trade?: string
): Promise<void> => {
  const reviewUrl = `${config.clientUrl}/dashboard/user/reviews?bookingId=${encodeURIComponent(bookingId)}`;
  await sendEmailSafe("BOOKING_COMPLETED_REVIEW", to, {
    name: customerName,
    bookingId,
    trade,
    reviewUrl,
  });
};

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingCompletedReviewEmail,
  sendEmailSafe as sendTransactionalEmail,
};
export const renderTransactionalEmail = renderTemplate;
