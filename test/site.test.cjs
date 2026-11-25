const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const appSource = read("scripts/app.js");

test("main NCC pages have valid document landmarks and shared header mount", () => {
  for (const pageName of ["index.html", "events.html", "event.html", "register.html", "login.html", "my.html", "admin.html"]) {
    const html = read(pageName);
    assert.match(html, /<html lang="en">/i, pageName);
    assert.match(html, /<meta name="viewport"/i, pageName);
    assert.match(html, /<title>[^<]+<\/title>/i, pageName);
    assert.match(html, /<main\b/i, pageName);
    assert.match(html, /<div id="hdr">/i, pageName);
  }
});

test("registration requires login and preserves the selected event", () => {
  const registration = read("register.html");
  const login = read("login.html");
  const store = read("scripts/store.js");
  assert.match(registration, /Store\.registerTeam\(payload\)/);
  assert.match(registration, /login\.html\?next=/);
  assert.match(registration, /eventId=/);
  assert.match(login, /Store\.signup\(Object\.fromEntries\(new FormData\(e\.target\)\),/);
  assert.match(store, /emailRedirectTo: emailRedirectTo \|\| undefined/);
  assert.match(store, /signup: async function \(u, emailRedirectTo\)/);
});

test("participant dashboard offers demo or real payment and reloads after verification", () => {
  const dashboard = read("my.html");
  const store = read("scripts/store.js");
  assert.match(dashboard, /data-demo-pay=/);
  assert.match(dashboard, /data-gateway-pay=/);
  assert.match(dashboard, /Store\.startGatewayPayment\(gatewayPayId\)/);
  assert.match(store, /submitDemoPayment: async function/);
  assert.match(store, /startGatewayPayment: async function/);
  assert.match(dashboard, /Payment Status/);
});

test("Razorpay endpoints validate ownership and verify captured payments server-side", () => {
  const order = read("api/payment/create-order.js");
  const verify = read("api/payment/verify.js");
  assert.match(order, /user_id=eq\./);
  assert.match(order, /RAZORPAY_KEY_SECRET/);
  assert.match(order, /\/v1\/orders/);
  assert.match(verify, /createHmac\('sha256'/);
  assert.match(verify, /timingSafeEqual/);
  assert.match(verify, /status==='captured'/);
  assert.match(verify, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("demo payment is explicitly described as simulated", () => {
  const registration = read("register.html");
  const dashboard = read("my.html");
  assert.match(registration, /Demo Payment Notice/);
  assert.match(dashboard, /DEMO PAYMENT MODE:/);
});

test("mobile navigation opens, closes on link selection, and sets the footer year", () => {
  function makeElement(initialAttributes = {}) {
    const attributes = { ...initialAttributes }, listeners = {}, classes = new Set();
    return {
      textContent: "",
      getAttribute(name) { return attributes[name] ?? null; },
      setAttribute(name, value) { attributes[name] = value; },
      addEventListener(name, callback) { listeners[name] = callback; },
      dispatch(name) { if (listeners[name]) listeners[name](); },
      classList: {
        toggle(name, force) { const add = force === undefined ? !classes.has(name) : Boolean(force); if (add) classes.add(name); else classes.delete(name); return add; },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      }
    };
  }
  const menu = makeElement({ "aria-expanded": "false" }), link = makeElement(), nav = makeElement(), year = makeElement();
  nav.querySelectorAll = () => [link];
  const document = { querySelector(selector) { return selector === ".menu-toggle" ? menu : selector === "#site-nav" ? nav : selector === "#year" ? year : null; } };
  vm.runInNewContext(appSource, { document, Date });
  menu.dispatch("click");
  assert.equal(menu.getAttribute("aria-expanded"), "true");
  assert.equal(nav.classList.contains("is-open"), true);
  link.dispatch("click");
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  assert.equal(nav.classList.contains("is-open"), false);
  assert.equal(year.textContent, String(new Date().getFullYear()));
});
