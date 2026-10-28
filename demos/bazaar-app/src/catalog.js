/** Sample listings and screens for the case-study site. Prices are paisa. */

export const SELLER = {
  id: "seller_01",
  name: "Sabina Maharjan",
  rating: 4.8,
  reviews: 126,
  verified: true,
  joined: "2024",
};

export const LISTINGS = [
  {
    id: "L-2041", title: "iPhone 13, 128 GB", category: "mobiles", price: 6_850_000,
    description: "Battery 91%. Comes with the original box and a case. No scratches on the screen.",
    location: "Patan", distanceKm: 2.4, createdAt: 1_793_000_000_000, sellerVerified: true, relevance: 9,
  },
  {
    id: "L-2040", title: "Wooden study table", category: "furniture", price: 1_250_000,
    description: "Solid wood, 120cm. Small water mark on one leg. Pickup only.",
    location: "Baneshwor", distanceKm: 1.1, createdAt: 1_792_990_000_000, sellerVerified: true, relevance: 7,
  },
  {
    id: "L-2039", title: "Sony WH-1000XM4 headphones", category: "electronics", price: 2_450_000,
    description: "Noise cancelling, ear pads replaced last month. Charger included.",
    location: "Lazimpat", distanceKm: 3.8, createdAt: 1_792_980_000_000, sellerVerified: true, relevance: 8,
  },
  {
    id: "L-2038", title: "Mountain bike, 27.5 inch", category: "hobbies", price: 1_900_000,
    description: "Serviced this month. New brake pads. Frame size M.",
    location: "Bhaktapur", distanceKm: 6.2, createdAt: 1_792_970_000_000, sellerVerified: false, relevance: 6,
  },
  {
    id: "L-2037", title: "Cotton kurta, size M", category: "fashion", price: 180_000,
    description: "Worn twice. Hand wash only. Colour is a deep indigo.",
    location: "Asan", distanceKm: 0.8, createdAt: 1_792_960_000_000, sellerVerified: true, relevance: 4,
  },
  {
    id: "L-2036", title: "Pressure cooker, 5 litre", category: "home", price: 320_000,
    description: "Hawkins, three years old, seal replaced recently.",
    location: "Kalimati", distanceKm: 2.9, createdAt: 1_792_950_000_000, sellerVerified: true, relevance: 5,
  },
  {
    id: "L-2035", title: "Scooter, 2021 model", category: "vehicles", price: 12_500_000,
    description: "12,000 km. Papers clean, blue book transferred on sale.",
    location: "Koteshwor", distanceKm: 4.4, createdAt: 1_792_940_000_000, sellerVerified: true, relevance: 3,
  },
  {
    id: "L-2034", title: "Mechanical keyboard, TKL", category: "electronics", price: 820_000,
    description: "Brown switches, PBT keycaps. USB-C detachable cable.",
    location: "Jhamsikhel", distanceKm: 3.1, createdAt: 1_792_930_000_000, sellerVerified: false, relevance: 6,
  },
];

export const SCREENS = [
  {
    id: "feed", name: "Listing feed", role: "buyer", route: "app/index.tsx",
    summary: "Category chips, filter sheet and a cached feed that stays readable offline.",
    header: "Nearby", items: ["iPhone 13 · NPR 68,500", "Wooden study table · NPR 12,500", "Sony XM4 · NPR 24,500"],
    footer: ["Home", "Search", "Chats", "Profile"],
  },
  {
    id: "listing", name: "Listing detail", role: "buyer", route: "app/listing/[id].tsx",
    summary: "Gallery, seller trust signals, delivery estimate and an offer entry point.",
    header: "iPhone 13, 128 GB", items: ["NPR 68,500", "Sabina M. · verified seller", "2.4 km · pickup or delivery"], footer: ["Message", "Make offer"],
  },
  {
    id: "checkout", name: "Checkout", role: "buyer", route: "app/checkout.tsx",
    summary: "Address, review, eSewa / Khalti / COD, then the processing state.",
    header: "Checkout", items: ["Deliver to Baneshwor", "NPR 70,010 total", "eSewa · Khalti · Cash"], footer: ["Pay NPR 70,010"],
  },
  {
    id: "chat", name: "Buyer-seller chat", role: "buyer", route: "app/chat/[id].tsx",
    summary: "Thread with unread state, offer cards and a safety notice on first contact.",
    header: "Sabina M.", items: ["You: Is the box included?", "Sabina: Yes, with the charger.", "Offer: NPR 65,000"], footer: ["Message"],
  },
  {
    id: "seller", name: "Seller dashboard", role: "seller", route: "app/seller.tsx",
    summary: "Views, favourites, active listings and the payout that is pending.",
    header: "Seller", items: ["1,284 views · 7 days", "3 active listings", "NPR 41,200 pending"], footer: ["Listings", "Orders", "Payouts"],
  },
  {
    id: "orders", name: "Seller orders", role: "seller", route: "app/seller/orders.tsx",
    summary: "Orders by state, with the settlement breakdown for each sale.",
    header: "Orders", items: ["L-2043 · processing", "L-2041 · delivered", "Settlement: NPR 66,770"], footer: ["All", "Open", "Paid"],
  },
];

export const SELLER_ORDERS = [
  { id: "L-2043", buyer: "R. Karki", total: 1_334_000, state: "processing", createdAt: 1_793_000_000_000 },
  { id: "L-2041", buyer: "S. Gurung", total: 6_900_000, state: "delivered", createdAt: 1_792_900_000_000 },
  { id: "L-2038", buyer: "A. Shrestha", total: 1_958_000, state: "paid", createdAt: 1_792_800_000_000 },
];

export const PRODUCT = {
  name: "Hamro Sajha Bazaar",
  domain: "hamrosajhabazaar.com",
  category: "National marketplace · Nepal",
  summary: "A buyer and seller marketplace with local payment rails, chat and offline caching. The product is live; this repository is the architecture sample.",
  status: "Live at hamrosajhabazaar.com. The React Native source in this repository is the architecture sample, not the store build.",
};

export const SCREENSHOT_NOTES = [
  "The feed returns cached listings while the request is in flight, then updates in place.",
  "Checkout keeps the total in paisa from cart to receipt; the display formatter is the only place rupees appear.",
  "Cash on delivery is a first-class method, not an afterthought: it changes the processing guard.",
];
