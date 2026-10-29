/* Ledgerbox static mirror. The real application is PHP 8 with PDO and SQLite;
   this page repeats the same money rules and screens in the browser so the
   gallery can show them without a server. */

(() => {
  const { el, $, $$, dataTable, barList, download, toCSV, toast } = A;
  const money = (minor) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100) + " NPR";

  /* ---------- seed ------------------------------------------------------- */
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

  const seed = () => {
    const customers = [
      { id: "c1", name: "Kirtipur Coffee Roasters", email: "accounts@kirtipurcoffee.com", city: "Kirtipur" },
      { id: "c2", name: "Patan Design Guild", email: "finance@patandesign.com", city: "Lalitpur" },
      { id: "c3", name: "Thamel Bicycle Works", email: "billing@thamelbikes.com", city: "Kathmandu" },
      { id: "c4", name: "Bhaktapur Clay Studio", email: "hello@bhaktapurclay.com", city: "Bhaktapur" },
      { id: "c5", name: "Lakeside Print House", email: "pay@lakesideprint.com", city: "Pokhara" },
    ];
    let n = 1040;
    const mk = (customerId, issued, due, items, taxRate, payments = []) => ({
      id: "i" + (++n), number: "INV-" + n, customerId, issued, due,
      items: items.map(([description, qty, unit]) => ({ description, qty, unit })),
      taxRate, payments,
    });
    const invoices = [
      mk("c1", daysAgo(48), daysAgo(18), [["Espresso machine service", 2, 145000], ["Grinder burr set", 1, 89000]], 13, [{ amount: 300000, date: daysAgo(20) }]),
      mk("c2", daysAgo(40), daysAgo(10), [["Brand system workshop", 3, 210000]], 13, []),
      mk("c3", daysAgo(33), daysAgo(3), [["Bicycle fleet tune-up", 12, 24000], ["Brake pads", 12, 3500]], 13, [{ amount: 150000, date: daysAgo(18) }]),
      mk("c1", daysAgo(22), daysAhead(8), [["Monthly retainer: roastery", 1, 480000]], 13, []),
      mk("c4", daysAgo(18), daysAhead(12), [["Kiln electrical upgrade", 1, 620000], ["Consumables", 4, 14500]], 13, [{ amount: 200000, date: daysAgo(4) }]),
      mk("c5", daysAgo(12), daysAhead(18), [["Offset print run, 5k sheets", 1, 780000]], 13, []),
      mk("c2", daysAgo(9), daysAhead(21), [["Design retainer, October", 1, 350000]], 13, []),
      mk("c3", daysAgo(5), daysAhead(25), [["Custom frame fabrication", 2, 195000]], 13, []),
      mk("c1", daysAgo(2), daysAhead(28), [["Wholesale beans, 40 kg", 40, 11500]], 13, []),
    ];
    return { customers, invoices, nextId: n + 1 };
  };

  let db = seed();

  /* ---------- domain ----------------------------------------------------- */
  const subtotalMinor = (inv) => inv.items.reduce((a, it) => a + it.qty * it.unit, 0);
  const taxMinor = (inv) => Math.round(subtotalMinor(inv) * inv.taxRate / 100);
  const totalMinor = (inv) => subtotalMinor(inv) + taxMinor(inv);
  const paidMinor = (inv) => inv.payments.reduce((a, p) => a + p.amount, 0);
  const balanceMinor = (inv) => totalMinor(inv) - paidMinor(inv);
  const daysOverdue = (inv) => Math.floor((today - new Date(inv.due)) / 86400000);
  const statusOf = (inv) => {
    if (balanceMinor(inv) <= 0) return "paid";
    if (paidMinor(inv) > 0) return daysOverdue(inv) > 0 ? "overdue" : "partial";
    return daysOverdue(inv) > 0 ? "overdue" : "open";
  };
  const BADGE = { paid: "green", open: "blue", partial: "amber", overdue: "red" };
  const badge = (text, kind) => el("span", { class: "badge " + kind }, el("span", { class: "dot" }), text);
  const customerName = (id) => db.customers.find((c) => c.id === id)?.name || "Unknown";

  const agingBuckets = () => {
    const buckets = [
      ["Current", (d) => d <= 0],
      ["1 to 30 days", (d) => d > 0 && d <= 30],
      ["31 to 60 days", (d) => d > 30 && d <= 60],
      ["61+ days", (d) => d > 60],
    ];
    return buckets.map(([label, test]) => ({
      label,
      value: db.invoices.filter((i) => balanceMinor(i) > 0 && test(daysOverdue(i)))
        .reduce((a, i) => a + balanceMinor(i), 0),
    }));
  };

  /* ---------- views ------------------------------------------------------ */
  function stat(label, value, delta) {
    return el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: "stat-value", text: value }),
      delta ? el("div", { class: "stat-delta", text: delta }) : null);
  }

  function renderDashboard() {
    const outstanding = db.invoices.reduce((a, i) => a + balanceMinor(i), 0);
    const overdue = db.invoices.filter((i) => daysOverdue(i) > 0).reduce((a, i) => a + balanceMinor(i), 0);
    const paid = db.invoices.reduce((a, i) => a + paidMinor(i), 0);
    const issued = db.invoices.reduce((a, i) => a + totalMinor(i), 0);
    $("#kpis").replaceChildren(
      stat("Outstanding", money(outstanding), "across " + db.invoices.filter((i) => balanceMinor(i) > 0).length + " invoices"),
      stat("Overdue", money(overdue), "past the due date"),
      stat("Collected", money(paid), Math.round((paid / issued) * 100) + "% of issued value"),
      stat("Invoices", String(db.invoices.length), db.customers.length + " customers"),
    );

    const buckets = agingBuckets();
    const host = $("#aging-bars");
    host.replaceChildren(barList({
      rows: buckets.map((b) => ({ label: b.label, value: b.value })),
      format: (v) => money(v),
    }));
    host.classList.add("aging-list");

    const recentInv = [...db.invoices].sort((a, b) => b.issued.localeCompare(a.issued)).slice(0, 5);
    $("#recent-invoices").replaceChildren(el("div", { class: "feed" },
      ...recentInv.map((inv) => el("div", { class: "feed-row" },
        el("div", { class: "feed-main" },
          el("span", { text: inv.number + " · " + customerName(inv.customerId) }),
          el("small", { text: "issued " + inv.issued + " · due " + inv.due })),
        el("div", { class: "feed-side" }, badge(statusOf(inv), BADGE[statusOf(inv)]))))));

    const payments = db.invoices.flatMap((inv) => inv.payments.map((p) => ({ ...p, inv })))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    $("#recent-payments").replaceChildren(el("div", { class: "feed" },
      ...payments.map((p) => el("div", { class: "feed-row" },
        el("div", { class: "feed-main" }, el("span", { text: customerName(p.inv.customerId) }), el("small", { text: p.inv.number + " · " + p.date })),
        el("div", { class: "feed-side", text: money(p.amount) })))));
  }

  function statusFilterOptions() {
    const sel = $("#filter-status");
    if (sel.options.length === 1) {
      for (const s of ["open", "partial", "overdue", "paid"]) sel.append(el("option", { value: s, text: s }));
    }
    const cs = $("#filter-customer");
    if (cs.options.length === 1) {
      for (const c of db.customers) cs.append(el("option", { value: c.id, text: c.name }));
    }
  }

  function filteredInvoices() {
    const q = ($("#filter-q").value || "").trim().toLowerCase();
    const status = $("#filter-status").value;
    const customer = $("#filter-customer").value;
    return db.invoices.filter((inv) => {
      if (status !== "all" && statusOf(inv) !== status) return false;
      if (customer !== "all" && inv.customerId !== customer) return false;
      if (q && !(inv.number + " " + customerName(inv.customerId)).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderInvoices() {
    statusFilterOptions();
    const rows = filteredInvoices();
    $("#invoice-count").textContent = rows.length + " of " + db.invoices.length + " invoices";
    $("#invoice-table").replaceChildren(dataTable({
      columns: [
        { label: "Invoice", key: "number" },
        { label: "Customer", render: (inv) => customerName(inv.customerId) },
        { label: "Due", key: "due" },
        { label: "Total", align: "right", render: (inv) => money(totalMinor(inv)) },
        { label: "Balance", align: "right", render: (inv) => money(balanceMinor(inv)) },
        { label: "Status", render: (inv) => badge(statusOf(inv), BADGE[statusOf(inv)]) },
      ],
      rows,
      empty: "No invoices match these filters.",
      onRowClick: (inv) => { location.hash = "invoice/" + inv.id; },
    }));
    renderInvoiceDetail();
  }

  function renderInvoiceDetail() {
    const id = (location.hash.split("/")[1] || "").trim();
    const host = $("#invoice-detail");
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) { host.replaceChildren(el("p", { class: "muted", text: "Pick an invoice from the list." })); return; }
    host.replaceChildren(
      el("div", { class: "invoice-grid" },
        el("div", { class: "card" },
          el("div", { class: "card-head" },
            el("div", {}, el("div", { class: "card-title", text: inv.number }), el("div", { class: "card-sub", text: customerName(inv.customerId) }))),
          dataTable({
            columns: [
              { label: "Description", key: "description" },
              { label: "Qty", align: "right", key: "qty" },
              { label: "Unit", align: "right", render: (it) => money(it.unit) },
              { label: "Amount", align: "right", render: (it) => money(it.qty * it.unit) },
            ],
            rows: inv.items,
          })),
        el("div", { class: "card" },
          el("dl", { class: "totals" },
            el("dt", { text: "Subtotal" }), el("dd", { text: money(subtotalMinor(inv)) }),
            el("dt", { text: "Tax " + inv.taxRate + "%" }), el("dd", { text: money(taxMinor(inv)) }),
            el("dt", { class: "total", text: "Total" }), el("dd", { class: "total", text: money(totalMinor(inv)) }),
            el("dt", { text: "Paid" }), el("dd", { text: money(paidMinor(inv)) }),
            el("dt", { class: "balance", text: "Balance" }), el("dd", { class: "balance-value", text: money(balanceMinor(inv)) })),
          el("div", { class: "note", text: "Issued " + inv.issued + " · due " + inv.due + " · " + (daysOverdue(inv) > 0 ? daysOverdue(inv) + " days overdue" : "not yet due") }),
          el("div", { class: "row mt-2" }, badge(statusOf(inv), BADGE[statusOf(inv)])))));
  }

  function renderCustomers() {
    const rows = db.customers.map((c) => {
      const inv = db.invoices.filter((i) => i.customerId === c.id);
      return { name: c.name, email: c.email, city: c.city, count: inv.length, outstanding: inv.reduce((a, i) => a + balanceMinor(i), 0) };
    });
    $("#customer-count").textContent = db.customers.length + " accounts";
    $("#customer-table").replaceChildren(dataTable({
      columns: [
        { label: "Customer", key: "name" },
        { label: "Email", key: "email" },
        { label: "City", key: "city" },
        { label: "Invoices", align: "right", key: "count" },
        { label: "Outstanding", align: "right", render: (r) => money(r.outstanding) },
      ],
      rows,
    }));
  }

  function renderAging() {
    const buckets = agingBuckets();
    const total = buckets.reduce((a, b) => a + b.value, 0);
    $("#aging-kpis").replaceChildren(
      stat("Outstanding", money(total), "unpaid balance"),
      ...buckets.map((b) => stat(b.label, money(b.value), total ? Math.round((b.value / total) * 100) + "%" : "0%")),
    );
    $("#aging-sub").textContent = "Bucket by due date, as of " + iso(today);
    const rows = db.invoices.filter((i) => balanceMinor(i) > 0).map((inv) => ({
      number: inv.number, customer: customerName(inv.customerId), due: inv.due,
      days: daysOverdue(inv), balance: balanceMinor(inv),
    })).sort((a, b) => b.days - a.days);
    $("#aging-table").replaceChildren(dataTable({
      columns: [
        { label: "Invoice", key: "number" },
        { label: "Customer", key: "customer" },
        { label: "Due", key: "due" },
        { label: "Days late", align: "right", render: (r) => r.days > 0 ? String(r.days) : "current" },
        { label: "Balance", align: "right", render: (r) => money(r.balance) },
      ],
      rows,
      empty: "Nothing outstanding.",
    }));
    $("#aging-csv").onclick = () => download("aging.csv", toCSV(rows), "text/csv");
  }

  function invoiceCsv() {
    return db.invoices.map((inv) => ({
      invoice: inv.number, customer: customerName(inv.customerId), issued: inv.issued, due: inv.due, status: statusOf(inv),
      subtotal: (subtotalMinor(inv) / 100).toFixed(2), tax: (taxMinor(inv) / 100).toFixed(2),
      total: (totalMinor(inv) / 100).toFixed(2), paid: (paidMinor(inv) / 100).toFixed(2),
      balance: (balanceMinor(inv) / 100).toFixed(2), currency: "NPR",
    }));
  }
  function paymentCsv() {
    return db.invoices.flatMap((inv) => inv.payments.map((p) => ({
      payment: "PMT-" + p.date.replace(/-/g, ""), paid_on: p.date, customer_id: inv.customerId,
      method: "bank transfer", reference: inv.number, amount: (p.amount / 100).toFixed(2), invoices: inv.number,
    })));
  }

  function renderExport() {
    $("#csv-invoices").onclick = () => download("invoices.csv", toCSV(invoiceCsv()), "text/csv");
    $("#csv-payments").onclick = () => download("payments.csv", toCSV(paymentCsv()), "text/csv");
    const preview = invoiceCsv().slice(0, 8);
    $("#csv-preview").replaceChildren(dataTable({
      columns: Object.keys(preview[0] || {}).map((k) => ({ label: k, key: k })),
      rows: preview,
    }));
  }

  const RENDER = { dashboard: renderDashboard, invoices: renderInvoices, invoice: renderInvoiceDetail, customers: renderCustomers, aging: renderAging, export: renderExport };
  const TITLES = { dashboard: "Dashboard", invoices: "Invoices", invoice: "Invoice", customers: "Customers", aging: "Aging", export: "CSV export" };

  function showView(view) {
    const key = view === "invoice" ? "invoice" : view;
    const panel = $$("[data-view-panel]").find((p) => p.dataset.viewPanel === key);
    if (!panel) return;
    $$("[data-view-panel]").forEach((p) => { p.hidden = p !== panel; });
    $$(".nav-item[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === view || (view === "invoice" && a.dataset.view === "invoices")));
    const crumb = $("#crumb");
    if (crumb) crumb.replaceChildren(el("span", { text: "Ledger" }), el("span", { class: "sep", text: "/" }), el("span", { text: TITLES[view] || view }));
    (RENDER[view] || (() => {}))();
  }

  /* ---------- wiring ----------------------------------------------------- */
  function reset() { db = seed(); showView("dashboard"); toast("Demo data reset", "success"); }

  function boot() {
    const viewFromHash = () => {
      const h = (location.hash || "#dashboard").slice(1);
      if (h.startsWith("invoice/")) return "invoice";
      return RENDER[h] ? h : "dashboard";
    };
    $$("[data-view]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); location.hash = a.dataset.view; }));
    window.addEventListener("hashchange", () => showView(viewFromHash()));
    $("#reset-demo").onclick = reset;
    $("#new-invoice").onclick = () => A.modal({
      title: "New invoice",
      body: el("div", { class: "form" },
        el("label", { class: "field" }, el("span", { text: "Customer" }), el("select", { class: "select", id: "ni-customer" }, ...db.customers.map((c) => el("option", { value: c.id, text: c.name })))),
        el("label", { class: "field" }, el("span", { text: "Description" }), el("input", { class: "input", id: "ni-desc", value: "Consulting day" })),
        el("label", { class: "field" }, el("span", { text: "Amount (NPR)" }), el("input", { class: "input", id: "ni-amount", type: "number", value: "25000" }))),
      actions: [
        { label: "Cancel", kind: "ghost" },
        { label: "Create invoice", kind: "primary", onClick: () => {
          const customerId = $("#ni-customer").value;
          const amount = Math.max(100, Math.round(Number($("#ni-amount").value || 0) * 100));
          db.invoices.push({ id: "i" + (++db.nextId), number: "INV-" + db.nextId, customerId, issued: iso(today), due: daysAhead(14), items: [{ description: $("#ni-desc").value || "Services", qty: 1, unit: amount }], taxRate: 13, payments: [] });
          showView("invoices");
          toast("Invoice created", "success");
        } },
      ],
    });
    ["filter-q", "filter-status", "filter-customer"].forEach((id) => {
      const node = $("#" + id);
      node.addEventListener(id === "filter-q" ? "input" : "change", renderInvoices);
    });
    $("#clear-filters").onclick = () => { $("#filter-q").value = ""; $("#filter-status").value = "all"; $("#filter-customer").value = "all"; renderInvoices(); };
    $("#customer-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#customer-name").value.trim();
      if (!name) return;
      db.customers.push({ id: "c" + (db.customers.length + 1), name, email: $("#customer-email").value.trim() || "unknown@example.com", city: $("#customer-city").value.trim() || "Kathmandu" });
      e.target.reset();
      renderCustomers();
      toast("Customer added", "success");
    });
    showView(viewFromHash());
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
