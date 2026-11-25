const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");
const appSource = fs.readFileSync(path.join(root, "scripts/app.js"), "utf8");

test("document has language, viewport, title and page landmarks", () => {
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/i);
  assert.match(html, /<title>[^<]+<\/title>/i);
  assert.match(html, /<header\b/i);
  assert.match(html, /<nav\b[^>]*aria-label=/i);
  assert.match(html, /<main\b[^>]*id="main"/i);
  assert.match(html, /<footer\b/i);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1);
});

test("all in-page navigation links point to existing IDs", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const targets = [...html.matchAll(/href="#([^"]*)"/g)]
    .map((match) => match[1])
    .filter(Boolean);
  assert.ok(targets.length > 0, "expected in-page navigation links");
  for (const target of targets) {
    assert.ok(ids.has(target), `missing target id: ${target}`);
  }
});

test("two-day agenda and activity categories are explicitly represented", () => {
  assert.match(html, /DAY 01/);
  assert.match(html, /DAY 02/);
  assert.match(html, /Date TBA/);
  assert.match(html, />Drill</);
  assert.match(html, />Firing</);
  assert.match(html, />Other competitions</);
  assert.match(html, /subject to required institutional, range and safety approvals/i);
});

test("registration points to the events page in demo mode", () => {
  assert.match(html, /Registration is open \(demo\)/i);
  assert.match(html, /href="events\.html"/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /<input\b/i);
  assert.match(html, /no payments are collected/i);
});

test("FAQ disclosures and accessibility hooks exist", () => {
  assert.ok((html.match(/<details\b/g) || []).length >= 4);
  assert.ok((html.match(/<summary\b/g) || []).length >= 4);
  assert.match(html, /class="skip-link"/);
  assert.match(css, /\.skip-link:focus/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("mobile navigation opens, closes on link selection, and sets the footer year", () => {
  function makeElement(initialAttributes = {}) {
    const attributes = { ...initialAttributes };
    const listeners = {};
    const classes = new Set();
    return {
      textContent: "",
      getAttribute(name) { return attributes[name] ?? null; },
      setAttribute(name, value) { attributes[name] = value; },
      addEventListener(name, callback) { listeners[name] = callback; },
      dispatch(name) { if (listeners[name]) listeners[name](); },
      classList: {
        toggle(name, force) {
          const shouldAdd = force === undefined ? !classes.has(name) : Boolean(force);
          if (shouldAdd) classes.add(name);
          else classes.delete(name);
          return shouldAdd;
        },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      attributes,
      listeners
    };
  }

  const menu = makeElement({ "aria-expanded": "false" });
  const link = makeElement();
  const navigation = makeElement();
  navigation.querySelectorAll = () => [link];
  const year = makeElement();
  const document = {
    querySelector(selector) {
      if (selector === ".menu-toggle") return menu;
      if (selector === "#site-nav") return navigation;
      if (selector === "#year") return year;
      return null;
    }
  };

  vm.runInNewContext(appSource, { document, Date });

  menu.dispatch("click");
  assert.equal(menu.getAttribute("aria-expanded"), "true");
  assert.equal(navigation.classList.contains("is-open"), true);

  link.dispatch("click");
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  assert.equal(navigation.classList.contains("is-open"), false);
  assert.equal(year.textContent, String(new Date().getFullYear()));
});

test("demo-mode pages exist and load the shared data layer", () => {
  const fs = require("node:fs");
  for (const p of ["events", "event", "login", "my", "admin"]) {
    const page = fs.readFileSync(`${p}.html`, "utf8");
    assert.match(page, /scripts\/store\.js/);
    assert.match(page, /<div id="hdr">/);
  }
});
