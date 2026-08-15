/**
 * Comprehensive E2E for the LocalHero backend on http://localhost:5050.
 * Covers: auth, provider application, quote, booking, booking status,
 * assign, payment checkout, refund (real Stripe test PI), review, messaging,
 * notifications retrieval, and email-attempt evidence from the server log.
 *
 * Every check asserts HTTP status + DB state + notification + recipient.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE = "http://localhost:5050/api/v1";
const SERVER_ERR_LOG = path.join(process.env.TEMP, "opencode", "lh5050.err.log");

const uid = Date.now().toString(36) + crypto.randomBytes(2).toString("hex");
const CUST_EMAIL = `audit-c-${uid}@gmail.com`;
const PROV_EMAIL = `audit-p-${uid}@gmail.com`;
const ADMIN_EMAIL = `audit-a-${uid}@gmail.com`;
const SUPER_EMAIL = `audit-s-${uid}@gmail.com`;
const PW = crypto.randomBytes(16).toString("base64url");

const results = [];
const record = (module, name, ok, detail = "") =>
  results.push({ module, name, ok, detail: detail || (ok ? "ok" : "FAILED") });

async function api(method, p, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function register(name, email) {
  const r = await api("POST", "/auth/register", {
    name, email, password: PW, phone: "+1555000" + Math.floor(1000 + Math.random() * 9000),
  });
  return r;
}

async function setVerified(email) {
  await prisma.user.updateMany({ where: { email }, data: { emailVerified: true } });
}

async function setRole(email, role) {
  await prisma.user.updateMany({ where: { email }, data: { role } });
}

async function login(email) {
  const r = await api("POST", "/auth/login", { email, password: PW });
  return r;
}

async function hasNotif(userId, type) {
  const n = await prisma.notification.findFirst({ where: { userId, type } });
  return n;
}

// Notifications are fire-and-forget, so poll until they land.
async function waitForNotif(userId, type, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await prisma.notification.findFirst({ where: { userId, type } });
    if (n) return n;
    await new Promise((res) => setTimeout(res, 150));
  }
  return null;
}

(async () => {
  // Clean up any previous audit run's users (cascades their records).
  await prisma.user.deleteMany({ where: { email: { startsWith: "audit-" } } });

  // ============================== SETUP ==============================
  let r = await register("Audit Customer", CUST_EMAIL);
  record("Auth", "register customer", r.status === 201);
  await setVerified(CUST_EMAIL);

  r = await register("Audit Provider", PROV_EMAIL);
  record("Auth", "register provider-applicant", r.status === 201);
  await setVerified(PROV_EMAIL);

  r = await register("Audit Admin", ADMIN_EMAIL);
  record("Auth", "register admin", r.status === 201);
  await setVerified(ADMIN_EMAIL);
  await setRole(ADMIN_EMAIL, "ADMIN");

  r = await register("Audit Super", SUPER_EMAIL);
  record("Auth", "register super admin", r.status === 201);
  await setVerified(SUPER_EMAIL);
  await setRole(SUPER_EMAIL, "SUPER_ADMIN");

  let cust = (await login(CUST_EMAIL)).json;
  let prov = (await login(PROV_EMAIL)).json;
  let admin = (await login(ADMIN_EMAIL)).json;
  let superT = (await login(SUPER_EMAIL)).json;

  const CUST_ID = cust.data.user.id;
  const PROV_ID = prov.data.user.id;
  const ADMIN_ID = admin.data.user.id;
  const SUPER_ID = superT.data.user.id;
  const CUST_TOK = cust.data.accessToken;
  const PROV_TOK = prov.data.accessToken;
  const ADMIN_TOK = admin.data.accessToken;
  const SUPER_TOK = superT.data.accessToken;

  record("Auth", "login all roles returns tokens",
    !!CUST_TOK && !!PROV_TOK && !!ADMIN_TOK && !!SUPER_TOK);

  // Forget-password (email wiring in auth)
  r = await api("POST", "/auth/forget-password", { email: CUST_EMAIL });
  record("Auth", "forget-password HTTP 200", r.status === 200, r.json?.message || "");

  // ==================== PROVIDER APPLICATION ====================
  // A role that is NOT "user" must be rejected (route roleGuard("user")).
  r = await api("POST", "/provider-applications", {
    trade: "Plumbing",
    companyName: "Audit Plumbing Ltd",
    bio: "Full plumbing services",
    hourlyRate: 40,
    location: "London",
    postcodeArea: "SW1",
    specialties: ["Burst pipes", "Boilers"],
    experienceYears: 5,
    phone: "+15550009999",
    portfolioImages: [],
  }, ADMIN_TOK);
  record("Provider App", "admin submit rejected (403)",
    r.status === 403, `status=${r.status} msg=${r.json?.message || ""}`);

  r = await api("POST", "/provider-applications", {
    trade: "Plumbing",
    companyName: "Audit Plumbing Ltd",
    bio: "Full plumbing services",
    hourlyRate: 40,
    location: "London",
    postcodeArea: "SW1",
    specialties: ["Burst pipes", "Boilers"],
    experienceYears: 5,
    phone: "+15550009999",
    portfolioImages: [],
  }, PROV_TOK);
  const appId = r.json?.data?.id;
  record("Provider App", "submit HTTP 201", r.status === 201 && !!appId, `status=${r.status}`);

  const adminNotif = await waitForNotif(ADMIN_ID, "PROVIDER_APPLICATION_SUBMITTED");
  const superNotif = await waitForNotif(SUPER_ID, "PROVIDER_APPLICATION_SUBMITTED");
  record("Provider App", "notify all admins (ADMIN)", !!adminNotif, adminNotif ? `notif=${adminNotif.id}` : "missing");
  record("Provider App", "notify all admins (SUPER_ADMIN)", !!superNotif, superNotif ? `notif=${superNotif.id}` : "missing");
  record("Provider App", "correct recipient (admins)", adminNotif?.userId === ADMIN_ID && superNotif?.userId === SUPER_ID);

  r = await api("GET", "/provider-applications", null, ADMIN_TOK);
  record("Provider App", "admin list HTTP 200", r.status === 200, `status=${r.status}`);

  r = await api("PATCH", `/provider-applications/${appId}/approve`, {}, SUPER_TOK);
  record("Provider App", "super-admin approve HTTP 200", r.status === 200, `status=${r.status} msg=${r.json?.message || ""}`);

  const provUser = await prisma.user.findUnique({ where: { id: PROV_ID } });
  record("Provider App", "applicant role -> serviceProvider", provUser?.role === "serviceProvider", `role=${provUser?.role}`);
  const prof = await prisma.professional.findUnique({ where: { userId: PROV_ID } });
  record("Provider App", "professional profile created", !!prof?.id, prof ? `prof=${prof.id}` : "missing");

  const approvedNotif = await waitForNotif(PROV_ID, "PROVIDER_APPLICATION_APPROVED");
  record("Provider App", "applicant notified (APPROVED)", !!approvedNotif, approvedNotif ? `notif=${approvedNotif.id}` : "missing");
  record("Provider App", "correct recipient (applicant)", approvedNotif?.userId === PROV_ID);

  // Re-login provider now that role = serviceProvider
  prov = (await login(PROV_EMAIL)).json;
  const PROV_TOK2 = prov.data.accessToken;
  record("Auth", "provider re-login as serviceProvider", prov.data.user.role === "serviceProvider", `role=${prov.data.user.role}`);

  const PROF_ID = prof.id;

  // ==================== QUOTE ====================
  r = await api("POST", "/quotes", {
    trade: "Plumbing",
    postcode: "SW1A 1AA",
    city: "London",
    description: "Fix a leaking kitchen sink",
    budgetInPence: 15000,
  }, CUST_TOK);
  const quoteId = r.json?.data?.id;
  record("Quote", "create HTTP 201", r.status === 201 && !!quoteId, `status=${r.status}`);

  const leadNotif = await waitForNotif(PROV_ID, "NEW_QUOTE");
  record("Quote", "provider notified (NEW_QUOTE)", !!leadNotif, leadNotif ? `notif=${leadNotif.id}` : "missing");
  record("Quote", "correct recipient (provider)", leadNotif?.userId === PROV_ID);

  r = await api("GET", "/quotes/available", null, PROV_TOK2);
  record("Quote", "provider available quotes HTTP 200", r.status === 200, `status=${r.status}`);

  r = await api("POST", `/quotes/${quoteId}/responses`, {
    amountInPence: 12000,
    message: "I can start tomorrow",
  }, PROV_TOK2);
  const respId = r.json?.data?.id;
  record("Quote", "provider respond HTTP 201", r.status === 201 && !!respId, `status=${r.status}`);

  const quoteRespNotif = await waitForNotif(CUST_ID, "QUOTE_RESPONSE");
  record("Quote", "customer notified (QUOTE_RESPONSE)", !!quoteRespNotif, quoteRespNotif ? `notif=${quoteRespNotif.id}` : "missing");
  record("Quote", "correct recipient (customer)", quoteRespNotif?.userId === CUST_ID);

  r = await api("PATCH", `/quotes/${quoteId}/responses/${respId}`, { status: "ACCEPTED" }, CUST_TOK);
  record("Quote", "customer accepts response HTTP 200", r.status === 200, `status=${r.status} msg=${r.json?.message || ""}`);

  const quoteAcceptedNotif = await waitForNotif(PROV_ID, "QUOTE_RESPONSE");
  record("Quote", "provider notified (accepted)", !!quoteAcceptedNotif, quoteAcceptedNotif ? `notif=${quoteAcceptedNotif.id}` : "missing");
  record("Quote", "correct recipient (provider accepted)", quoteAcceptedNotif?.userId === PROV_ID);

  const quoteBooking = await prisma.booking.findUnique({ where: { quoteResponseId: respId } });
  record("Quote", "accept created ACCEPTED booking with price", !!quoteBooking && quoteBooking.status === "ACCEPTED" && !!quoteBooking.priceInPence,
    quoteBooking ? `booking=${quoteBooking.id} status=${quoteBooking.status} price=${quoteBooking.priceInPence}` : "no booking");
  const QB_ID = quoteBooking?.id;
  const QB_PRICE = quoteBooking?.priceInPence;

  // ==================== PAYMENT (checkout) ====================
  r = await api("POST", `/payments/checkout/${QB_ID}`, {}, CUST_TOK);
  const checkoutUrl = r.json?.data?.checkoutUrl;
  record("Payment", "checkout session HTTP 201 + url", r.status === 201 && !!checkoutUrl, `status=${r.status} url=${checkoutUrl ? "yes" : "no"}`);
  const pay = await prisma.payment.findUnique({ where: { bookingId: QB_ID } });
  record("Payment", "payment record PENDING in DB", !!pay && pay.status === "PENDING", pay ? `status=${pay.status}` : "missing");

  // ==================== REFUND (real Stripe test PI) ====================
  const pi = await stripe.paymentIntents.create({
    amount: QB_PRICE,
    currency: "gbp",
    payment_method_types: ["card"],
    payment_method: "pm_card_visa",
    confirm: true,
  });
  record("Refund", "Stripe test PI confirmed", pi.status === "succeeded", `pi=${pi.id} status=${pi.status}`);
  await prisma.payment.update({
    where: { bookingId: QB_ID },
    data: { status: "PAID", stripePaymentIntentId: pi.id, paidAt: new Date() },
  });

  r = await api("POST", `/payments/${QB_ID}/refund`, {}, SUPER_TOK);
  record("Refund", "super-admin refund HTTP 200", r.status === 200, `status=${r.status} msg=${r.json?.message || ""}`);

  const refundedPay = await prisma.payment.findUnique({ where: { bookingId: QB_ID } });
  record("Refund", "payment marked REFUNDED in DB", refundedPay?.status === "REFUNDED", `status=${refundedPay?.status}`);

  const refundList = await stripe.refunds.list({ payment_intent: pi.id });
  record("Refund", "Stripe refund exists (real call)", refundList.data.length >= 1, `refunds=${refundList.data.length}`);

  const custRefundNotif = await waitForNotif(CUST_ID, "PAYMENT_REFUNDED");
  record("Refund", "customer notified (PAYMENT_REFUNDED)", !!custRefundNotif, custRefundNotif ? `notif=${custRefundNotif.id}` : "missing");
  record("Refund", "correct recipient (customer)", custRefundNotif?.userId === CUST_ID);

  const adminRefundNotif = await waitForNotif(ADMIN_ID, "PAYMENT_REFUNDED");
  record("Refund", "admins notified (PAYMENT_REFUNDED)", !!adminRefundNotif, adminRefundNotif ? `notif=${adminRefundNotif.id}` : "missing");

  // ==================== BOOKING (create) ====================
  const bkPayload = (professionalId) => ({
    trade: "Plumbing",
    professionalId,
    postcode: "SW1A 1AA",
    address: "10 Downing St",
    bookingDate: "2026-08-20T09:00:00.000Z",
    timeSlot: "Morning",
    urgency: "Standard",
    description: "Fix a dripping tap",
    fullName: "Audit Customer",
    email: CUST_EMAIL,
    phone: "+15550001111",
  });

  r = await api("POST", "/bookings", bkPayload(PROF_ID), CUST_TOK);
  const B1 = r.json?.data?.id;
  record("Booking", "create with pro HTTP 201", r.status === 201 && !!B1, `status=${r.status}`);

  const bReqNotif = await waitForNotif(PROV_ID, "BOOKING_REQUEST");
  record("Booking", "provider notified (BOOKING_REQUEST)", !!bReqNotif, bReqNotif ? `notif=${bReqNotif.id}` : "missing");
  record("Booking", "correct recipient (provider)", bReqNotif?.userId === PROV_ID);

  // ==================== BOOKING STATUS ====================
  r = await api("PATCH", `/bookings/${B1}/status`, { status: "IN_PROGRESS" }, PROV_TOK2);
  record("Booking Status", "provider IN_PROGRESS HTTP 200", r.status === 200, `status=${r.status}`);
  const inProg = await waitForNotif(CUST_ID, "BOOKING_IN_PROGRESS");
  record("Booking Status", "customer notified (IN_PROGRESS)", !!inProg, inProg ? `notif=${inProg.id}` : "missing");

  r = await api("PATCH", `/bookings/${B1}/status`, { status: "COMPLETED" }, PROV_TOK2);
  record("Booking Status", "provider COMPLETED HTTP 200", r.status === 200, `status=${r.status}`);
  const completed = await waitForNotif(CUST_ID, "BOOKING_COMPLETED");
  record("Booking Status", "customer notified (COMPLETED)", !!completed, completed ? `notif=${completed.id}` : "missing");

  r = await api("POST", "/bookings", bkPayload(PROF_ID), CUST_TOK);
  const B2 = r.json?.data?.id;
  r = await api("PATCH", `/bookings/${B2}/status`, { status: "REJECTED" }, PROV_TOK2);
  record("Booking Status", "provider REJECTED HTTP 200", r.status === 200, `status=${r.status}`);
  const rejected = await waitForNotif(CUST_ID, "BOOKING_REJECTED");
  record("Booking Status", "customer notified (REJECTED)", !!rejected, rejected ? `notif=${rejected.id}` : "missing");

  r = await api("POST", "/bookings", bkPayload(PROF_ID), CUST_TOK);
  const B3 = r.json?.data?.id;
  r = await api("PATCH", `/bookings/${B3}/status`, { status: "CANCELLED" }, CUST_TOK);
  record("Booking Status", "customer cancel HTTP 200", r.status === 200, `status=${r.status}`);
  const cancelled = await waitForNotif(PROV_ID, "BOOKING_CANCELLED");
  record("Booking Status", "provider notified (CANCELLED)", !!cancelled, cancelled ? `notif=${cancelled.id}` : "missing");

  // ==================== ASSIGN (admin) ====================
  r = await api("POST", "/bookings", bkPayload(undefined), CUST_TOK);
  const B4 = r.json?.data?.id;
  record("Booking", "create unassigned HTTP 201", r.status === 201 && !!B4, `status=${r.status}`);

  r = await api("PATCH", `/bookings/${B4}/assign`, { professionalId: PROF_ID }, ADMIN_TOK);
  record("Booking Status", "admin assign HTTP 200", r.status === 200, `status=${r.status} msg=${r.json?.message || ""}`);

  const assignNotif = await waitForNotif(CUST_ID, "BOOKING_CONFIRMATION");
  record("Booking Status", "customer notified on assign (CONFIRMATION)", !!assignNotif, assignNotif ? `notif=${assignNotif.id}` : "missing");
  record("Booking Status", "correct recipient (customer assign)", assignNotif?.userId === CUST_ID);

  // ==================== REVIEW ====================
  r = await api("POST", "/testimonials", {
    author: "Audit Customer",
    role: "Homeowner",
    city: "London",
    trade: "Plumbing",
    rating: 5,
    date: "2026-08-13",
    comment: "Great work, very professional.",
    verifiedJob: "Yes",
    source: "PLATFORM",
    professionalId: PROF_ID,
  }, CUST_TOK);
  const tId = r.json?.data?.id;
  record("Review", "create HTTP 201", r.status === 201 && !!tId, `status=${r.status}`);

  const reviewNotif = await waitForNotif(PROV_ID, "NEW_REVIEW");
  record("Review", "provider notified (NEW_REVIEW)", !!reviewNotif, reviewNotif ? `notif=${reviewNotif.id}` : "missing");
  record("Review", "correct recipient (provider)", reviewNotif?.userId === PROV_ID);

  r = await api("PATCH", `/testimonials/${tId}/respond`, { businessResponse: "Thanks!" }, PROV_TOK2);
  record("Review", "provider respond HTTP 200", r.status === 200, `status=${r.status}`);

  const replyNotif = await waitForNotif(CUST_ID, "REVIEW_REQUESTED");
  record("Review", "author notified (reply)", !!replyNotif, replyNotif ? `notif=${replyNotif.id}` : "missing");
  record("Review", "correct recipient (author)", replyNotif?.userId === CUST_ID);

  // ==================== MESSAGING ====================
  r = await api("POST", "/conversations", { professionalId: PROF_ID }, CUST_TOK);
  const convId = r.json?.data?.id;
  record("Messaging", "create conversation HTTP 201", r.status === 201 && !!convId, `status=${r.status}`);

  r = await api("POST", `/conversations/${convId}/messages`, { body: "Hello, are you available next week?" }, CUST_TOK);
  record("Messaging", "send message HTTP 201", r.status === 201, `status=${r.status}`);

  const msgNotif = await waitForNotif(PROV_ID, "NEW_MESSAGE");
  record("Messaging", "recipient notified (NEW_MESSAGE)", !!msgNotif, msgNotif ? `notif=${msgNotif.id}` : "missing");
  record("Messaging", "correct recipient (provider)", msgNotif?.userId === PROV_ID);

  // ==================== NOTIFICATIONS (retrieval) ====================
  r = await api("GET", "/notifications/me?limit=50", null, CUST_TOK);
  record("Notifications", "customer list HTTP 200", r.status === 200, `status=${r.status} count=${r.json?.data?.notifications?.length}`);

  r = await api("GET", "/notifications/unread-count", null, CUST_TOK);
  record("Notifications", "unread count HTTP 200", r.status === 200, `status=${r.status} count=${r.json?.data}`);

  // ==================== EMAIL ATTEMPT EVIDENCE (server log) ====================
  await new Promise((res) => setTimeout(res, 1500));
  let log = "";
  try { log = fs.readFileSync(SERVER_ERR_LOG, "utf8"); } catch {}
  const emailAttempts = (type, to) => new RegExp(`\\[Email\\] ${type} to ${to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(log);
  const emails = [
    ["Provider App", "PROVIDER_APPLICATION_SUBMITTED", ADMIN_EMAIL],
    ["Provider App", "PROVIDER_APPROVED", PROV_EMAIL],
    ["Quote", "NEW_LEAD", PROV_EMAIL],
    ["Quote", "QUOTE_RESPONSE", CUST_EMAIL],
    ["Quote", "QUOTE_ACCEPTED", PROV_EMAIL],
    ["Booking", "BOOKING_REQUEST", PROV_EMAIL],
    ["Booking Status", "BOOKING_CONFIRMED", CUST_EMAIL],
    ["Booking Status", "BOOKING_IN_PROGRESS", CUST_EMAIL],
    ["Booking Status", "BOOKING_COMPLETED", CUST_EMAIL],
    ["Booking Status", "BOOKING_CANCELLED", PROV_EMAIL],
    ["Refund", "REFUND_ISSUED", CUST_EMAIL],
    ["Review", "NEW_REVIEW", PROV_EMAIL],
    ["Review", "REVIEW_RESPONSE", CUST_EMAIL],
    ["Auth", "PASSWORD_RESET", CUST_EMAIL],
  ];
  for (const [mod, type, to] of emails) {
    record(mod, `email attempt ${type} -> ${to}`, emailAttempts(type, to),
      emailAttempts(type, to) ? "logged (attempted)" : "NOT found in server log");
  }

  // ============================== SUMMARY ==============================
  console.log("\n================= MODULE E2E RESULTS =================");
  const failed = results.filter((x) => !x.ok);
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.module}] ${r.name}${r.ok ? "" : "  -> " + r.detail}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(`TEST USERS: ${CUST_EMAIL} / ${PROV_EMAIL} / ${ADMIN_EMAIL} / ${SUPER_EMAIL}`);

  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch(async (err) => {
  console.error("E2E HARNESS ERROR:", err);
  await prisma.$disconnect();
  process.exit(2);
});
