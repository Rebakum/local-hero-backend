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

const professionals = [
  {
    name: "James Stirling",
    trade: "Plumber",
    companyName: "Stirling Heating & Gas Services",
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.98,
    reviewCount: 218,
    jobsCompleted: 480,
    hourlyRate: 55,
    location: "Islington, London",
    postcodeArea: "N1",
    responseMinutes: 18,
    verifiedStatus: {
      dbsChecked: true,
      gasSafe: true,
      insured: true,
      insuranceAmount: "\u00a35,000,000",
    },
    bio: "Gas Safe registered heating engineer with over 14 years experience across North & Central London. Specialising in Worcester Bosch & Vaillant boilers.",
    specialties: [
      "Boiler Replacements",
      "Power Flushing",
      "Underfloor Heating",
      "Gas Certificates",
    ],
    availability: "Available Today",
    portfolioImages: [
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: "Top Rated Plumber 2026",
    isFeatured: true,
    sortOrder: 0,
  },
  {
    name: "Sarah Jenkins",
    trade: "Electrician",
    companyName: "Apex Spark & Power Ltd",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.96,
    reviewCount: 164,
    jobsCompleted: 340,
    hourlyRate: 60,
    location: "Didsbury, Manchester",
    postcodeArea: "M20",
    responseMinutes: 25,
    verifiedStatus: {
      dbsChecked: true,
      niceic: true,
      insured: true,
      insuranceAmount: "\u00a32,000,000",
    },
    bio: "NICEIC Approved Contractor with a focus on smart home upgrades, fuseboard modernisations, and home EV charging points.",
    specialties: [
      "Consumer Unit Upgrades",
      "EV Charger Install",
      "Full Home Rewire",
      "EICR Certificates",
    ],
    availability: "Available Today",
    portfolioImages: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: "NICEIC Master Spark",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: "Marcus Vance",
    trade: "Locksmith",
    companyName: "Vance 24/7 Security & Locks",
    avatar:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.99,
    reviewCount: 312,
    jobsCompleted: 710,
    hourlyRate: 65,
    location: "Edgbaston, Birmingham",
    postcodeArea: "B15",
    responseMinutes: 12,
    verifiedStatus: {
      dbsChecked: true,
      insured: true,
      insuranceAmount: "\u00a32,000,000",
    },
    bio: "Emergency locksmith providing non-destructive entry and British Standard BS3621 anti-snap cylinder upgrades. 24/7 rapid response guarantee.",
    specialties: [
      "Non-Destructive Entry",
      "Ultion Lock Upgrade",
      "uPVC Door Mechanisms",
      "Smart Door Locks",
    ],
    availability: "Available Today",
    portfolioImages: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1558002038-2b1b52a3faed?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: "12-Min Avg Dispatch",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: "Elena Rostova",
    trade: "Cleaner",
    companyName: "PureSpace Elite Cleaning",
    avatar:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.95,
    reviewCount: 189,
    jobsCompleted: 520,
    hourlyRate: 24,
    location: "Clifton, Bristol",
    postcodeArea: "BS8",
    responseMinutes: 30,
    verifiedStatus: {
      dbsChecked: true,
      insured: true,
      insuranceAmount: "\u00a31,000,000",
    },
    bio: "Meticulous deep cleaning specialist for high-end residential homes and estate agency end-of-tenancy guarantees.",
    specialties: [
      "End of Tenancy Guarantee",
      "Oven Deep Clean",
      "Upholstery Steam Cleaning",
    ],
    availability: "Available Tomorrow",
    portfolioImages: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: null,
    isFeatured: true,
    sortOrder: 3,
  },
  {
    name: "David O'Connor",
    trade: "Carpenter",
    companyName: "O'Connor Joinery & Crafts",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.97,
    reviewCount: 145,
    jobsCompleted: 290,
    hourlyRate: 48,
    location: "Morningside, Edinburgh",
    postcodeArea: "EH10",
    responseMinutes: 40,
    verifiedStatus: {
      dbsChecked: true,
      insured: true,
      insuranceAmount: "\u00a32,000,000",
    },
    bio: "Bespoke carpenter specialising in custom period home alcove units, oak staircases, and fitted wardrobes in Scottish properties.",
    specialties: [
      "Alcove Storage",
      "Solid Oak Flooring",
      "Custom Bookcases",
      "Timber Sash Repairs",
    ],
    availability: "Available Tomorrow",
    portfolioImages: [
      "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1595514535215-8f5c9e5c8f5e?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: null,
    isFeatured: true,
    sortOrder: 4,
  },
  {
    name: "Liam Henderson",
    trade: "Gardener",
    companyName: "GreenScape UK Landscaping",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&q=90&fit=crop&crop=faces&auto=format",
    rating: 4.94,
    reviewCount: 112,
    jobsCompleted: 210,
    hourlyRate: 32,
    location: "Harrogate, Leeds",
    postcodeArea: "HG1",
    responseMinutes: 35,
    verifiedStatus: {
      dbsChecked: true,
      insured: true,
      insuranceAmount: "\u00a31,000,000",
    },
    bio: "RHS-qualified garden designer providing seasonal maintenance, porcelain patio paving, and high-pressure stone cleaning.",
    specialties: [
      "Porcelain Paving",
      "Indian Sandstone Jetwash",
      "Turfing & Irrigation",
    ],
    availability: "Booked 2 Days",
    portfolioImages: [
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1600&q=85&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=85&fit=crop&auto=format",
    ],
    badgeText: null,
    isFeatured: true,
    sortOrder: 5,
  },
];

const beforeAfterProjects = [
  {
    title: "Victorian Terraced Kitchen Plumbing & Tiling",
    trade: "Plumber",
    location: "Fulham, London",
    beforeImage: LOCAL_IMAGE_A,
    afterImage: LOCAL_IMAGE_B,
    description:
      "Complete pipework rerouting, brass tapware installation, and Metro subway tile splashback in a 19th-century Fulham property.",
    cost: "\u00a31,850",
    completionDays: "3 Days",
    sortOrder: 0,
  },
  {
    title: "Overgrown Garden to Modern Porcelain Terrace",
    trade: "Gardener",
    location: "Altrincham, Greater Manchester",
    beforeImage: LOCAL_IMAGE_C,
    afterImage: LOCAL_IMAGE_D,
    description:
      "Cleared 40sqm of overgrown brambles, installed sub-base drainage, laid Grey Italian Porcelain slabs and outdoor LED mood lights.",
    cost: "\u00a34,200",
    completionDays: "5 Days",
    sortOrder: 1,
  },
  {
    title: "Period Living Room Alcove Cabinets & Shelving",
    trade: "Carpenter",
    location: "Harborne, Birmingham",
    beforeImage: LOCAL_IMAGE_E,
    afterImage: LOCAL_IMAGE_F,
    description:
      "Handcrafted moisture-resistant MDF twin alcove cupboards with traditional shaker doors and integrated warm LED strip lighting.",
    cost: "\u00a31,400",
    completionDays: "2 Days",
    sortOrder: 2,
  },
];

const testimonials = [
  {
    author: "Charlotte Montgomery",
    role: "Homeowner",
    city: "Kensington, London",
    trade: "Plumber",
    rating: 5,
    date: "2 days ago",
    comment:
      "When our boiler started leaking at 8pm on a freezing Tuesday, James from LocalHero arrived within 35 minutes! Fixed the pressure relief valve quickly and charged the exact upfront quote. Absolute lifesavers.",
    verifiedJob: "Emergency Boiler Valve Repair",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    source: "Trustpilot",
    sortOrder: 0,
  },
  {
    author: "Dr. Oliver Sterling",
    role: "Landlord",
    city: "Didsbury, Manchester",
    trade: "Electrician",
    rating: 5,
    date: "1 week ago",
    comment:
      "Booked an EICR inspection and consumer unit upgrade for my rental flat. Sarah was incredibly professional, provided all official NICEIC certificates within 24 hours, and left the flat spotless.",
    verifiedJob: "Consumer Unit & EICR Inspection",
    avatar: "https://randomuser.me/api/portraits/men/54.jpg",
    source: "Google",
    sortOrder: 1,
  },
  {
    author: "Gemma & Arthur Hughes",
    role: "Property Owners",
    city: "Edinburgh",
    trade: "Carpenter",
    rating: 5,
    date: "3 weeks ago",
    comment:
      "The alcove cabinets David built transformed our living room completely. The attention to detail, precision scribe cuts around Victorian skirting, and paint prep were second to none.",
    verifiedJob: "Bespoke Alcove Cabinets",
    avatar: "https://randomuser.me/api/portraits/women/23.jpg",
    source: "LocalHero Verified",
    sortOrder: 2,
  },
  {
    author: "Priya Anand",
    role: "Homeowner",
    city: "Edgbaston, Birmingham",
    trade: "Locksmith",
    rating: 5,
    date: "4 days ago",
    comment:
      "Locked out at midnight after a long flight and Marcus turned up in 12 minutes flat. Non-destructive entry, no drama, and he upgraded my cylinder to an anti-snap lock on the spot.",
    verifiedJob: "Emergency Lockout & Cylinder Upgrade",
    avatar: "https://randomuser.me/api/portraits/women/50.jpg",
    source: "Google",
    sortOrder: 3,
  },
  {
    author: "Michael & Fiona Rhodes",
    role: "Estate Agents",
    city: "Clifton, Bristol",
    trade: "Cleaner",
    rating: 5,
    date: "2 weeks ago",
    comment:
      "We use Elena for every end-of-tenancy turnover now. Landlords sign off first viewing, every time. The oven and upholstery steam clean are next level.",
    verifiedJob: "End of Tenancy Deep Clean",
    avatar: "https://randomuser.me/api/portraits/men/41.jpg",
    source: "Trustpilot",
    sortOrder: 4,
  },
  {
    author: "Rachel Whitfield",
    role: "Homeowner",
    city: "Harrogate, Leeds",
    trade: "Gardener",
    rating: 5,
    date: "5 days ago",
    comment:
      "Liam relaid our entire back garden in porcelain paving and it looks like something out of a magazine. Turned up on time both days and cleaned up completely after himself.",
    verifiedJob: "Porcelain Patio Paving",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    source: "LocalHero Verified",
    sortOrder: 5,
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

const trades = [
  {
    category: "Plumber",
    subtitle: "Expert Plumbing & Heating",
    iconName: "Wrench",
    description:
      "Boilers, leaks, radiator installs, bathroom fittings, emergency unblocking.",
    avgHourlyRate: "\u00a345 - \u00a375/hr",
    activeProsCount: 1420,
    popularTasks: [
      "Boiler Servicing",
      "Leak Repair",
      "Radiator Fitting",
      "Drain Unblocking",
    ],
    badge: "24/7 Emergency",
    featuredService: {
      id: "srv-1",
      title: "Emergency Boiler Repair",
      estimatedPrice: "From \u00a385",
      timeEstimate: "1 - 2 Hours",
      popularFor: "No heating, leaks, pressure loss",
      description:
        "Fast-response Gas Safe engineers for boiler diagnostics, repairs and heating system restoration.",
      included: [
        "Boiler Diagnostics",
        "Leak Inspection",
        "Safety Check",
        "Fixed Price Quote",
      ],
      icon: "Flame",
      image: LOCAL_IMAGE_A,
      isEmergency: true,
    },
    sortOrder: 0,
  },
  {
    category: "Electrician",
    subtitle: "Certified Electrical Services",
    iconName: "Zap",
    description:
      "Fuse board upgrades, rewiring, EV charger installation, EICR inspection certificates.",
    avgHourlyRate: "\u00a350 - \u00a385/hr",
    activeProsCount: 1180,
    popularTasks: [
      "EICR Certificate",
      "EV Charger Install",
      "Fuseboard Upgrade",
      "Lighting & Sockets",
    ],
    badge: "NICEIC Certified",
    featuredService: {
      id: "srv-2",
      title: "Consumer Unit Upgrade",
      estimatedPrice: "From \u00a3420",
      timeEstimate: "4 - 6 Hours",
      popularFor: "Fuse board replacement & rewiring",
      description:
        "Certified electricians install modern consumer units with full safety certification.",
      included: [
        "RCBO Protection",
        "Surge Protection",
        "Testing",
        "NICEIC Certificate",
      ],
      icon: "Zap",
      image: LOCAL_IMAGE_B,
    },
    sortOrder: 1,
  },
  {
    category: "Cleaner",
    subtitle: "Domestic & Deep Cleaning",
    iconName: "Sparkles",
    description:
      "End-of-tenancy deep cleaning, carpet sanitising, regular domestic home care.",
    avgHourlyRate: "\u00a318 - \u00a332/hr",
    activeProsCount: 2350,
    popularTasks: [
      "End of Tenancy",
      "Deep Carpet Clean",
      "Weekly Domestic",
      "Oven Cleaning",
    ],
    badge: "Eco Friendly",
    featuredService: {
      id: "srv-3",
      title: "End of Tenancy Cleaning",
      estimatedPrice: "From \u00a3160",
      timeEstimate: "3 - 5 Hours",
      popularFor: "Move-out deep cleaning",
      description:
        "Professional deep cleaning service for kitchens, bathrooms, carpets and appliances.",
      included: [
        "Kitchen Deep Clean",
        "Bathroom Sanitising",
        "Window Cleaning",
        "Deposit Guarantee",
      ],
      icon: "Sparkles",
      image: LOCAL_IMAGE_C,
    },
    sortOrder: 2,
  },
  {
    category: "Painter",
    subtitle: "Interior & Exterior Decorating",
    iconName: "Paintbrush",
    description:
      "Interior room painting, exterior masonry protection, wallpapering, woodwork staining.",
    avgHourlyRate: "\u00a328 - \u00a345/hr",
    activeProsCount: 940,
    popularTasks: [
      "Full Room Interior",
      "Exterior Masonry",
      "Feature Wall Wallpaper",
      "Sash Window Paint",
    ],
    featuredService: {
      id: "srv-4",
      title: "Interior & Exterior Painting",
      estimatedPrice: "From \u00a3250",
      timeEstimate: "1 - 2 Days",
      popularFor: "Walls, ceilings & woodwork",
      description:
        "Professional painting with premium finishes for homes and commercial spaces.",
      included: [
        "Surface Preparation",
        "Premium Paint",
        "Woodwork Finish",
        "Clean Completion",
      ],
      icon: "Paintbrush",
      image: LOCAL_IMAGE_D,
    },
    sortOrder: 3,
  },
  {
    category: "Gardener",
    subtitle: "Lawn Care & Landscaping",
    iconName: "Trees",
    description:
      "Lawn maintenance, patio pressure washing, hedge trimming, garden clearance & turfing.",
    avgHourlyRate: "\u00a325 - \u00a340/hr",
    activeProsCount: 890,
    popularTasks: [
      "Patio Jet Wash",
      "Hedge Trimming",
      "Turf Laying",
      "Seasonal Clearance",
    ],
    featuredService: {
      id: "srv-5",
      title: "Garden Maintenance",
      estimatedPrice: "From \u00a395",
      timeEstimate: "2 - 3 Hours",
      popularFor: "Lawn care & hedge trimming",
      description:
        "Keep your garden healthy with seasonal maintenance and landscaping services.",
      included: [
        "Lawn Mowing",
        "Hedge Trimming",
        "Weed Removal",
        "Garden Waste Removal",
      ],
      icon: "Trees",
      image: LOCAL_IMAGE_E,
    },
    sortOrder: 4,
  },
  {
    category: "Carpenter",
    subtitle: "Bespoke Joinery & Carpentry",
    iconName: "Hammer",
    description:
      "Custom alcove shelving, door hanging, bespoke wardrobes, kitchen unit fitting.",
    avgHourlyRate: "\u00a335 - \u00a360/hr",
    activeProsCount: 760,
    popularTasks: [
      "Alcove Shelving",
      "Internal Door Hanging",
      "Bespoke Wardrobe",
      "Decking Installation",
    ],
    featuredService: {
      id: "srv-6",
      title: "Custom Carpentry",
      estimatedPrice: "From \u00a3180",
      timeEstimate: "4 - 8 Hours",
      popularFor: "Shelving, doors & wardrobes",
      description:
        "Experienced carpenters for bespoke woodwork, repairs and furniture installation.",
      included: [
        "Custom Shelving",
        "Door Installation",
        "Wardrobe Fitting",
        "Wood Finishing",
      ],
      icon: "Hammer",
      image: LOCAL_IMAGE_F,
    },
    sortOrder: 5,
  },
  {
    category: "Locksmith",
    subtitle: "24/7 Security & Lock Services",
    iconName: "Key",
    description:
      "Emergency lockout access, anti-snap Ultion lock upgrades, smart lock fitting.",
    avgHourlyRate: "\u00a360 - \u00a3110/hr",
    activeProsCount: 620,
    popularTasks: [
      "Emergency Lockout",
      "Anti-Snap Cylinders",
      "Smart Yale Lock",
      "uPVC Door Repair",
    ],
    badge: "45-Min Dispatch",
    featuredService: {
      id: "srv-7",
      title: "Emergency Lock Replacement",
      estimatedPrice: "From \u00a3120",
      timeEstimate: "30 - 45 Minutes",
      popularFor: "Lost keys & lock upgrades",
      description:
        "24/7 locksmith services including emergency access and security upgrades.",
      included: [
        "Emergency Unlock",
        "Lock Replacement",
        "Security Check",
        "3 Keys Included",
      ],
      icon: "Key",
      image: LOCAL_IMAGE_G,
      isEmergency: true,
    },
    sortOrder: 6,
  },
  {
    category: "Roofer",
    subtitle: "Roof Repairs & Maintenance",
    iconName: "Home",
    description:
      "Roof tile replacements, gutter unblocking & clearing, flat roof felt/EPDM repairs.",
    avgHourlyRate: "\u00a345 - \u00a380/hr",
    activeProsCount: 510,
    popularTasks: [
      "Gutter Clean & Fix",
      "Slipping Slate Fix",
      "Flat Roof EPDM",
      "Chimney Repointing",
    ],
    featuredService: {
      id: "srv-8",
      title: "Roof Repair & Gutter Cleaning",
      estimatedPrice: "From \u00a3150",
      timeEstimate: "2 - 5 Hours",
      popularFor: "Leaks, tiles & gutters",
      description:
        "Professional roofing repairs, gutter maintenance and roof inspections.",
      included: [
        "Roof Inspection",
        "Tile Replacement",
        "Gutter Cleaning",
        "Leak Repair",
      ],
      icon: "Home",
      image: LOCAL_IMAGE_H,
    },
    sortOrder: 7,
  },
];
async function main() {
  console.log("Seeding database...");

  // Clear existing data  
  await prisma.testimonial.deleteMany();
  await prisma.beforeAfterProject.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.professional.deleteMany();

  // Seed professionals
  for (const pro of professionals) {
    await prisma.professional.create({ data: pro });
  }
  console.log(`Seeded ${professionals.length} professionals`);

  // Seed before/after projects
  for (const project of beforeAfterProjects) {
    await prisma.beforeAfterProject.create({ data: project });
  }
  console.log(`Seeded ${beforeAfterProjects.length} before/after projects`);

  // Seed testimonials
  for (const testimonial of testimonials) {
    await prisma.testimonial.create({ data: testimonial });
  }
  console.log(`Seeded ${testimonials.length} testimonials`);

 
  // Seed trades
  for (const trade of trades) {
    await prisma.trade.create({ data: trade });
  }
  console.log(`Seeded ${trades.length} trades`);

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