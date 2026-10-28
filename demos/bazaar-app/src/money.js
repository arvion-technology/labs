/**
 * Money for the marketplace. Every amount is an integer in paisa (1 NPR = 100
 * paisa). Floats are never used for money; the tests check the rounding at the
 * boundary that actually occurs: a 2% platform fee on a small order.
 */

export const PLATFORM_FEE_RATE = 0.02;
export const PLATFORM_FEE_MIN = 200; // NPR 2 in paisa
export const DELIVERY_BASE = 8000; // NPR 80
export const DELIVERY_PER_KM = 2500; // NPR 25

export function rupees(amount) {
  if (!Number.isInteger(amount)) throw new TypeError("money must be integer paisa");
  return amount / 100;
}

export function formatNPR(amount) {
  if (!Number.isInteger(amount)) throw new TypeError("money must be integer paisa");
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / 100).toString();
  const fraction = (absolute % 100).toString().padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "−" : ""}NPR ${grouped}${fraction === "00" ? "" : `.${fraction}`}`;
}

export function platformFee(subtotal) {
  if (!Number.isInteger(subtotal) || subtotal < 0) throw new TypeError("subtotal must be non-negative paisa");
  return Math.max(PLATFORM_FEE_MIN, Math.round(subtotal * PLATFORM_FEE_RATE));
}

export function deliveryFee(distanceKm) {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new TypeError("distance must be a non-negative number");
  }
  return DELIVERY_BASE + Math.round(distanceKm * DELIVERY_PER_KM);
}

/** full breakdown used by the checkout review and the seller dashboard */
export function quote({ items, distanceKm = 0, discount = 0 }) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("quote needs at least one item");
  const subtotal = items.reduce((sum, item) => {
    if (!Number.isInteger(item.price) || !Number.isInteger(item.qty) || item.qty <= 0) {
      throw new TypeError("line items need integer price and qty");
    }
    return sum + item.price * item.qty;
  }, 0);
  const fee = platformFee(subtotal);
  const delivery = deliveryFee(distanceKm);
  const total = Math.max(0, subtotal + fee + delivery - discount);
  return { subtotal, platformFee: fee, delivery, discount, total };
}

/** where the buyer's money goes; the seller never receives the platform fee. */
export function settlement(quoteValue) {
  const seller = quoteValue.subtotal - quoteValue.discount + quoteValue.delivery;
  return {
    seller: Math.max(0, seller),
    platform: quoteValue.platformFee,
    total: quoteValue.total,
    check: Math.max(0, seller) + quoteValue.platformFee,
  };
}

export function parsePriceInput(value) {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}
