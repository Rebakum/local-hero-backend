import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCAL_IMAGE_A = "https://i.postimg.cc/JhzXrrwL/service2.png";
const LOCAL_IMAGE_B = "https://i.postimg.cc/vmZnYYRM/service3.png";
const LOCAL_IMAGE_C = "https://i.postimg.cc/XJZy5s7Z/service5.png";
const LOCAL_IMAGE_D = "https://i.postimg.cc/XJZy5s7Z/service5.png";
const LOCAL_IMAGE_E = "https://i.postimg.cc/KzKgT0vM/service6.png";
const LOCAL_IMAGE_F = "https://i.postimg.cc/FRfJSTsJ/service7.png";
const LOCAL_IMAGE_G = "https://i.postimg.cc/x1YHZGtn/service8.png";
const LOCAL_IMAGE_H = "https://i.postimg.cc/nLhmFF8V/servuce1.png";

const beforeAfterProjects = [
  {
    title: "Kitchen Transformation",
    trade: "Plumber",
    location: "Fulham, London",
    beforeImage: LOCAL_IMAGE_A,
    afterImage: LOCAL_IMAGE_B,
    description:
      "Complete pipework rerouting, brass tapware installation, and Metro subway tile splashback in a 19th-century Fulham property.",
    cost: "£1,850",
    completionDays: "3 Days",
    sortOrder: 0,
  },
  {
    title: "Garden Makeover",
    trade: "Gardener",
    location: "Altrincham, Greater Manchester",
    beforeImage: LOCAL_IMAGE_C,
    afterImage: LOCAL_IMAGE_D,
    description:
      "Cleared 40sqm of overgrown brambles, installed sub-base drainage, laid Grey Italian Porcelain slabs and outdoor LED mood lights.",
    cost: "£4,200",
    completionDays: "5 Days",
    sortOrder: 1,
  },
  {
    title: "Alcove Transformation",
    trade: "Carpenter",
    location: "Harborne, Birmingham",
    beforeImage: LOCAL_IMAGE_E,
    afterImage: LOCAL_IMAGE_F,
    description:
      "Handcrafted moisture-resistant MDF twin alcove cupboards with traditional shaker doors and integrated warm LED strip lighting.",
    cost: "£1,400",
    completionDays: "2 Days",
    sortOrder: 2,
  },
];

const faqs = [
  {
    category: "General",
    question: "How does LocalHero vet tradespeople in the UK?",
    answer:
      "Every professional on LocalHero undergoes our strict 6-point verification process. We verify proof of identity (DBS background check), professional qualifications (e.g. Gas Safe, NICEIC, NVQ certifications), public liability insurance (minimum \u00a31M coverage), business address, and past client references before they can accept bookings.",
    sortOrder: 0,
  },
  {
    category: "Booking",
    question: "How quickly can a pro arrive at my house?",
    answer:
      "For emergency services (such as burst pipes, lockouts, or loss of power), our 24/7 Fast-Track dispatch service connects you with local pros who arrive in average 30 to 45 minutes across major UK towns and cities.",
    sortOrder: 1,
  },
  {
    category: "Pricing",
    question: "Are quotes fixed or subject to surprise call-out fees?",
    answer:
      "All quotes generated via LocalHero specify fixed pricing or clear hourly caps upfront. There are no hidden call-out fees. The payment is held securely in escrow and only released to the tradesperson after you approve the completed job.",
    sortOrder: 2,
  },
  {
    category: "Pros & Vetting",
    question: "Is my property protected if something goes wrong?",
    answer:
      "Yes! All jobs booked and paid through the LocalHero app are covered by our \u00a32,000,000 Property Damage Guarantee in addition to the professional's own mandatory Public Liability Insurance.",
    sortOrder: 3,
  },
  {
    category: "Emergency",
    question: "What qualifies as an Emergency 24/7 Request?",
    answer:
      "Active water leaks threatening ceilings, total loss of power, boiler breakdown during freezing temperatures, broken locks leaving a home unsecure, or dangerous gas smells (call 0800 111999 first for gas emergencies!).",
    sortOrder: 4,
  },
];

// Trades + featured services only. Professionals are NEVER seeded — they must
// come from real approved Provider Applications.
const trades = [
  {
    category: "Plumber",
    subtitle: "Expert Plumbing & Heating",
    iconUrl: LOCAL_IMAGE_A,
    description:
      "Boilers, leaks, radiator installs, bathroom fittings, emergency unblocking.",
    avgHourlyRate: "\u00a345 - \u00a375/hr",
    startingPrice: "From \u00a385",
    popularTasks: [
      "Boiler Servicing",
      "Leak Repair",
      "Radiator Fitting",
      "Drain Unblocking",
    ],
    badge: "24/7 Emergency",
    featuredService: {
      title: "Emergency Boiler Repair",
      estimatedPrice: "From \u00a385",
      timeEstimate: "1 - 2 Hours",
      popularFor: ["No heating", "leaks", "pressure loss"],
      description:
        "Fast-response Gas Safe engineers for boiler diagnostics, repairs and heating system restoration.",
      included: [
        "Boiler Diagnostics",
        "Leak Inspection",
        "Safety Check",
        "Fixed Price Quote",
      ],
      imageUrl: LOCAL_IMAGE_A,
      isEmergency: true,
    },
    sortOrder: 0,
  },
  {
    category: "Electrician",
    subtitle: "Certified Electrical Services",
    iconUrl: LOCAL_IMAGE_B,
    description:
      "Fuse board upgrades, rewiring, EV charger installation, EICR inspection certificates.",
    avgHourlyRate: "\u00a350 - \u00a385/hr",
    startingPrice: "From \u00a3420",
    popularTasks: [
      "EICR Certificate",
      "EV Charger Install",
      "Fuseboard Upgrade",
      "Lighting & Sockets",
    ],
    badge: "NICEIC Certified",
    featuredService: {
      title: "Consumer Unit Upgrade",
      estimatedPrice: "From \u00a3420",
      timeEstimate: "4 - 6 Hours",
      popularFor: ["Fuse board replacement", "rewiring"],
      description:
        "Certified electricians install modern consumer units with full safety certification.",
      included: [
        "RCBO Protection",
        "Surge Protection",
        "Testing",
        "NICEIC Certificate",
      ],
      imageUrl: LOCAL_IMAGE_B,
    },
    sortOrder: 1,
  },
  {
    category: "Cleaner",
    subtitle: "Domestic & Deep Cleaning",
    iconUrl: LOCAL_IMAGE_C,
    description:
      "End-of-tenancy deep cleaning, carpet sanitising, regular domestic home care.",
    avgHourlyRate: "\u00a318 - \u00a332/hr",
    startingPrice: "From \u00a3160",
    popularTasks: [
      "End of Tenancy",
      "Deep Carpet Clean",
      "Weekly Domestic",
      "Oven Cleaning",
    ],
    badge: "Eco Friendly",
    featuredService: {
      title: "End of Tenancy Cleaning",
      estimatedPrice: "From \u00a3160",
      timeEstimate: "3 - 5 Hours",
      popularFor: ["Move-out deep cleaning"],
      description:
        "Professional deep cleaning service for kitchens, bathrooms, carpets and appliances.",
      included: [
        "Kitchen Deep Clean",
        "Bathroom Sanitising",
        "Window Cleaning",
        "Deposit Guarantee",
      ],
      imageUrl: LOCAL_IMAGE_C,
    },
    sortOrder: 2,
  },
  {
    category: "Painter",
    subtitle: "Interior & Exterior Decorating",
    iconUrl: LOCAL_IMAGE_D,
    description:
      "Interior room painting, exterior masonry protection, wallpapering, woodwork staining.",
    avgHourlyRate: "\u00a328 - \u00a345/hr",
    startingPrice: "From \u00a3250",
    popularTasks: [
      "Full Room Interior",
      "Exterior Masonry",
      "Feature Wall Wallpaper",
      "Sash Window Paint",
    ],
    featuredService: {
      title: "Interior & Exterior Painting",
      estimatedPrice: "From \u00a3250",
      timeEstimate: "1 - 2 Days",
      popularFor: ["Walls", "ceilings", "woodwork"],
      description:
        "Professional painting with premium finishes for homes and commercial spaces.",
      included: [
        "Surface Preparation",
        "Premium Paint",
        "Woodwork Finish",
        "Clean Completion",
      ],
      imageUrl: LOCAL_IMAGE_D,
    },
    sortOrder: 3,
  },
  {
    category: "Gardener",
    subtitle: "Lawn Care & Landscaping",
    iconUrl: LOCAL_IMAGE_E,
    description:
      "Lawn maintenance, patio pressure washing, hedge trimming, garden clearance & turfing.",
    avgHourlyRate: "\u00a325 - \u00a340/hr",
    startingPrice: "From \u00a395",
    popularTasks: [
      "Patio Jet Wash",
      "Hedge Trimming",
      "Turf Laying",
      "Seasonal Clearance",
    ],
    featuredService: {
      title: "Garden Maintenance",
      estimatedPrice: "From \u00a395",
      timeEstimate: "2 - 3 Hours",
      popularFor: ["Lawn care", "hedge trimming"],
      description:
        "Keep your garden healthy with seasonal maintenance and landscaping services.",
      included: [
        "Lawn Mowing",
        "Hedge Trimming",
        "Weed Removal",
        "Garden Waste Removal",
      ],
      imageUrl: LOCAL_IMAGE_E,
    },
    sortOrder: 4,
  },
  {
    category: "Carpenter",
    subtitle: "Bespoke Joinery & Carpentry",
    iconUrl: LOCAL_IMAGE_F,
    description:
      "Custom alcove shelving, door hanging, bespoke wardrobes, kitchen unit fitting.",
    avgHourlyRate: "\u00a335 - \u00a360/hr",
    startingPrice: "From \u00a3180",
    popularTasks: [
      "Alcove Shelving",
      "Internal Door Hanging",
      "Bespoke Wardrobe",
      "Decking Installation",
    ],
    featuredService: {
      title: "Custom Carpentry",
      estimatedPrice: "From \u00a3180",
      timeEstimate: "4 - 8 Hours",
      popularFor: ["Shelving", "doors", "wardrobes"],
      description:
        "Experienced carpenters for bespoke woodwork, repairs and furniture installation.",
      included: [
        "Custom Shelving",
        "Door Installation",
        "Wardrobe Fitting",
        "Wood Finishing",
      ],
      imageUrl: LOCAL_IMAGE_F,
    },
    sortOrder: 5,
  },
  {
    category: "Locksmith",
    subtitle: "24/7 Security & Lock Services",
    iconUrl: LOCAL_IMAGE_G,
    description:
      "Emergency lockout access, anti-snap Ultion lock upgrades, smart lock fitting.",
    avgHourlyRate: "\u00a360 - \u00a3110/hr",
    startingPrice: "From \u00a3120",
    popularTasks: [
      "Emergency Lockout",
      "Anti-Snap Cylinders",
      "Smart Yale Lock",
      "uPVC Door Repair",
    ],
    badge: "45-Min Dispatch",
    featuredService: {
      title: "Emergency Lock Replacement",
      estimatedPrice: "From \u00a3120",
      timeEstimate: "30 - 45 Minutes",
      popularFor: ["Lost keys", "lock upgrades"],
      description:
        "24/7 locksmith services including emergency access and security upgrades.",
      included: [
        "Emergency Unlock",
        "Lock Replacement",
        "Security Check",
        "3 Keys Included",
      ],
      imageUrl: LOCAL_IMAGE_G,
      isEmergency: true,
    },
    sortOrder: 6,
  },
  {
    category: "Roofer",
    subtitle: "Roof Repairs & Maintenance",
    iconUrl: LOCAL_IMAGE_H,
    description:
      "Roof tile replacements, gutter unblocking & clearing, flat roof felt/EPDM repairs.",
    avgHourlyRate: "\u00a345 - \u00a380/hr",
    startingPrice: "From \u00a3150",
    popularTasks: [
      "Gutter Clean & Fix",
      "Slipping Slate Fix",
      "Flat Roof EPDM",
      "Chimney Repointing",
    ],
    featuredService: {
      title: "Roof Repair & Gutter Cleaning",
      estimatedPrice: "From \u00a3150",
      timeEstimate: "2 - 5 Hours",
      popularFor: ["Leaks", "tiles", "gutters"],
      description:
        "Professional roofing repairs, gutter maintenance and roof inspections.",
      included: [
        "Roof Inspection",
        "Tile Replacement",
        "Gutter Cleaning",
        "Leak Repair",
      ],
      imageUrl: LOCAL_IMAGE_H,
    },
    sortOrder: 7,
  },
];

const extraProfessions: Record<string, string[]> = {
  Plumber: ["Boiler Installer", "Drain Specialist"],
  Electrician: ["EV Charger Installer", "Home Rewire Specialist"],
  Cleaner: ["End of Tenancy Cleaner"],
  Painter: ["Decorator"],
  Gardener: ["Landscaper", "Tree Surgeon"],
  Carpenter: ["Kitchen Fitter", "Staircase Specialist"],
  Locksmith: ["Auto Locksmith"],
  Roofer: ["Gutter Specialist"],
};

async function main() {
  console.log("Seeding database...");

  // Clear existing data in dependency order (FK-safe).
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.quoteResponse.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.providerApplication.deleteMany();
  await prisma.savedProfessional.deleteMany();
  await prisma.providerSubscription.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.beforeAfterProject.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.profession.deleteMany();
  await prisma.trade.deleteMany();

  // Seed trades + professions (Trade -> Profession). No professionals are
  // seeded: they only exist after an admin approves a ProviderApplication.
  for (const trade of trades) {
    const created = await prisma.trade.create({ data: trade });

    // Default profession: same name as the trade.
    await prisma.profession.create({
      data: {
        tradeId: created.id,
        name: created.category,
        description: created.subtitle ?? `${created.category} services`,
        isActive: true,
        sortOrder: 0,
      },
    });

    // Extra sub-professions.
    for (const [index, professionName] of (extraProfessions[created.category] ?? []).entries()) {
      await prisma.profession.create({
        data: {
          tradeId: created.id,
          name: professionName,
          description: `${professionName} services under ${created.category}`,
          isActive: true,
          sortOrder: index + 1,
        },
      });
    }
  }
  console.log(`Seeded ${trades.length} trades + professions`);

  // Seed before/after projects
  for (const project of beforeAfterProjects) {
    await prisma.beforeAfterProject.create({ data: project });
  }
  console.log(`Seeded ${beforeAfterProjects.length} before/after projects`);

  // Seed FAQs
  for (const faq of faqs) {
    await prisma.faq.create({ data: faq });
  }
  console.log(`Seeded ${faqs.length} FAQs`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });