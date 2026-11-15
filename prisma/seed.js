import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
const catalog = [
  { name: "Coastal sea bass", slug: "coastal-sea-bass", category: "Fish", description: "Bright, clean flavour from a trusted coastal counter. Cleaned and ready for your pan.", image: "fish", origin: "Kochi coast", basePrice: 12900, baseWeight: 500, prep: ["Cleaned whole", "Curry cut", "Fillet"] },
  { name: "Tiger prawns", slug: "tiger-prawns", category: "Seafood", description: "Firm, sweet prawns, cleaned with care and packed cold for the journey home.", image: "prawns", origin: "West coast", basePrice: 18900, baseWeight: 500, prep: ["Cleaned", "Butterfly cut"] },
  { name: "Black pomfret", slug: "black-pomfret", category: "Fish", description: "A coastal favourite with delicate flesh. Choose it whole or have it sliced for a curry.", image: "black-pomfret", origin: "Konkan coast", basePrice: 32900, baseWeight: 500, prep: ["Cleaned whole", "Curry cut", "Fry cut"] },
  { name: "Kingfish (Surmai)", slug: "kingfish-surmai", category: "Fish", description: "Meaty, firm kingfish steaks, trimmed fresh for grilling, frying, or a coastal curry.", image: "kingfish-surmai", origin: "Arabian Sea", basePrice: 42900, baseWeight: 500, prep: ["Steaks", "Curry cut", "Boneless cubes"] },
  { name: "Indian mackerel (Bangda)", slug: "indian-mackerel", category: "Fish", description: "Rich, full-flavoured mackerel, cleaned and ready for a quick fry or a tangy masala.", image: "indian-mackerel", origin: "Kerala coast", basePrice: 14900, baseWeight: 500, prep: ["Cleaned whole", "Cleaned & slit", "Curry cut"] },
  { name: "Ribbon fish", slug: "ribbon-fish", category: "Fish", description: "Tender coastal ribbon fish, prepared in neat pieces for a crisp fry or curry.", image: "ribbon-fish", origin: "West coast", basePrice: 17900, baseWeight: 500, prep: ["Cleaned", "Fry cut", "Curry cut"] },
  { name: "Squid (Calamari)", slug: "squid-calamari", category: "Seafood", description: "Tender squid, cleaned at the counter and prepared as rings or bite-sized pieces.", image: "squid-calamari", origin: "Kerala coast", basePrice: 22900, baseWeight: 500, prep: ["Cleaned whole", "Rings", "Cubes"] },
  { name: "Blue swimmer crab", slug: "blue-swimmer-crab", category: "Seafood", description: "Sweet coastal crab, cleaned and cut for a fragrant curry or a simple pepper roast.", image: "blue-swimmer-crab", origin: "Karnataka coast", basePrice: 28900, baseWeight: 500, prep: ["Whole cleaned", "Curry cut"] },
  { name: "Backwater mussels", slug: "backwater-mussels", category: "Seafood", description: "Plump mussels from the backwaters, ready to steam, roast, or fold into a coconut curry.", image: "backwater-mussels", origin: "Kerala backwaters", basePrice: 19900, baseWeight: 500, prep: ["Whole in shell", "Cleaned meat"] },
  { name: "Clams (Kube)", slug: "clams-kube", category: "Seafood", description: "Small, sweet clams for a classic coastal sukka, pasta, or a quick garlic butter toss.", image: "clams-kube", origin: "Karnataka coast", basePrice: 16900, baseWeight: 500, prep: ["Whole cleaned", "Cleaned meat"] },
  { name: "Free-range chicken", slug: "free-range-chicken", category: "Poultry", description: "Fresh chicken from a nearby partner farm, prepared to order at the counter.", image: "chicken", origin: "Local partner farm", basePrice: 17600, baseWeight: 1000, prep: ["Curry cut", "Boneless", "Skinless"] },
  { name: "Farm-fresh eggs", slug: "farm-fresh-eggs", category: "Poultry", description: "Fresh brown eggs from a nearby partner farm, packed gently for delivery.", image: "farm-fresh-eggs", origin: "Local partner farm", basePrice: 7200, baseWeight: 360, prep: ["Standard"], variants: [{ weightGrams: 360, label: "6 eggs", pricePaise: 7200 }, { weightGrams: 720, label: "12 eggs", pricePaise: 13200 }] },
  { name: "Tender mutton", slug: "tender-mutton", category: "Mutton", description: "Tender, carefully trimmed mutton, cut fresh when your order is placed.", image: "mutton", origin: "Deccan farms", basePrice: 44900, baseWeight: 500, prep: ["Curry cut", "Boneless"] },
  { name: "Norwegian salmon", slug: "norwegian-salmon", category: "Fish", description: "A generous salmon portion with a clean finish, prepared skin-on or skinless.", image: "salmon", origin: "Responsibly sourced", basePrice: 29900, baseWeight: 300, prep: ["Skin-on fillet", "Skinless fillet", "Cubes"] },
  { name: "Silver sardines", slug: "silver-sardines", category: "Fish", description: "Small, silver and full of flavour. Cleaned and ready for a quick coastal fry.", image: "sardines", origin: "Konkan coast", basePrice: 9900, baseWeight: 500, prep: ["Cleaned", "Cleaned & slit"] },
];

try {
  for (const name of ["Fish", "Seafood", "Poultry", "Mutton"]) {
    const slug = name.toLowerCase();
    await db.category.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }
  for (const item of catalog) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: item.category.toLowerCase() } });
    const product = await db.product.upsert({ where: { slug: item.slug }, update: { name: item.name, description: item.description, categoryId: category.id, active: true, imageKey: item.image, origin: item.origin }, create: { name: item.name, slug: item.slug, description: item.description, categoryId: category.id, imageKey: item.image, origin: item.origin } });
    const variants = item.variants || (item.baseWeight === 300 ? [150, 300, 600] : item.baseWeight === 1000 ? [500, 1000, 1500] : [250, 500, 1000]).map((weightGrams) => ({ weightGrams }));
    for (const choice of variants) {
      const grams = choice.weightGrams;
      const sku = `${item.slug.toUpperCase().replaceAll("-", "-")}-${grams}G`;
      const label = choice.label || `${grams} g`;
      const pricePaise = choice.pricePaise ?? Math.round(item.basePrice * grams / item.baseWeight);
      await db.productVariant.upsert({ where: { sku }, update: { label, weightGrams: grams, pricePaise, prepOptions: item.prep, active: true }, create: { productId: product.id, sku, label, weightGrams: grams, pricePaise, stockGrams: 12000, prepOptions: item.prep } });
    }
  }

  const now = new Date();
  for (let day = 0; day < 5; day += 1) {
    const date = new Date(now); date.setDate(date.getDate() + day); date.setHours(10, 0, 0, 0);
    for (const hour of [10, 16]) {
      const startsAt = new Date(date); startsAt.setHours(hour, 0, 0, 0);
      if (startsAt <= now) continue;
      const endsAt = new Date(startsAt); endsAt.setHours(endsAt.getHours() + 3);
      const exists = await db.deliverySlot.findFirst({ where: { startsAt, areaCode: "110001" } });
      if (!exists) await db.deliverySlot.create({ data: { startsAt, endsAt, capacity: 12, areaCode: "110001" } });
    }
  }

  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (email && password && password !== "change-this-before-use") {
    const passwordHash = await hash(password, 12);
    await db.user.upsert({ where: { email: email.toLowerCase() }, update: { name: "Market administrator", passwordHash, role: "ADMIN" }, create: { name: "Market administrator", email: email.toLowerCase(), passwordHash, role: "ADMIN" } });
    console.log(`Seeded administrator account: ${email.toLowerCase()}`);
  } else {
    console.log("No administrator seeded. Set DEMO_ADMIN_EMAIL and a non-placeholder DEMO_ADMIN_PASSWORD to create one.");
  }
  for (const staff of [
    { role: "PICKER", email: process.env.DEMO_PICKER_EMAIL, password: process.env.DEMO_PICKER_PASSWORD, name: "Counter picker" },
    { role: "RIDER", email: process.env.DEMO_RIDER_EMAIL, password: process.env.DEMO_RIDER_PASSWORD, name: "Delivery rider" },
  ]) {
    if (!staff.email || !staff.password || staff.password === "change-this-before-use") continue;
    await db.user.upsert({
      where: { email: staff.email.toLowerCase() },
      update: { name: staff.name, passwordHash: await hash(staff.password, 12), role: staff.role },
      create: { name: staff.name, email: staff.email.toLowerCase(), passwordHash: await hash(staff.password, 12), role: staff.role },
    });
    console.log(`Seeded ${staff.role.toLowerCase()} account: ${staff.email.toLowerCase()}`);
  }
  console.log("Catalog and delivery windows seeded.");
} finally {
  await db.$disconnect();
}
