/* Atlas Portal, gallery interaction layer.
 *
 * The exported pages are complete server-rendered HTML. The gallery has no Next
 * server and no hydration, so this small script mirrors the real app's
 * interactions: invoice and ticket filtering, the reply thread, and the settings
 * saves. It runs on every demo page and does nothing when the page has no match.
 */
(function () {
  "use strict";

  if (location.search.indexOf("shot=1") !== -1) {
    document.documentElement.classList.add("shot");
  }

  function normalisePath(pathname) {
    return pathname.replace(/\/index\.html$/, "/");
  }

  function resolveHref(href) {
    try {
      return normalisePath(new URL(href, document.baseURI).pathname);
    } catch (error) {
      return "";
    }
  }

  /* Mark the active nav item. The exported pages have no client router. */
  var currentPath = normalisePath(location.pathname);
  var navLinks = document.querySelectorAll(".main-nav .nav-link");
  for (var n = 0; n < navLinks.length; n += 1) {
    var link = navLinks[n];
    var rawHref = link.getAttribute("href") || "";
    var target = resolveHref(rawHref);
    var isRootLink = rawHref === "." || rawHref === "./" || rawHref === "";
    var active = isRootLink
      ? currentPath === target
      : target === currentPath || currentPath.indexOf(target) === 0;
    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    }
  }

  function ensureEmptyRow(tbody, id, columns, text) {
    var existing = document.getElementById(id);
    if (existing) return existing;
    var row = document.createElement("tr");
    row.id = id;
    var cell = document.createElement("td");
    cell.colSpan = columns;
    cell.className = "empty-cell";
    cell.textContent = text;
    row.appendChild(cell);
    row.style.display = "none";
    tbody.appendChild(row);
    return row;
  }

  /* Invoices: filter rows by free text and derived status. */
  function setupInvoiceFilters() {
    var search = document.getElementById("invoice-search");
    var status = document.getElementById("invoice-status");
    var count = document.getElementById("invoice-count");
    var table = document.querySelector(".invoice-explorer table");
    if (!search || !status || !count || !table) return;
    var rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr[data-invoice-row]"));
    var tbody = table.querySelector("tbody");
    var empty = ensureEmptyRow(tbody, "invoice-empty", 7, "No invoices match this filter.");

    function apply() {
      var query = search.value.trim().toLowerCase();
      var statusValue = status.value;
      var visible = 0;
      rows.forEach(function (row) {
        var matchesQuery = !query || (row.getAttribute("data-search") || "").indexOf(query) !== -1;
        var matchesStatus = statusValue === "all" || row.getAttribute("data-status") === statusValue;
        var show = matchesQuery && matchesStatus;
        row.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.style.display = visible ? "none" : "";
      count.textContent = visible + " of " + rows.length + " invoices";
    }

    search.addEventListener("input", apply);
    status.addEventListener("change", apply);
    apply();
  }

  /* Tickets: same idea, one row per link inside a list. */
  function setupTicketFilters() {
    var search = document.getElementById("ticket-search");
    var status = document.getElementById("ticket-status");
    var count = document.getElementById("ticket-count");
    var list = document.querySelector(".ticket-rows");
    if (!search || !status || !count || !list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll("[data-ticket-row]"));
    var empty = document.getElementById("ticket-empty");
    if (!empty) {
      empty = document.createElement("li");
      empty.id = "ticket-empty";
      empty.className = "empty-cell";
      empty.textContent = "No tickets match this filter.";
      empty.style.display = "none";
      list.appendChild(empty);
    }

    function apply() {
      var query = search.value.trim().toLowerCase();
      var statusValue = status.value;
      var visible = 0;
      rows.forEach(function (row) {
        var matchesQuery = !query || (row.getAttribute("data-search") || "").indexOf(query) !== -1;
        var matchesStatus = statusValue === "all" || row.getAttribute("data-status") === statusValue;
        var show = matchesQuery && matchesStatus;
        row.parentElement.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.style.display = visible ? "none" : "";
      count.textContent = visible + " of " + rows.length + " tickets";
    }

    search.addEventListener("input", apply);
    status.addEventListener("change", apply);
    apply();
  }

  /* Reply thread: append a customer message without a server. */
  function setupReplyThread() {
    var form = document.getElementById("reply-form");
    var body = document.getElementById("reply-body");
    var thread = document.getElementById("ticket-thread");
    if (!form || !body || !thread) return;
    var notice = form.querySelector(".form-notice");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "form-notice";
      notice.setAttribute("role", "status");
      form.appendChild(notice);
    }

    var quickReplies = form.querySelectorAll(".quick-reply");
    for (var q = 0; q < quickReplies.length; q += 1) {
      quickReplies[q].addEventListener("click", function (event) {
        body.value = event.currentTarget.textContent.trim();
        body.focus();
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = body.value.trim();
      if (!text) {
        notice.textContent = "Write a reply before sending.";
        return;
      }
      var item = document.createElement("li");
      item.className = "thread-message message-customer";
      var avatar = document.createElement("span");
      avatar.className = "thread-avatar avatar-customer";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "AR";
      var bubble = document.createElement("div");
      bubble.className = "thread-bubble";
      var meta = document.createElement("div");
      meta.className = "thread-meta";
      var author = document.createElement("strong");
      author.textContent = "Alex Rivera";
      var kind = document.createElement("span");
      kind.textContent = "Customer";
      var time = document.createElement("time");
      time.textContent = "29 Oct, 12:00";
      meta.appendChild(author);
      meta.appendChild(kind);
      meta.appendChild(time);
      var paragraph = document.createElement("p");
      paragraph.textContent = text;
      bubble.appendChild(meta);
      bubble.appendChild(paragraph);
      item.appendChild(avatar);
      item.appendChild(bubble);
      thread.appendChild(item);
      item.scrollIntoView({ block: "nearest" });

      var status = document.querySelector(".thread-head .status");
      if (status) {
        status.textContent = "Open";
        status.className = "status status-open";
      }
      body.value = "";
      notice.textContent = "Reply added to this browser session. The real app posts it to the ticket API.";
    });
  }

  /* Settings: reveal the API key and acknowledge a save. */
  function setupSettings() {
    var reveal = document.querySelector(".api-key-row .button");
    var key = document.getElementById("api-key");
    if (reveal && key) {
      reveal.addEventListener("click", function () {
        var shown = key.textContent.indexOf("hidden") === -1;
        key.textContent = shown ? "atlas_live_sk_hidden" : "atlas_live_sk_4f19_9c2e_7a0d";
        reveal.textContent = shown ? "Reveal" : "Hide";
      });
    }

    var form = document.querySelector(".settings-form");
    if (!form) return;
    var notice = form.querySelector(".form-notice");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "form-notice";
      notice.setAttribute("role", "status");
      form.appendChild(notice);
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      notice.textContent = "Changes saved in this browser session. The static demo has no backend.";
    });
  }

  setupInvoiceFilters();
  setupTicketFilters();
  setupReplyThread();
  setupSettings();
})();
