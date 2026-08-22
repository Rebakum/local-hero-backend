import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

if (!process.env.ENVIRONMENT_VARIABLE_JWT_SECRET) {
  throw new Error(
    "ENVIRONMENT_VARIABLE_JWT_SECRET environment variable is required"
  );
}

const config = {
  port: parseInt(
    process.env.PORT || "5000",
    10
  ),

  databaseUrl:
    process.env.DATABASE_URL || "",

  clientUrl:
    process.env.CLIENT_URL ||
    "http://localhost:5173",


  clientUrls: (
    process.env.CLIENT_URLS ||
    process.env.CLIENT_URL ||
    "http://localhost:3000,http://localhost:3001,http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  jwt: {
    secret: process.env.ENVIRONMENT_VARIABLE_JWT_SECRET,

    accessExpiresIn:
      process.env.ENVIRONMENT_VARIABLE_JWT_ACCESS_EXPIRES_IN ||
      "15m",

    refreshExpiresIn:
      process.env.ENVIRONMENT_VARIABLE_JWT_REFRESH_EXPIRES_IN ||
      "30d",
  },

  bcryptSaltRounds: parseInt(
    process.env.ENVIRONMENT_VARIABLE_BCRYPT_SALT_ROUNDS || "12",
    10
  ),

  nodeEnv:
    process.env.NODE_ENV || "development",

  cloudinary: {
    cloudName:
      process.env.ENVIRONMENT_VARIABLE_CLOUDINARY_CLOUD_NAME || "",

    apiKey:
      process.env.ENVIRONMENT_VARIABLE_CLOUDINARY_API_KEY || "",

    apiSecret:
      process.env.ENVIRONMENT_VARIABLE_CLOUDINARY_API_SECRET || "",
  },

  stripe: {
    secretKey:
      process.env.ENVIRONMENT_VARIABLE_STRIPE_SECRET_KEY || "",

    webhookSecret:
      process.env.ENVIRONMENT_VARIABLE_STRIPE_WEBHOOK_SECRET || "",
  },

  anthropic: {
    // Anthropic API key for the AI-powered live chat assistant.
    // Get one at: https://console.anthropic.com/settings/keys
    apiKey:
      process.env.ENVIRONMENT_VARIABLE_ANTHROPIC_API_KEY || "",

    // Claude model used for chat replies. "claude-sonnet-4-6" is the current
    // Sonnet tier; set ANTHROPIC_MODEL to override at deploy time.
    model:
      process.env.ENVIRONMENT_VARIABLE_ANTHROPIC_MODEL ||
      "claude-sonnet-4-6",
  },


  smtp: {
    host: process.env.ENVIRONMENT_VARIABLE_SMTP_HOST || "",
    port: parseInt(process.env.ENVIRONMENT_VARIABLE_SMTP_PORT || "465", 10),
    secure: (process.env.ENVIRONMENT_VARIABLE_SMTP_SECURE || "true") === "true",
    user: process.env.ENVIRONMENT_VARIABLE_SMTP_USER || "",
    pass: process.env.ENVIRONMENT_VARIABLE_SMTP_PASS || "",
    from: process.env.ENVIRONMENT_VARIABLE_SMTP_FROM || "LocalHero <noreply@localhero.com>",
  },

  emailVerification: {
    // Verification links are issued with a fixed 1-hour lifetime in
    // auth.service.ts (VERIFICATION_TTL_MS). This value is kept only as a
    // documentation default; the service no longer reads it.
    expiresInMinutes: parseInt(
      process.env.ENVIRONMENT_VARIABLE_EMAIL_VERIFY_EXPIRES_IN_MINUTES || "60",
      10
    ),
  },
};

if (
  config.nodeEnv === "production" &&
  !config.stripe.webhookSecret
) {
  console.warn(
    "⚠️ STRIPE_WEBHOOK_SECRET is missing"
  );
}

export default config;