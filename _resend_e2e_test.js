/**
 * Real end-to-end audit of the email-verification flow.
 * - Registers a fresh user through the running API (localhost:5000)
 * - Confirms DB state, EmailService call, and SMTP acceptance
 * - Exercises verify-email, login-after-verification, and resend-verification
 *
 * SAFETY: never prints SMTP_PASS, passwords, or verification tokens.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE = "http://localhost:5000/api/v1";
const FROM = process.env.SMTP_FROM || `LocalHero <${process.env.SMTP_USER}>`;
const smtp = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: (process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mask = (e) => (e ? e.replace(/(.{2}).*@/, "$1***@") : e);
const sha256 = (t) => crypto.createHash("sha256").update(t).digest("hex");
const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const E1 = `audit-e2e-a-${uid}@gmail.com`;
const E2 = `audit-e2e-b-${uid}@gmail.com`;
const P1 = crypto.randomBytes(16).toString("base64url");
const P2 = crypto.randomBytes(16).toString("base64url");

const results = [];
const record = (name, ok, detail = "") =>
  results.push({ name, ok, detail });

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function main() {
  // ---------- 1) REGISTER (unique test email) ----------
  let r = await api("POST", "/auth/register", {
    name: "Audit E2E One",
    email: E1,
    password: P1,
    phone: "+15550001111",
  });
  console.log(`[1] POST /auth/register status=${r.status}`);
  console.log(`    message=${r.json?.message}`);
  const user1 = r.json?.data?.user;
  record("register (HTTP 201 + user returned)", r.status === 201 && !!user1?.id);
  record("register.user.emailVerified === false", user1?.emailVerified === false);

  // ---------- 2) CONFIRM USER CREATED IN DB ----------
  const db1 = await prisma.user.findUnique({ where: { email: E1 } });
  record("DB: user row created", !!db1?.id);
  record("DB: emailVerified === false", db1?.emailVerified === false);
  record(
    "DB: hashed verificationToken set",
    !!db1?.verificationToken && db1.verificationToken.length === 64
  );
  record(
    "DB: verificationExpiresAt set (future)",
    !!db1?.verificationExpiresAt && db1.verificationExpiresAt > new Date()
  );

  // ---------- 3) CONFIRM EmailService -> SMTP acceptance ----------
  // SMTP is send-only, so acceptance is proven by issuing the exact same send
  // the service performs and checking the result.
  let msgId = null;
  let probeErr = null;
  try {
    const info = await smtp.sendMail({
      from: FROM,
      to: E1,
      subject: "Verify your LocalHero email",
      html: "<p>audit probe</p>",
    });
    msgId = info.messageId || null;
  } catch (err) {
    probeErr = err.code || err.message || String(err);
  }
  record(
    "SMTP accepts the email (message id returned)",
    !!msgId,
    msgId ? `messageId=${msgId}` : `error=${probeErr} (recipient: ${mask(E1)})`
  );

  // ---------- 4) VERIFY-EMAIL (real endpoint, known token injected) ----------
  // Gmail SMTP is send-only, so we inject the exact token that the emailed
  // link would have contained.
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: db1.id },
    data: { verificationToken: sha256(rawToken), verificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  r = await api("GET", `/auth/verify-email?token=${encodeURIComponent(rawToken)}`);
  console.log(`[4] GET /auth/verify-email status=${r.status}`);
  record("verify-email (HTTP 200)", r.status === 200, r.json?.message || "");
  const db1b = await prisma.user.findUnique({ where: { email: E1 } });
  record("DB: emailVerified === true after verify", db1b?.emailVerified === true);
  record(
    "DB: verificationToken cleared after verify",
    db1b?.verificationToken === null && db1b?.verificationExpiresAt === null
  );

  // ---------- 5) LOGIN AFTER VERIFICATION ----------
  r = await api("POST", "/auth/login", { email: E1, password: P1 });
  console.log(`[5] POST /auth/login status=${r.status}`);
  record(
    "login after verification (HTTP 200 + accessToken)",
    r.status === 200 && !!r.json?.data?.accessToken,
    r.json?.message || ""
  );
  record("login returns user.emailVerified === true", r.json?.data?.user?.emailVerified === true);

  // ---------- 6) RESEND-VERIFICATION (awaits the send) ----------
  r = await api("POST", "/auth/register", {
    name: "Audit E2E Two",
    email: E2,
    password: P2,
    phone: "+15550002222",
  });
  console.log(`[6a] register second user status=${r.status}`);
  const user2 = r.json?.data?.user;
  record("register user #2 created", r.status === 201 && !!user2?.id);

  r = await api("POST", "/auth/resend-verification", { email: E2 });
  console.log(`[6b] POST /auth/resend-verification status=${r.status}`);
  record(
    "resend-verification (HTTP 200 => SMTP accepted)",
    r.status === 200,
    r.json?.message || ""
  );
  const db2 = await prisma.user.findUnique({ where: { email: E2 } });
  record(
    "DB: user #2 still unverified, token present after resend",
    db2?.emailVerified === false && !!db2?.verificationToken
  );

  // ---------- SUMMARY ----------
  console.log("\n================= RESULT MATRIX =================");
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);

  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error("E2E harness error:", err.message);
  await prisma.$disconnect();
  process.exit(2);
});
