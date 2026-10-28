/**
 * Checkout flow for Hamro Sajha Bazaar, mirrored from the Expo app's
 * lib/checkout.ts. Pure functions: the screen renders, this module decides.
 */

export const CHECKOUT_STATES = ["cart", "address", "review", "payment", "processing", "paid", "failed", "cancelled"];

export const PAYMENT_METHODS = [
  { id: "esewa", label: "eSewa", kind: "wallet", instant: true },
  { id: "khalti", label: "Khalti", kind: "wallet", instant: true },
  { id: "cod", label: "Cash on delivery", kind: "cod", instant: false },
];

const EDGES = {
  cart: ["address", "cancelled"],
  address: ["cart", "review", "cancelled"],
  review: ["address", "payment", "cancelled"],
  payment: ["review", "processing", "cancelled"],
  processing: ["paid", "failed"],
  failed: ["payment", "review", "cancelled"],
  paid: ["cancelled"], // refund path, handled by support in the real product
  cancelled: [],
};

export function isState(value) {
  return CHECKOUT_STATES.includes(value);
}

export function paymentMethod(id) {
  return PAYMENT_METHODS.find((method) => method.id === id) || null;
}

/** Guards run after the edge check, so a disabled button can explain itself. */
export function canAdvance(checkout, to) {
  if (!isState(to)) return { ok: false, reason: `unknown state "${to}"` };
  if (!EDGES[checkout.state].includes(to)) return { ok: false, reason: `${checkout.state} cannot move to ${to}` };

  if (checkout.state === "address" && to === "review" && !checkout.address?.trim()) {
    return { ok: false, reason: "a delivery address is required" };
  }
  if (checkout.state === "review" && to === "payment") {
    if (!(checkout.items?.length > 0)) return { ok: false, reason: "the cart is empty" };
    if (!(checkout.total > 0)) return { ok: false, reason: "the total must be positive" };
  }
  if (checkout.state === "payment" && to === "processing") {
    const method = paymentMethod(checkout.method);
    if (!method) return { ok: false, reason: "choose a payment method" };
    if (!(checkout.total > 0)) return { ok: false, reason: "the total must be positive" };
  }
  if (checkout.state === "processing" && to === "paid") {
    const method = paymentMethod(checkout.method);
    if (method?.id === "cod" && !checkout.deliveryConfirmed) {
      return { ok: false, reason: "cash is collected on delivery" };
    }
  }
  return { ok: true, reason: "allowed" };
}

export function advance(checkout, to, patch = {}, now = Date.now()) {
  // Merge the patch first: some guards depend on the same action's side effects
  // (for example confirming delivery when marking a COD order paid).
  const check = canAdvance({ ...checkout, ...patch }, to);
  if (!check.ok) throw new Error(`illegal checkout transition: ${check.reason}`);
  return {
    ...checkout,
    ...patch,
    state: to,
    updatedAt: now,
    history: [...(checkout.history || []), { from: checkout.state, to, at: now }],
  };
}

export function startCheckout({ items, address = "", method = null, total = 0 } = {}) {
  return {
    state: "cart",
    items,
    address,
    method,
    total,
    deliveryConfirmed: false,
    updatedAt: 0,
    history: [],
  };
}

/** eSewa and Khalti settle in the processing step; COD waits for delivery. */
export function processingOutcome(checkout, { success = true } = {}) {
  if (checkout.state !== "processing") return checkout;
  return advance(checkout, success ? "paid" : "failed");
}

export function canRetry(checkout) {
  return checkout.state === "failed";
}

export function isTerminal(checkout) {
  return ["paid", "cancelled"].includes(checkout.state);
}

export const CHECKOUT_FLOWS = {
  esewa: ["cart", "address", "review", "payment", "processing", "paid"],
  cod: ["cart", "address", "review", "payment", "processing", "paid"],
  failedThenRetry: ["cart", "address", "review", "payment", "processing", "failed", "payment", "processing", "paid"],
};
