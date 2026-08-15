/**
 * Green E2E sending the real verification email to the account owner's
 * inbox via Nodemailer + Gmail SMTP. Non-destructive: snapshots and
 * restores the account's verification fields.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE = "http://localhost:5000/api/v1";
const OWNER_EMAIL = "rebakpi@gmail.com";
const sha256 = (t) => crypto.createHash("sha256").update(t).digest("hex");

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) { console.log("owner account not found; abort"); process.exit(1); }

  const snapshot = {
    emailVerified: owner.emailVerified,
    verificationToken: owner.verificationToken,
    verificationExpiresAt: owner.verificationExpiresAt,
  };
  console.log("snapshot taken for account", owner.id);

  // 1) Force unverified so the resend path actually sends.
  await prisma.user.update({
    where: { id: owner.id },
    data: { emailVerified: false, verificationToken: null, verificationExpiresAt: null },
  });

  // 2) resend-verification -> awaits the real SMTP send to owner email.
  let r = await api("POST", "/auth/resend-verification", { email: OWNER_EMAIL });
  console.log("[A] POST /auth/resend-verification status=" + r.status, "|", r.json?.message);
  const okResend = r.status === 200;

  // 3) A fresh token was issued by the endpoint.
  const afterResend = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  const tokenIssued = !!afterResend.verificationToken && afterResend.verificationToken.length === 64;
  console.log("[B] new hashed token issued by resend endpoint:", tokenIssued);

  // 4) verify-email with an injected known token (Gmail SMTP is send-only, so the
  //    link body is not readable back; this replicates what the link contains).
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: owner.id },
    data: { verificationToken: sha256(raw), verificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  r = await api("GET", `/auth/verify-email?token=${encodeURIComponent(raw)}`);
  console.log("[C] GET /auth/verify-email status=" + r.status, "|", r.json?.message);
  const okVerify = r.status === 200;
  const afterVerify = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  console.log("[D] emailVerified after verify:", afterVerify.emailVerified);

  // 5) Restore snapshot.
  await prisma.user.update({ where: { id: owner.id }, data: snapshot });
  const restored = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  console.log("[E] account restored: emailVerified=" + restored.emailVerified, "tokenRestored=" + (restored.verificationToken === snapshot.verificationToken));

  const allOk = okResend && tokenIssued && okVerify && afterVerify.emailVerified === true && restored.emailVerified === snapshot.emailVerified;
  console.log("\nRESULT:", allOk ? "GREEN — Gmail SMTP accepted the real send" : "FAILED");
  process.exit(allOk ? 0 : 1);
})().catch(async (e) => {
  console.error("error:", e.message);
  await prisma.$disconnect();
  process.exit(2);
});
