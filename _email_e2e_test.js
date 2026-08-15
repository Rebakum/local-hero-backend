/**
 * Live end-to-end test of the LocalHero email flows (Nodemailer + Gmail SMTP):
 *   Flow 1: register -> verification email -> verify-email -> login
 *   Flow 1b: resend-verification (no error, new token issued)
 *   Flow 2: forget-password -> reset email -> reset-password -> login (new/old pw)
 *   Flow 3: booking request / accepted / rejected / in-progress / completed / cancelled emails
 *
 * The verification/reset links live inside emailed HTML which this harness
 * cannot read back, so (exactly like the pre-existing _resend_e2e_* harnesses)
 * a known raw token is injected into the DB and the public endpoint is then
 * exercised with it. Actual SMTP sends are confirmed independently via the
 * server log (subject + recipient + messageId).
 *
 * SAFETY: never prints SMTP_PASS, passwords, or tokens.
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:5000/api/v1";

const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const CUST = `rebakpi+e2ecust-${ts}@gmail.com`; // +tag -> delivers to rebakpi@gmail.com
const CUST2 = `rebakpi+e2ecust2-${ts}@gmail.com`;
const PROV = `rebakpi+e2eprov-${ts}@gmail.com`;
const P1 = "E2EStrongPass!1";
const P2 = "E2ENewStrongPass!2";

const results = [];
const record = (name, ok, detail = "") => results.push({ name, ok, detail });
const sha256 = (t) => crypto.createHash("sha256").update(t).digest("hex");
const mask = (e) => (e ? e.replace(/(.{2}).*@/, "$1***@") : e);

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`BASE: ${BASE}`);
  console.log(`Recipients: ${CUST} / ${PROV}\n`);

  // ---------------- SETUP: provider user + linked professional ----------------
  let provUser;
  let pro;
  try {
    const hashed = await bcrypt.hash(P1, 12);
    provUser = await prisma.user.create({
      data: {
        name: "E2E Provider",
        email: PROV,
        password: hashed,
        role: "serviceProvider",
        emailVerified: true,
      },
    });
    const template = await prisma.professional.findUnique({
      where: { id: "0f03fa45-79ed-4957-b261-45f0899e512f" },
    });
    pro = await prisma.professional.create({
      data: {
        userId: provUser.id,
        tradeId: template.tradeId,
        professionId: template.professionId,
        trade: template.trade,
        name: "E2E Provider",
        companyName: "E2E Plumbing Ltd",
        location: template.location,
        postcodeArea: template.postcodeArea,
        bio: template.bio,
        hourlyRate: template.hourlyRate,
        specialties: template.specialties,
        portfolioImages: template.portfolioImages,
        certifications: template.certifications,
        serviceAreas: template.serviceAreas,
      },
    });
    record("setup: provider user + professional profile created", !!provUser && !!pro);
  } catch (e) {
    record("setup: provider creation", false, e.message);
    throw e;
  }

  // ---------------- FLOW 1: register -> verify -> login ----------------
  let r = await api("POST", "/auth/register", {
    name: "E2E Customer",
    email: CUST,
    password: P1,
    phone: "+15550001111",
  });
  record("F1 register (HTTP 201)", r.status === 201, r.json?.message || "");
  const cust = await prisma.user.findUnique({ where: { email: CUST } });
  record("F1 DB: user created, emailVerified=false", !!cust && cust.emailVerified === false);

  // Inject the known raw token the emailed link would have carried.
  const rawVerify = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: cust.id },
    data: {
      verificationToken: sha256(rawVerify),
      verificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  r = await api("GET", `/auth/verify-email?token=${encodeURIComponent(rawVerify)}`);
  record("F1 verify-email (HTTP 200)", r.status === 200, r.json?.message || "");
  const custV = await prisma.user.findUnique({ where: { email: CUST } });
  record("F1 DB: emailVerified=true after verify", custV?.emailVerified === true);
  record(
    "F1 DB: verification token cleared",
    custV?.verificationToken === null && custV?.verificationExpiresAt === null
  );

  r = await api("POST", "/auth/login", { email: CUST, password: P1 });
  const custToken = r.json?.data?.accessToken;
  record(
    "F1 login after verify (HTTP 200 + token)",
    r.status === 200 && !!custToken,
    r.json?.message || ""
  );
  record("F1 login returns emailVerified=true", r.json?.data?.user?.emailVerified === true);

  // ---------------- FLOW 1b: resend-verification ----------------
  await api("POST", "/auth/register", {
    name: "E2E Customer 2",
    email: CUST2,
    password: P1,
    phone: "+15550002222",
  });
  const c2 = await prisma.user.findUnique({ where: { email: CUST2 } });
  const tokenBefore = c2?.verificationToken;
  r = await api("POST", "/auth/resend-verification", { email: CUST2 });
  record("F1b resend-verification (HTTP 200)", r.status === 200, r.json?.message || "");
  const c2b = await prisma.user.findUnique({ where: { email: CUST2 } });
  record(
    "F1b DB: fresh token issued (no duplicate/broken state)",
    !!c2b?.verificationToken && c2b.verificationToken !== tokenBefore
  );

  // ---------------- FLOW 2: forget-password -> reset -> login ----------------
  r = await api("POST", "/auth/forget-password", { email: CUST });
  record("F2 forget-password (HTTP 200)", r.status === 200, r.json?.message || "");

  // Controller hides the dev token; inject the known raw reset token instead.
  const rawReset = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: cust.id },
    data: {
      resetPasswordToken: sha256(rawReset),
      resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  r = await api("POST", "/auth/reset-password", {
    token: rawReset,
    newPassword: P2,
  });
  record("F2 reset-password (HTTP 200)", r.status === 200, r.json?.message || "");
  const custR = await prisma.user.findUnique({ where: { email: CUST } });
  record(
    "F2 DB: reset token cleared",
    custR?.resetPasswordToken === null && custR?.resetPasswordExpiresAt === null
  );

  r = await api("POST", "/auth/login", { email: CUST, password: P2 });
  record("F2 login with NEW password (HTTP 200)", r.status === 200 && !!r.json?.data?.accessToken);
  r = await api("POST", "/auth/login", { email: CUST, password: P1 });
  record("F2 OLD password rejected (HTTP 401)", r.status === 401, r.json?.message || "");

  // ---------------- FLOW 3: booking emails ----------------
  r = await api("POST", "/auth/login", { email: PROV, password: P1 });
  const provToken = r.json?.data?.accessToken;
  record("F3 provider login (HTTP 200 + token)", r.status === 200 && !!provToken);

  const bookingPayload = {
    trade: "Plumber",
    professionalId: pro.id,
    postcode: "SW1A 1AA",
    address: "10 Downing Street",
    bookingDate: "2026-09-01",
    timeSlot: "Morning",
    urgency: "Standard",
    description: "E2E leaking kitchen sink",
    fullName: "E2E Customer",
    email: CUST,
    phone: "+15550001111",
  };

  r = await api("POST", "/bookings", bookingPayload, custToken);
  const b1 = r.json?.data?.id;
  record("F3 create booking (HTTP 201)", r.status === 201 && !!b1, r.json?.message || "");

  r = await api("PATCH", `/bookings/${b1}/status`, { status: "ACCEPTED", priceInPence: 12000 }, provToken);
  record("F3 ACCEPTED -> BOOKING_CONFIRMED email", r.status === 200, r.json?.message || "");
  r = await api("PATCH", `/bookings/${b1}/status`, { status: "IN_PROGRESS" }, provToken);
  record("F3 IN_PROGRESS -> BOOKING_IN_PROGRESS email", r.status === 200, r.json?.message || "");
  r = await api("PATCH", `/bookings/${b1}/status`, { status: "COMPLETED" }, provToken);
  record("F3 COMPLETED -> BOOKING_COMPLETED email", r.status === 200, r.json?.message || "");

  r = await api("POST", "/bookings", bookingPayload, custToken);
  const b2 = r.json?.data?.id;
  r = await api("PATCH", `/bookings/${b2}/status`, { status: "REJECTED" }, provToken);
  record("F3 REJECTED -> BOOKING_REJECTED email", r.status === 200, r.json?.message || "");

  r = await api("POST", "/bookings", bookingPayload, custToken);
  const b3 = r.json?.data?.id;
  r = await api("PATCH", `/bookings/${b3}/status`, { status: "CANCELLED" }, custToken);
  record("F3 CANCELLED -> BOOKING_CANCELLED email", r.status === 200, r.json?.message || "");

  // ---------------- SUMMARY ----------------
  console.log("\n================= RESULT MATRIX =================");
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  console.log(`Test emails (recipient via Gmail +tag -> rebakpi@gmail.com inbox):`);
  console.log(`  customer: ${CUST}`);
  console.log(`  customer2: ${CUST2}`);
  console.log(`  provider: ${PROV}`);

  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error("E2E harness error:", err.message);
  await prisma.$disconnect();
  process.exit(2);
});
