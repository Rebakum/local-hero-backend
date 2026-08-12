import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { AdminRoutes } from "../modules/admin/admin.route";
import { SuperAdminRoutes } from "../modules/super-admin/super-admin.route";
import { ProfessionalRoutes } from "../modules/professionals/professional.route";
import { ProfessionRoutes } from "../modules/professions/profession.route";
import { TradeRoutes } from "../modules/trades/trade.route";
import { BeforeAfterRoutes } from "../modules/before-after/before-after.route";
import { TestimonialRoutes } from "../modules/testimonials/testimonial.route";
import { ProviderApplicationRoutes } from "../modules/provider-applications/provider-application.route";
import { UploadRoutes } from "../modules/upload/upload.route";
import { BookingRoutes } from "../modules/bookings/booking.route";
import { PaymentRoutes } from "../modules/payments/payment.route";
import { QuoteRoutes } from "../modules/quotes/quote.route";
import { MessagingRoutes } from "../modules/messaging/messaging.route";
import { NotificationRoutes } from "../modules/notifications/notification.route";
import { SubscriptionRoutes } from "../modules/subscriptions/subscription.route";
import { FavouriteRoutes } from "../modules/favourites/favourite.route";

const router = Router();

const moduleRoutes = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/admin", route: AdminRoutes },
  { path: "/super-admin", route: SuperAdminRoutes },
  { path: "/professionals", route: ProfessionalRoutes },
  { path: "/professions", route: ProfessionRoutes },
  { path: "/trades", route: TradeRoutes },
  { path: "/before-after", route: BeforeAfterRoutes },
  { path: "/testimonials", route: TestimonialRoutes },
  { path: "/provider-applications", route: ProviderApplicationRoutes },
  { path: "/uploads", route: UploadRoutes },
  { path: "/bookings", route: BookingRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/quotes", route: QuoteRoutes },
  { path: "/conversations", route: MessagingRoutes },
  { path: "/notifications", route: NotificationRoutes },
  { path: "/subscriptions", route: SubscriptionRoutes },
  { path: "/favourites", route: FavouriteRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
