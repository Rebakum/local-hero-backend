import Stripe from "stripe";

import config from "./index";

if (!config.stripe.secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing from environment variables"
  );
}

const stripe = new Stripe(
  config.stripe.secretKey
);

export default stripe;