import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required"
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

  // Comma-separated list of allowed browser origins (CORS). Defaults cover
  // the common local dev ports (3000/3001) plus the Vite default (5173).
  clientUrls: (
    process.env.CLIENT_URLS ||
    process.env.CLIENT_URL ||
    "http://localhost:3000,http://localhost:3001,http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  jwt: {
    secret: process.env.JWT_SECRET,

    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN ||
      "15m",

    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ||
      "30d",
  },

  bcryptSaltRounds: parseInt(
    process.env.BCRYPT_SALT_ROUNDS || "12",
    10
  ),

  nodeEnv:
    process.env.NODE_ENV || "development",

  cloudinary: {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME || "",

    apiKey:
      process.env.CLOUDINARY_API_KEY || "",

    apiSecret:
      process.env.CLOUDINARY_API_SECRET || "",
  },

  stripe: {
    secretKey:
      process.env.STRIPE_SECRET_KEY || "",

    webhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET || "",
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