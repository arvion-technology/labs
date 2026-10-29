/**
 * Content for the case-study site, mirroring the real app's screens.
 *
 * The screen gallery is not a set of marketing mockups: each entry below maps to
 * a screen file in lib/screens and a route in lib/router.dart. The metrics on the
 * site are derived from this list, not typed into the HTML.
 */

export const PRODUCT = {
  name: "GharKo Sathi",
  domain: "gharkosewa.com",
  category: "Home services · Nepal",
  tagline: "Verified home services, with the money held until the job is done.",
  summary: "GharKo Sathi connects households with plumbers, electricians and cleaners. Workers pass KYC before they can be matched, payment is held in escrow, and job updates keep working when the phone loses signal.",
  status: "Live in production at gharkosewa.com. This repository is the architecture sample, not the published app binary.",
};

/** Every screen in the Flutter app, in the order the case study presents them. */
export const SCREENS = [
  {
    id: "splash",
    name: "Splash and session",
    route: "/splash",
    file: "lib/screens/splash_screen.dart",
    role: "customer",
    title: "Opening the app",
    summary: "Restores the saved session, checks token freshness and routes to either onboarding, KYC or the service feed.",
    ui: {
      status: "9:41",
      header: "GharKo Sathi",
      body: [
        { kind: "logo", text: "GK" },
        { kind: "text", text: "Home services, verified." },
        { kind: "progress", label: "Restoring session", value: 64 },
        { kind: "note", text: "Session and KYC status are read before the feed opens." },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "services",
    name: "Service catalogue",
    route: "/services",
    file: "lib/screens/services_screen.dart",
    role: "customer",
    title: "Choose a service",
    summary: "Categories loaded from the repository with a cached fallback, plus a search field that filters locally while the network is unavailable.",
    ui: {
      status: "9:41",
      header: "What do you need?",
      body: [
        { kind: "search", text: "Search plumbing, electrical…" },
        { kind: "tiles", items: ["Plumbing", "Electrical", "Cleaning", "Repairs"] },
        { kind: "card", title: "Deep cleaning · 2 BHK", meta: "From NPR 2,800 · 3 workers nearby" },
        { kind: "card", title: "AC service · 1 unit", meta: "From NPR 2,800 · verified technicians" },
        { kind: "text", text: "Only KYC-verified workers are matched" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "booking",
    name: "Booking",
    route: "/booking/:serviceId",
    file: "lib/screens/booking_screen.dart",
    role: "customer",
    title: "Book a slot",
    summary: "Address, time window and a price estimate. The estimate is computed by the repository so the quote and the invoice share one source.",
    ui: {
      status: "9:42",
      header: "Book deep cleaning",
      body: [
        { kind: "field", label: "Address", value: "Baneshwor, Kathmandu" },
        { kind: "slots", items: ["Today 2-4", "Tomorrow 9-11"] },
        { kind: "price", label: "Estimate", value: "NPR 3,200" },
        { kind: "cta", text: "Request worker" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "worker",
    name: "Worker profile",
    route: "/workers/:id",
    file: "lib/screens/worker_profile_screen.dart",
    role: "customer",
    title: "Who is coming",
    summary: "Rating, completed jobs, verified skills and the KYC badge. The badge is a state from the worker model, not a decorative label.",
    ui: {
      status: "9:44",
      header: "Worker profile",
      body: [
        { kind: "worker", name: "Sita Gurung", meta: "Plumber · Baneshwor", badge: "KYC verified" },
        { kind: "stats", items: [["4.9", "rating"], ["312", "jobs"], ["98%", "on time"]] },
        { kind: "cta", text: "Message Sita" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "kyc",
    name: "Worker KYC",
    route: "/kyc",
    file: "lib/screens/kyc_screen.dart",
    role: "worker",
    title: "Document capture",
    summary: "Three steps: identity document, selfie, and a skill certificate. The screen is a state machine of its own, with a resumable draft.",
    ui: {
      status: "9:45",
      header: "Verify your identity",
      body: [
        { kind: "steps", items: ["Document", "Selfie", "Review"], active: 1 },
        { kind: "upload", label: "Citizenship front", status: "Captured" },
        { kind: "upload", label: "Citizenship back", status: "Captured" },
        { kind: "warning", text: "A reviewer checks these within 24 hours." },
        { kind: "cta", text: "Submit for review" },
      ],
      footer: ["Jobs", "Earnings", "KYC", "Profile"],
    },
  },
  {
    id: "tracking",
    name: "Job tracking",
    route: "/jobs/:id/track",
    file: "lib/screens/job_tracking_screen.dart",
    role: "customer",
    title: "Watch the job move",
    summary: "A timeline driven by the job state machine. Offline status changes queue locally and appear with a pending marker until acknowledged.",
    ui: {
      status: "9:47",
      header: "Job #GK-2481",
      body: [
        { kind: "timeline", items: [["Requested", "done"], ["Matched", "done"], ["On the way", "current"], ["Completed", "todo"]] },
        { kind: "worker", name: "Sita Gurung", meta: "Arriving in 12 min", badge: "On the way" },
        { kind: "queue", text: "1 update waiting for signal" },
        { kind: "cta", text: "Message Sita" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "wallet",
    name: "Wallet and escrow",
    route: "/wallet",
    file: "lib/screens/wallet_screen.dart",
    role: "customer",
    title: "Where the money sits",
    summary: "Held, releasable and released balances are separate values. The screen never shows a single opaque balance that hides escrow.",
    ui: {
      status: "9:49",
      header: "Wallet",
      body: [
        { kind: "balance", label: "In escrow", value: "NPR 3,200", meta: "Released when you confirm completion" },
        { kind: "rows", items: [["Top-up", "+ NPR 5,000"], ["Cleaning · #GK-2479", "− NPR 1,800"]] },
        { kind: "cta", text: "Add money" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
  {
    id: "dispute",
    name: "Dispute",
    route: "/jobs/:id/dispute",
    file: "lib/screens/dispute_screen.dart",
    role: "customer",
    title: "Open a dispute",
    summary: "Reason, photos and a frozen escrow. The submit action is one queued mutation, so a lost signal does not lose the complaint.",
    ui: {
      status: "9:51",
      header: "Open a dispute",
      body: [
        { kind: "warning", text: "Escrow stays held until both sides respond." },
        { kind: "field", label: "What went wrong?", value: "The tap still drips after the visit." },
        { kind: "upload", label: "Add a photo", status: "Optional" },
        { kind: "cta", text: "Submit dispute" },
      ],
      footer: ["Home", "Bookings", "Wallet", "Profile"],
    },
  },
];

export const ROLES = [
  { id: "all", label: "All screens" },
  { id: "customer", label: "Customer" },
  { id: "worker", label: "Worker" },
];

/** Extra evidence shown beside the gallery, all true of the sample app. */
export const ARCHITECTURE_NOTES = [
  { title: "Feature-first", body: "lib/screens, lib/core and lib/theme. A screen imports the core; the core never imports a screen." },
  { title: "State machine as a pure class", body: "JobStateMachine has no Flutter imports, so it runs in a plain Dart test with no widget tree." },
  { title: "Queue survives a kill", body: "The offline queue serialises to JSON. On launch it is rebuilt before the first screen paints." },
  { title: "Escrow is a state, not a number", body: "held, releasable, released and frozen are derived from the job status; the wallet cannot drift from the job." },
];

export const CODE_HIGHLIGHTS = [
  {
    title: "Transition table",
    file: "lib/core/state_machine.dart",
    language: "dart",
    code: `static const Map<JobStatus, Set<JobStatus>> _edges = {
  JobStatus.requested: {JobStatus.matching, JobStatus.cancelled},
  JobStatus.matching: {JobStatus.matched, JobStatus.requested, JobStatus.cancelled},
  JobStatus.matched: {JobStatus.enRoute, JobStatus.cancelled, JobStatus.disputed},
  JobStatus.enRoute: {JobStatus.inProgress, JobStatus.cancelled, JobStatus.disputed},
  JobStatus.inProgress: {JobStatus.completed, JobStatus.disputed},
  JobStatus.completed: {JobStatus.paid, JobStatus.disputed},
};`,
  },
  {
    title: "Queue a status change",
    file: "lib/core/offline_queue.dart",
    language: "dart",
    code: `final result = queue.enqueue(
  key: '\${job.id}:inProgress',
  type: 'job.status',
  payload: {'status': 'inProgress'},
);

if (!network.online) {
  return; // the queue is the UI state until it flushes
}

final flush = await queue.flush((op) => api.apply(op));
if (flush.exhausted) showSyncWarning();`,
  },
];
