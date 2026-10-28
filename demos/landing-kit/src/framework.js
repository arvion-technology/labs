import { PALETTES } from "./palettes.js";

/**
 * The conversion framework behind every template.
 *
 * A template is not a pile of sections; it is an argument in a fixed order. The
 * data below is the argument. Each template records which section it uses and
 * the one-line note explaining what that section is doing for that particular
 * audience.
 */

export const SECTIONS = [
  {
    id: "hero",
    name: "Hero",
    job: "State the outcome, name the audience and give one action. The visitor decides in about five seconds whether to scroll.",
    must: ["One specific promise", "A verb-led primary action", "A secondary path for people who are not ready"],
    mistake: "Feature lists and three competing buttons. If everything is emphasised, nothing is.",
  },
  {
    id: "proof",
    name: "Proof",
    job: "Answer “is this real?” without paid logos or invented numbers. Show mechanics, guarantees or a product surface that is hard to fake.",
    must: ["Something observable", "No fictional testimonials", "Placement before the first long scroll"],
    mistake: "Logo walls of companies that are not customers, or a metric with no source.",
  },
  {
    id: "problem",
    name: "Problem",
    job: "Describe the current workaround precisely enough that the reader recognises their own week. Agitate the cost, not the competitor.",
    must: ["A concrete failure mode", "The cost of the status quo", "No straw-man competitor"],
    mistake: "Generic pain like “inefficiency”. Everyone claims that; nobody recognises it.",
  },
  {
    id: "product",
    name: "Product",
    job: "Show the product doing the thing promised in the hero. Three or four capabilities, each tied to the problem above.",
    must: ["A real interface or artefact", "Benefit before feature name", "At most four items"],
    mistake: "A feature grid that could belong to any product in the category.",
  },
  {
    id: "how",
    name: "How it works",
    job: "Remove the imagined setup cost. Three steps, in order, with what the customer has to do in each one.",
    must: ["Three or four steps", "The first step should be small", "Mention what the vendor does for them"],
    mistake: "Five steps ending in “success”, which explains nothing.",
  },
  {
    id: "pricing",
    name: "Pricing",
    job: "Let the reader qualify themselves without a sales call. Show the shape of the cost and what changes between tiers.",
    must: ["A visible starting price or range", "What each tier adds", "The honest caveat"],
    mistake: "“Contact us” for a product a freelancer could buy on a card.",
  },
  {
    id: "objections",
    name: "Objections",
    job: "Answer the three reasons people leave. Price, switching cost and risk. Put the answers where the doubt happens, not in a separate FAQ farm.",
    must: ["Price or commitment concern", "Migration or switching concern", "A way to test before committing"],
    mistake: "Questions nobody asks, written to fill a grid.",
  },
  {
    id: "cta",
    name: "Final call to action",
    job: "Repeat the hero promise in fewer words and ask for the action again, now that the objections are answered.",
    must: ["The same action as the hero", "Restate the outcome", "One line of risk reversal"],
    mistake: "Introducing a new offer at the bottom, which resets the decision.",
  },
];

export const REQUIRED_SECTIONS = SECTIONS.map((section) => section.id);

export const TEMPLATES = [
  {
    id: "saas",
    name: "Ledgerline",
    vertical: "SaaS",
    palette: "saas",
    file: "templates/saas.html",
    audience: "Finance leads at 20–200 person companies",
    pitch: "Close the month without a spreadsheet relay race.",
    mode: "light",
    sections: ["hero", "proof", "problem", "product", "how", "pricing", "objections", "cta"],
    note: "The safe template: light surfaces, an indigo action, and pricing visible on the first page. It is the one to reach for when the buyer is a finance team and the sale is a trial.",
  },
  {
    id: "agency",
    name: "Fieldnote",
    vertical: "Agency",
    palette: "agency",
    file: "templates/agency.html",
    audience: "Founders choosing a design partner",
    pitch: "A small studio that ships, not a pitch deck with a delivery arm.",
    mode: "light",
    sections: ["hero", "problem", "product", "how", "proof", "objections", "cta"],
    note: "Editorial and warm. Big type, numbered services, no logo wall. The proof section is the engagement model itself, because an agency cannot show client work it does not have permission to show.",
  },
  {
    id: "app",
    name: "Tempo",
    vertical: "Mobile app",
    palette: "app",
    file: "templates/app.html",
    audience: "People who want a running habit to survive a bad week",
    pitch: "A running plan that bends instead of breaking.",
    mode: "dark",
    sections: ["hero", "proof", "product", "how", "objections", "pricing", "cta"],
    note: "Dark-first with a phone mock built in CSS. No App Store badge, because there is no app to link; the beta CTA is the honest conversion for a pre-store product.",
  },
  {
    id: "ai",
    name: "Vela",
    vertical: "AI product",
    palette: "ai",
    file: "templates/ai.html",
    audience: "Research teams drowning in their own documents",
    pitch: "Ask your own library a question and get the passage, not a guess.",
    mode: "dark",
    sections: ["hero", "proof", "problem", "product", "how", "objections", "pricing", "cta"],
    note: "Dark-first with a working prompt mock. The proof section is a citation demo, which is the only credible claim an AI product can make before someone uses it.",
  },
  {
    id: "marketplace",
    name: "Swap",
    vertical: "Marketplace",
    palette: "marketplace",
    file: "templates/marketplace.html",
    audience: "Buyers and sellers in a city where delivery is unpredictable",
    pitch: "Buy and sell within walking distance, with the money held until pickup.",
    mode: "light",
    sections: ["hero", "product", "proof", "how", "pricing", "objections", "cta"],
    note: "Two audiences in one page: buyers get the category grid, sellers get a separate block below it. Marketplace pages fail when they assume everyone is a buyer.",
  },
  {
    id: "devtool",
    name: "Relay",
    vertical: "Developer tool",
    palette: "devtool",
    file: "templates/devtool.html",
    audience: "Backend engineers debugging webhooks",
    pitch: "Replay the webhook that failed, with the payload it actually sent.",
    mode: "dark",
    sections: ["hero", "problem", "product", "how", "proof", "pricing", "objections", "cta"],
    note: "Terminal aesthetic, install command in the hero, and a free tier that is genuinely useful. Developer pages convert on the first successful command, not on copy.",
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((template) => template.id === id) || null;
}

export function templatePath(template) {
  return `demo/${template.file}`;
}

/** Structural validation used by the tests and the gallery. */
export function validateTemplate(template) {
  const errors = [];
  if (!template.id || !/^[a-z][a-z0-9-]*$/.test(template.id)) errors.push(`${template.id}: invalid id`);
  if (!PALETTES[template.palette]) errors.push(`${template.id}: missing palette`);
  else if (!PALETTES[template.palette][template.mode]) errors.push(`${template.id}: palette has no ${template.mode} mode`);
  const seen = new Set();
  for (const section of template.sections) {
    if (!REQUIRED_SECTIONS.includes(section)) errors.push(`${template.id}: unknown section "${section}"`);
    if (seen.has(section)) errors.push(`${template.id}: duplicate section "${section}"`);
    seen.add(section);
  }
  for (const required of ["hero", "cta"]) {
    if (!seen.has(required)) errors.push(`${template.id}: missing required section "${required}"`);
  }
  if (seen.size < 7) errors.push(`${template.id}: only ${seen.size} sections; seven is the useful minimum`);
  if (!template.sections.includes("proof")) errors.push(`${template.id}: no proof section`);
  if (!template.sections.includes("objections")) errors.push(`${template.id}: no objections section`);
  if (!template.audience || !template.pitch) errors.push(`${template.id}: audience or pitch missing`);
  return errors;
}

export function validateAll() {
  return TEMPLATES.flatMap((template) => validateTemplate(template));
}

/** Section counts across the six templates — what the framework page prints. */
export function coverage() {
  return SECTIONS.map((section) => ({
    ...section,
    usedBy: TEMPLATES.filter((template) => template.sections.includes(section.id)),
  }));
}

/** The sections a template intentionally leaves out, with its reason. */
export function omitted(template) {
  return REQUIRED_SECTIONS.filter((id) => !template.sections.includes(id));
}

export function sectionName(id) {
  return SECTIONS.find((section) => section.id === id)?.name || id;
}
