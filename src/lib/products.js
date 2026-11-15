export const products = [
  { id: "sea-bass", name: "Coastal sea bass", slug: "coastal-sea-bass", category: "Fish", categorySlug: "fish", price: 12900, weightGrams: 500, unit: "500 g", rating: "Counter favourite", description: "Bright, clean flavour from a trusted coastal counter. Cleaned and ready for your pan.", prep: ["Cleaned whole", "Curry cut", "Fillet"], image: "fish", origin: "Kochi coast" },
  { id: "tiger-prawns", name: "Tiger prawns", slug: "tiger-prawns", category: "Seafood", categorySlug: "seafood", price: 18900, weightGrams: 500, unit: "500 g", rating: "Today’s catch", description: "Firm, sweet prawns, cleaned with care and packed cold for the journey home.", prep: ["Cleaned", "Butterfly cut"], image: "prawns", origin: "West coast" },
  { id: "black-pomfret", name: "Black pomfret", slug: "black-pomfret", category: "Fish", categorySlug: "fish", price: 32900, weightGrams: 500, unit: "500 g", rating: "Coastal favourite", description: "A coastal favourite with delicate flesh. Choose it whole or have it sliced for a curry.", prep: ["Cleaned whole", "Curry cut", "Fry cut"], image: "black-pomfret", origin: "Konkan coast" },
  { id: "kingfish-surmai", name: "Kingfish (Surmai)", slug: "kingfish-surmai", category: "Fish", categorySlug: "fish", price: 42900, weightGrams: 500, unit: "500 g", rating: "Meaty & firm", description: "Meaty, firm kingfish steaks, trimmed fresh for grilling, frying, or a coastal curry.", prep: ["Steaks", "Curry cut", "Boneless cubes"], image: "kingfish-surmai", origin: "Arabian Sea" },
  { id: "indian-mackerel", name: "Indian mackerel (Bangda)", slug: "indian-mackerel", category: "Fish", categorySlug: "fish", price: 14900, weightGrams: 500, unit: "500 g", rating: "Market classic", description: "Rich, full-flavoured mackerel, cleaned and ready for a quick fry or a tangy masala.", prep: ["Cleaned whole", "Cleaned & slit", "Curry cut"], image: "indian-mackerel", origin: "Kerala coast" },
  { id: "ribbon-fish", name: "Ribbon fish", slug: "ribbon-fish", category: "Fish", categorySlug: "fish", price: 17900, weightGrams: 500, unit: "500 g", rating: "Coastal catch", description: "Tender coastal ribbon fish, prepared in neat pieces for a crisp fry or curry.", prep: ["Cleaned", "Fry cut", "Curry cut"], image: "ribbon-fish", origin: "West coast" },
  { id: "squid-calamari", name: "Squid (Calamari)", slug: "squid-calamari", category: "Seafood", categorySlug: "seafood", price: 22900, weightGrams: 500, unit: "500 g", rating: "Quick-cooking", description: "Tender squid, cleaned at the counter and prepared as rings or bite-sized pieces.", prep: ["Cleaned whole", "Rings", "Cubes"], image: "squid-calamari", origin: "Kerala coast" },
  { id: "blue-swimmer-crab", name: "Blue swimmer crab", slug: "blue-swimmer-crab", category: "Seafood", categorySlug: "seafood", price: 28900, weightGrams: 500, unit: "500 g", rating: "Sweet & delicate", description: "Sweet coastal crab, cleaned and cut for a fragrant curry or a simple pepper roast.", prep: ["Whole cleaned", "Curry cut"], image: "blue-swimmer-crab", origin: "Karnataka coast" },
  { id: "backwater-mussels", name: "Backwater mussels", slug: "backwater-mussels", category: "Seafood", categorySlug: "seafood", price: 19900, weightGrams: 500, unit: "500 g", rating: "From the backwaters", description: "Plump mussels from the backwaters, ready to steam, roast, or fold into a coconut curry.", prep: ["Whole in shell", "Cleaned meat"], image: "backwater-mussels", origin: "Kerala backwaters" },
  { id: "clams-kube", name: "Clams (Kube)", slug: "clams-kube", category: "Seafood", categorySlug: "seafood", price: 16900, weightGrams: 500, unit: "500 g", rating: "Coastal classic", description: "Small, sweet clams for a classic coastal sukka, pasta, or a quick garlic butter toss.", prep: ["Whole cleaned", "Cleaned meat"], image: "clams-kube", origin: "Karnataka coast" },
  { id: "chicken", name: "Free-range chicken", slug: "free-range-chicken", category: "Poultry", categorySlug: "poultry", price: 17600, weightGrams: 1000, unit: "1 kg", rating: "Farm raised", description: "Fresh chicken from a nearby partner farm, prepared to order at the counter.", prep: ["Curry cut", "Boneless", "Skinless"], image: "chicken", origin: "Local partner farm" },
  { id: "farm-fresh-eggs", name: "Farm-fresh eggs", slug: "farm-fresh-eggs", category: "Poultry", categorySlug: "poultry", price: 7200, weightGrams: 360, unit: "6 eggs", rating: "Farm fresh", description: "Fresh brown eggs from a nearby partner farm, packed gently for delivery.", prep: ["Standard"], image: "farm-fresh-eggs", origin: "Local partner farm", variants: [{ weightGrams: 360, label: "6 eggs", pricePaise: 7200, prepOptions: ["Standard"] }, { weightGrams: 720, label: "12 eggs", pricePaise: 13200, prepOptions: ["Standard"] }] },
  { id: "mutton", name: "Tender mutton", slug: "tender-mutton", category: "Mutton", categorySlug: "mutton", price: 44900, weightGrams: 500, unit: "500 g", rating: "Small-batch cut", description: "Tender, carefully trimmed mutton, cut fresh when your order is placed.", prep: ["Curry cut", "Boneless"], image: "mutton", origin: "Deccan farms" },
  { id: "salmon", name: "Norwegian salmon", slug: "norwegian-salmon", category: "Fish", categorySlug: "fish", price: 29900, weightGrams: 300, unit: "300 g", rating: "Rich & buttery", description: "A generous salmon portion with a clean finish, prepared skin-on or skinless.", prep: ["Skin-on fillet", "Skinless fillet", "Cubes"], image: "salmon", origin: "Responsibly sourced" },
  { id: "sardines", name: "Silver sardines", slug: "silver-sardines", category: "Fish", categorySlug: "fish", price: 9900, weightGrams: 500, unit: "500 g", rating: "Market classic", description: "Small, silver and full of flavour. Cleaned and ready for a quick coastal fry.", prep: ["Cleaned", "Cleaned & slit"], image: "sardines", origin: "Konkan coast" },
];

export const formatPrice = (paise) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
export const formatWeight = (grams) => grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`;
export function formatProductAmount(product, grams) {
  return product.variants?.find((variant) => variant.weightGrams === grams)?.label || formatWeight(grams);
}
export function formatLineOption(item) {
  const amount = item.variantLabel || formatWeight(item.weightGrams);
  return item.preparation && item.preparation !== "Standard" ? `${amount} · ${item.preparation}` : amount;
}
export function isWeightBasedProduct(product) {
  return !(product.variants || []).some((variant) => variant.label && !/^\d+(?:\.\d+)?\s*g$/i.test(variant.label));
}
export const categories = ["Everything", "Fish", "Seafood", "Poultry", "Mutton"];

export function findProduct(slug) {
  return products.find((product) => product.slug === slug);
}
