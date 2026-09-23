/* =========================================================
   ZEUSSHOP — shared data layer
   (Supabase cloud DB with automatic localStorage fallback)

   load order in HTML:
     1. supabase-config.js   → SUPA_PROJECT_URL / SUPA_ANON_KEY
     2. this file (db.js)
     3. main.js  /  admin.js

   DB_MODE = true  → all data lives in Supabase, shared to everyone
   DB_MODE = false → old localStorage behavior (config empty / unreachable)
   ========================================================= */

/* ---------- default catalog (used only when DB is not configured) ---------- */
const SKINS = [];
const FEATURED = [];

/* only the admin panel may pull users/inventory rows (anonymous RLS hides them) */
const IS_ADMIN_PAGE = /admin\.html/i.test(location.pathname);

/* normalize older saved rarity names */
const R_NORM = { "Mil-Spec": "Mil-Spec Grade", "Industrial": "Industrial Grade", "Consumer": "Consumer Grade" };

/* ---------- connection state ---------- */
const DB_URL = (typeof SUPA_PROJECT_URL === "string" ? SUPA_PROJECT_URL : "").trim();
const DB_KEY = (typeof SUPA_ANON_KEY === "string" ? SUPA_ANON_KEY : "").trim();
const supabaseLib = (typeof window !== "undefined" && window.supabase) ? window.supabase : null;
const DB_MODE = !!(DB_URL && DB_KEY && supabaseLib);
let supa = null;
let DB_READY = false;
let DB_ERROR = null;

/* tiny localStorage helpers (works on admin + shop pages) */
function lsGet(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v === null ? fallback : v; } catch { /* ignore */ }
  return fallback;
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}
function lsRawGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null || v === undefined) return fallback;
    return JSON.parse(v);
  } catch { /* ignore */ }
  return fallback;
}

/* keys used for local mirrors (offline / pre-DB read) */
const K_CAT = "skm_cat_db";        // full catalog mirror
const K_ORD = "skm_ord_db";        // orders mirror
const K_INV = "skm_inv_db";        // inventory rows mirror
const K_USR = "skm_usr_db";        // users mirror
const K_ANN = "skm_ann_db";        // announcement mirror
const K_SET = "skm_set_db";        // site settings mirror (key → value)

/* in-memory caches (authoritative in DB_MODE after ready) */
let catCache = null;               // array | null
let ordersCache = lsRawGet(K_ORD, []);
let invRowsCache = lsRawGet(K_INV, []);
let usersCache = lsRawGet(K_USR, []);
let userCountCache = null;         // fallback count (RPC) when anonymous RLS hides the users table
let annCache = lsRawGet(K_ANN, null);
let setCache = lsRawGet(K_SET, {});          // object key → value
let heavyReady = false;                      // orders/users/inventory background load finished
let dbHeavyStarted = false;                  // guard so the heavy load starts only once (even when kicked off early)
let realtimeSeen = false;                    // set once a realtime event proves the channel works
const hasRealtime = () => realtimeSeen;
const isHeavyReady = () => heavyReady;

/* best-known live user count for the shop hero (RLS-safe) */
async function fetchUserCount() {
  if (!DB_MODE || !DB_READY || !supa) return null;
  try {
    const { data, error } = await supa.rpc("count_users");
    if (error) return null;
    return Number(data);
  } catch { return null; }
}
const getUserCount = () => (Number.isFinite(userCountCache) && userCountCache !== null)
  ? userCountCache
  : (Array.isArray(usersCache) ? usersCache.filter(u => u.tg || u.id).length : 0);

function normSkin(s) {
  s = s || {};
  const out = {
    name: String(s.name || "").trim(),
    img: String(s.img || ""),
    weapon: String(s.weapon || "Rifle"),
    wear: String(s.wear || "Factory New"),
    rarity: R_NORM[String(s.rarity || "")] || String(s.rarity || "Covert"),
    type: String(s.type || "Normal"),
    price: Number(s.price) || 0,
    discount: Math.max(0, Math.min(100, Number(s.discount) || 0)),
    sort: Number(s.sort) || 0,
    delivery_mode: s.delivery_mode === "days" ? "days" : "immediate",
    delivery_days: Math.max(0, Math.min(30, Math.round(Number(s.delivery_days) || 0))),
  };
  return out;
}
function normOrder(o) {
  o = o || {};
  return {
    id: Number(o.id) || 0,
    telegram: String(o.telegram || ""),
    items: Array.isArray(o.items) ? o.items : [],
    total: Number(o.total) || 0,
    status: ["pending", "approved", "rejected"].includes(o.status) ? o.status : "pending",
    coupon: String(o.coupon || "").trim().toUpperCase(),
    date: o.date ? new Date(o.date).toISOString() : new Date().toISOString(),
  };
}
function normInv(r) {
  r = r || {};
  return {
    id: Number(r.id) || 0,
    telegram: String(r.telegram || ""),
    name: String(r.name || ""),
    price: Number(r.price) || 0,
    img: String(r.img || ""),
    weapon: String(r.weapon || ""),
    wear: String(r.wear || ""),
    rarity: String(r.rarity || ""),
    type: String(r.type || ""),
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}
function normUser(u) {
  u = u || {};
  return { id: Number(u.id) || 0, tg: String(u.tg || ""), date: u.date ? new Date(u.date).toISOString() : new Date().toISOString() };
}
function normAnn(a) {
  return { id: 1, enabled: !!(a && a.enabled), text: (a && a.text) ? String(a.text) : "" };
}

/* =========================================================
   Public read API (same signatures as before db.js)
   ========================================================= */
const getSkins = () => {
  if (DB_MODE && DB_READY) return (catCache || []).slice().sort((a, b) => a.sort - b.sort);
  if (DB_MODE) {
    const mirror = lsGet(K_CAT, null);
    if (Array.isArray(mirror)) return mirror;
    return [];
  }
  let custom = lsRawGet("skm_custom_skins", []);
  if (!Array.isArray(custom)) custom = [];
  custom = custom.map(normSkin);
  let deleted = lsRawGet("skm_deleted", []);
  if (!Array.isArray(deleted)) deleted = [];
  const base = SKINS.filter(s => !deleted.includes(s.name));
  return [...custom, ...base];
};
const findSkin = name => getSkins().find(s => s.name === name);

const getOrders = () => {
  const src = Array.isArray(ordersCache) ? ordersCache : [];
  const seen = new Set();
  const out = [];
  for (const o of src) {
    const k = String(o && o.id != null ? o.id : "__no-id__");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(normOrder(o));
  }
  return out;
};
const getUsers = () => (Array.isArray(usersCache) ? usersCache : []).filter(u => u.tg || u.id);
const getAnnouncement = () => normAnn(annCache);

/* site settings (hero image, …) — shared object key→value */
const getSetting = key => {
  key = String(key || "");
  if (setCache && Object.prototype.hasOwnProperty.call(setCache, key)) return setCache[key];
  return "";
};
const getHeroImg = () => getSetting("hero_img");
function saveSetting(key, value) {
  key = String(key || "");
  if (!key) return;
  setCache = setCache || {};
  setCache[key] = value == null ? "" : String(value);
  lsSet(K_SET, setCache);
  if (DB_MODE && DB_READY) dbWriteSetting(key, setCache[key]);
  dbNotify({ type: "settings" });
}
/* Only the admin panel persists settings to the DB — and only while an admin
   session is actually active. This keeps visitor pages (and the login page,
   where saving the internal secret / a reset happens before any session exists)
   from tripping site_settings RLS and alarming with a bogus "server error". */
async function dbWriteSetting(key, value) {
  if (typeof document === "undefined" || !document.querySelector(".admin__main")) return;
  let ok = false;
  try { ok = await dbEnsureSessionNow(); } catch { ok = false; }
  if (!ok) return;
  try { dbUpsert("site_settings", [{ key: String(key), value: String(value) }], "key"); } catch { /* ignore */ }
}
function saveHeroImg(dataUrl) {
  saveSetting("hero_img", dataUrl || "");
}

/* ---------- discount coupons (admin creates, one-user / single-use) ---------- */
const getCoupons = () => {
  if (DB_MODE && DB_READY) {
    const raw = getSetting("coupons");
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { /* ignore */ }
    return [];
  }
  const list = lsRawGet("skm_coupons", []);
  return Array.isArray(list) ? list : [];
};
const saveCoupons = list => {
  list = (Array.isArray(list) ? list : []).map(c => ({
    code: String((c && c.code) || "").trim().toUpperCase(),
    discount: Math.max(0, Math.min(99, Number(c && c.discount) || 0)),
    telegram: String((c && c.telegram) || "").trim(),
    used: !!(c && c.used),
    date: (c && c.date) || new Date().toISOString(),
  }));
  if (DB_MODE && DB_READY) saveSetting("coupons", JSON.stringify(list));
  else lsSet("skm_coupons", list);
  dbNotify({ type: "coupons" });
};
const normTg = v => String(v || "").trim().replace(/^[@+ ]/, "").toLowerCase();
const findCoupon = code => {
  const k = String(code || "").trim().toUpperCase();
  return getCoupons().find(c => String(c.code || "").trim().toUpperCase() === k);
};
const couponUsedInOrders = code => {
  const k = String(code || "").trim().toUpperCase();
  return (Array.isArray(ordersCache) ? ordersCache : []).some(o => {
    const direct = String(o.coupon || "").trim().toUpperCase();
    if (direct === k) return true;
    const marker = (Array.isArray(o.items) ? o.items : []).some(it => it && it.special === "coupon" && String(it.code || "").trim().toUpperCase() === k);
    return marker;
  });
};
const validateCoupon = (code, tg) => {
  const c = findCoupon(code);
  if (!c) return { error: "not-found" };
  if (c.used || couponUsedInOrders(c.code)) return { error: "used" };
  if (tg && c.telegram && normTg(c.telegram) !== normTg(tg)) return { error: "not-yours" };
  return { ok: true, coupon: c };
};

/* ---------- coupon single-use (server-side, cross-device) ----------
   "coupon_claims" is a tiny table: primary key = coupon code, so an
   anonymous shopper can INSERT the code once and no one else can claim
   it again — even while their order is still pending (pending orders are
   hidden by RLS, so orders alone can't enforce this). If the table was
   never created, every function returns null and the shop gracefully
   falls back to local/orders-based checks. */
async function dbIsCouponClaimed(code) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  try {
    const { data, error } = await supa.from("coupon_claims").select("coupon")
      .eq("coupon", String(code || "").trim().toUpperCase());
    if (error) {
      if (/does not exist|relation|PGRST205|schema cache|not find the table/i.test(String(error.message || ""))) return null;
      return null;
    }
    return !!(Array.isArray(data) && data.length);
  } catch (e) { return null; }
}
async function dbClaimCoupon(code, tg) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  try {
    const { error } = await supa.from("coupon_claims").insert(
      [{ coupon: String(code || "").trim().toUpperCase(), telegram: String(tg || "").trim() }],
      { onConflict: "coupon" }
    );
    if (!error) return { ok: true };
    if (/duplicate|unique|already exists/i.test(String(error.message || ""))) return { ok: false };
    if (/does not exist|relation|PGRST205|schema cache|not find the table/i.test(String(error.message || ""))) return null;
    return { ok: false, error: error.message };
  } catch (e) { return null; }
}
async function dbReleaseCoupon(code) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  try {
    const { error } = await supa.from("coupon_claims").delete()
      .eq("coupon", String(code || "").trim().toUpperCase());
    if (error) return error.message;
    return null;
  } catch (e) { return e.message || "err"; }
}

/* ---------- قرعه‌کشی / raffle (stored in site_settings["raffle"]) ----------
   only the authenticated admin can write it (RLS); everyone reads it.
   fields: title · entries[] · mode(random|manual) · winnerIndex · seq · rotation */
const RAFFLE_MAX_SECTIONS = 24;
function normRaffle(r) {
  r = r || {};
  let entries = Array.isArray(r.entries) ? r.entries : [];
  entries = entries.map(e => String(e == null ? "" : e).slice(0, 40)).slice(0, RAFFLE_MAX_SECTIONS);
  let winner = Math.trunc(Number(r.winnerIndex));
  if (!Number.isFinite(winner) || winner < 0 || winner >= entries.length) winner = -1;
  return {
    title: String(r.title || "").slice(0, 60),
    entries: entries,
    mode: r.mode === "manual" ? "manual" : "random",
    winnerIndex: winner,
    seq: Math.max(0, Math.trunc(Number(r.seq) || 0)),
    rotation: Number(r.rotation) || 0,
    enabled: r.enabled === false ? false : true,
    updatedAt: Number(r.updatedAt) || 0,
  };
}
const getRaffle = () => {
  const raw = getSetting("raffle");
  if (!raw) return normRaffle(null);
  try { return normRaffle(JSON.parse(raw)); } catch { return normRaffle(null); }
};
const saveRaffle = cfg => {
  const r = normRaffle(cfg);
  r.updatedAt = Date.now();
  saveSetting("raffle", JSON.stringify(r));
  return r;
};

/* inventory → map { telegram: [rows...] } + per-user helper */
const getInvMap = () => {
  const map = {};
  (Array.isArray(invRowsCache) ? invRowsCache : []).forEach(r => {
    const t = String(r.telegram || "");
    if (!t) return;
    (map[t] = map[t] || []).push(r);
  });
  Object.keys(map).forEach(t => map[t].sort((a, b) => b.id - a.id || new Date(b.created_at) - new Date(a.created_at)));
  return map;
};
const getInventoryFor = tg => (getInvMap()[String(tg || "")] || []).slice();

/* =========================================================
   Mutation API — updates cache + localStorage mirror, then
   pushes to Supabase in the background (DB_MODE only).
   ========================================================= */
function dbNotify(eventData) {
  document.dispatchEvent(new CustomEvent("zeus-db", { detail: eventData || {} }));
}
function dbReady(mode) {
  if (mode === "db") dbFlushOps();
  document.dispatchEvent(new CustomEvent("zeus-db-ready", { detail: { mode: mode || "local" } }));
  dbNotify({ type: "ready", mode: mode || "local" });
}

/* queue DB mutations until the connection actually becomes ready, so orders,
   users, inventory etc. still reach Supabase even when placed early/offline-ish */
let dbPendingOps = [];
function dbOnReady(fn) {
  if (typeof fn !== "function") return;
  if (DB_MODE && supabaseLib && supa && DB_READY) { try { fn(); } catch (e) { dbLog(e); } return; }
  if (DB_MODE) dbPendingOps.push(fn);
}
function dbFlushOps() {
  const ops = dbPendingOps; dbPendingOps = [];
  ops.forEach(f => { try { f(); } catch (e) { dbLog(e); } });
}

function saveCustom(list) {
  list = (Array.isArray(list) ? list : []).map(normSkin).filter(s => s.name);
  if (DB_MODE && DB_READY) {
    const prev = catCache || [];
    catCache = list.slice().sort((a, b) => a.sort - b.sort);
    lsSet(K_CAT, catCache);
    const gone = prev.filter(s => !list.some(n => n.name === s.name)).map(s => s.name);
    dbSyncCatalog(list, gone);
  } else {
    const deleted = lsRawGet("skm_deleted", []);
    lsSet("skm_custom_skins", list);
    /* in fallback, "skin deletion" is tracked separately */
    if (Array.isArray(deleted)) lsSet("skm_deleted", deleted);
  }
  dbNotify({ type: "catalog" });
}
function saveDel(list) {
  list = Array.isArray(list) ? list : [];
  if (DB_MODE && DB_READY) {
    if (!catCache) catCache = [];
    const next = catCache.filter(s => !list.includes(s.name));
    saveCustom(next);
    return;
  }
  const deleted = lsRawGet("skm_deleted", []);
  lsSet("skm_deleted", [...new Set([...(Array.isArray(deleted) ? deleted : []), ...list])]);
  dbNotify({ type: "catalog" });
}
const getCustom = () => {
  if (DB_MODE && DB_READY) return (catCache || []).slice();
  return lsRawGet("skm_custom_skins", []);
};
const getDel = () => {
  if (DB_MODE && DB_READY) return [];
  return lsRawGet("skm_deleted", []);
};

function saveOrders(list) {
  list = (Array.isArray(list) ? list : []).map(normOrder);
  ordersCache = list;
  lsSet(K_ORD, ordersCache);
  if (DB_MODE) dbOnReady(function () { dbSyncOrders(ordersCache); });
  dbNotify({ type: "orders" });
}
function addUser(tg) {
  tg = String(tg || "").trim();
  if (!tg) return;
  const id = Date.now();
  const next = usersCache.filter(u => u.tg !== tg);
  next.push({ id: id, tg: tg, date: new Date().toISOString() });
  usersCache = next;
  lsSet(K_USR, usersCache);
  /* insert-only: RLS lets anonymous users INSERT (DO NOTHING on duplicate);
     upsert would need UPDATE rights (admin-only) and fail on the shop page */
  if (DB_MODE) dbOnReady(function () {
    supa.from("users").insert([{ id: id, tg, date: new Date().toISOString() }], { ignoreDuplicates: true, onConflict: "tg" })
      .then(r => { if (r.error) dbLog(r.error); }).catch(dbLog);
  });
  dbNotify({ type: "users" });
}
function placeOrder(o) {
  const row = normOrder(o);
  ordersCache = [...(Array.isArray(ordersCache) ? ordersCache : []).filter(x => x.id !== row.id), row];
  lsSet(K_ORD, ordersCache);
  /* insert-only on the public shop: pending orders must reach the DB for the admin to approve */
  if (DB_MODE) dbOnReady(function () {
    const payBase = { id: row.id, telegram: row.telegram, items: row.items, total: row.total, status: row.status, date: row.date };
    const tryInsert = (payload, cb) => {
      supa.from("orders").insert([payload], { onConflict: "id" })
        .then(r => { if (r.error) cb(r.error); }).catch(cb);
    };
    /* final-attempt failure: the order exists ONLY in this browser, the admin
       will never see it — say so loudly (RLS checkout_allowed also rejects when
       the buyer already has 3 pending orders, and the panel can't guess that). */
    const orderInsertFailed = err => {
      dbLog(err);
      try {
        if (typeof showToast === "function") showToast(lang === "fa"
          ? "⚠️ سفارش به دیتابیس نرسید و ادمین آن را نمی‌بیند! کد پیگیری را برای ادمین در تلگرام بفرست."
          : "⚠️ Order did NOT reach the database — the admin cannot see it! Send your tracking code to the admin on Telegram.", true);
      } catch { /* ignore */ }
      dbNotify({ type: "orders" });
    };
    if (row.coupon) {
      tryInsert({ ...payBase, coupon: row.coupon }, err => {
        /* coupon column may be missing: retry without it and track the code as a marker item
           so single-use is still enforced through couponUsedInOrders.
           The first failure here is expected & retried — do NOT toast "server error" for it. */
        try { console.warn("ZEUSSHOP db: coupon insert retry:", err && err.message ? err.message : err); } catch { /* ignore */ }
        const items2 = [...(Array.isArray(row.items) ? row.items : []), { special: "coupon", code: String(row.coupon).toUpperCase() }];
        tryInsert({ ...payBase, items: items2 }, orderInsertFailed);
      });
    } else {
      tryInsert(payBase, orderInsertFailed);
    }
  });
  dbNotify({ type: "orders" });
}
function deleteOrder(id) {
  id = Number(id);
  if (!id) return;
  ordersCache = (Array.isArray(ordersCache) ? ordersCache : []).filter(x => x.id !== id);
  lsSet(K_ORD, ordersCache);
  /* delete-only: RLS lets authenticated admins DELETE ("orders admin delete") */
  if (DB_MODE) dbOnReady(function () {
    supa.from("orders").delete().eq("id", id)
      .then(r => { if (r.error) dbLog(r.error); }).catch(dbLog);
  });
  dbNotify({ type: "orders" });
}
function deleteOrderItem(ordId, itemIdx) {
  ordId = Number(ordId);
  itemIdx = Number(itemIdx);
  if (!ordId || !Number.isInteger(itemIdx) || itemIdx < 0) return;
  const list = (Array.isArray(ordersCache) ? ordersCache : []).slice();
  const o = list.find(x => x.id === ordId);
  if (!o) return;
  const items = Array.isArray(o.items) ? o.items.slice() : [];
  if (itemIdx >= items.length) return;
  items.splice(itemIdx, 1);
  o.items = items;
  o.total = items.reduce((s, it) => s + (Number(it && it.price) || 0), 0);
  ordersCache = list;
  lsSet(K_ORD, ordersCache);
  if (DB_MODE) dbOnReady(function () {
    supa.from("orders").update({ items: o.items, total: o.total }).eq("id", ordId)
      .then(r => { if (r.error) dbLog(r.error); }).catch(dbLog);
  });
  dbNotify({ type: "orders" });
}
function addToInventory(tg, items) {
  tg = String(tg || "").trim();
  if (!tg || !Array.isArray(items) || !items.length) return;
  const entries = items.filter(it => it && !it.special).map(it => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    telegram: tg, name: it.name, price: Number(it.price) || 0,
    img: it.img || "", weapon: it.weapon || "", wear: it.wear || "",
    rarity: it.rarity || "", type: it.type || "",
    created_at: new Date().toISOString(),
  }));
  invRowsCache = entries.concat(invRowsCache);
  lsSet(K_INV, invRowsCache);
  if (DB_MODE) dbOnReady(function () {
    const mapped = entries.map(e => ({ telegram: tg, name: e.name, price: e.price, img: e.img, weapon: e.weapon, wear: e.wear, rarity: e.rarity, type: e.type, created_at: e.created_at }));
    supa.from("inventory").insert(mapped).then(r => { if (r.error) dbLog(r.error); }).catch(e => dbLog(e));
  });
  dbNotify({ type: "inventory" });
}
function saveAnnouncement(a) {
  annCache = normAnn(a);
  lsSet(K_ANN, annCache);
  if (DB_MODE) dbOnReady(function () {
    dbEnsureSessionNow().then(ok => {
      if (ok) dbUpsert("announcement", [{ id: 1, enabled: annCache.enabled, text: annCache.text }], "id");
    });
  });
  dbNotify({ type: "announcement" });
}

/* ---------- admin panel credentials ----------
   Default: admin / 1234. Stored in site_settings (changeable from the panel)
   and mirrored to localStorage so the same login works before/without the DB.
   Only this username+password opens the panel. */
const getAdminCreds = () => {
  /* stored creds only count when deliberately saved from the panel;
     otherwise legacy/stale values must not block the default admin/1234 */
  const changed = lsRawGet("skm_creds_changed", "") === "1" ||
    (typeof getSetting === "function" && getSetting("skm_creds_changed") === "1");
  if (changed) {
    const su = typeof getSetting === "function" ? getSetting("admin_user") : "";
    const sp = typeof getSetting === "function" ? getSetting("admin_pass") : "";
    if (su && sp) return { user: su, pass: sp };
    const lu = lsRawGet("skm_admin_user", null);
    const lp = lsRawGet("skm_admin_pass", null);
    if (lu && lp) return { user: lu, pass: lp };
  }
  return { user: "admin", pass: "1234" };
};
const saveAdminCreds = (u, p) => {
  u = String(u || "admin");
  p = String(p || "1234");
  lsSet("skm_creds_changed", "1");
  if (typeof saveSetting === "function") {
    saveSetting("admin_user", u);
    saveSetting("admin_pass", p);
    saveSetting("skm_creds_changed", "1");
  }
  lsSet("skm_admin_user", u);
  lsSet("skm_admin_pass", p);
};
/* forgotten creds → back to the default admin / 1234 (local + DB-mirrored flag) */
const resetAdminCreds = () => {
  try { localStorage.removeItem("skm_creds_changed"); } catch { /* ignore */ }
  try { localStorage.removeItem("skm_admin_user"); } catch { /* ignore */ }
  try { localStorage.removeItem("skm_admin_pass"); } catch { /* ignore */ }
  if (typeof saveSetting === "function") saveSetting("skm_creds_changed", "0");
};

/* =========================================================
   Supabase sync layer (internals)
   ========================================================= */
let dbToastT = 0;
function dbLog(err) {
  DB_ERROR = err;
  const msg = (err && err.message) ? String(err.message) : String(err || "");
  console.error("ZEUSSHOP db:", msg);
  if (typeof showToast === "function" && document.body) {
    const now = Date.now();
    if (now - dbToastT > 2500) {   /* don't spam the same toast on every subscriber */
      dbToastT = now;
      try {
        const shortMsg = msg.length > 96 ? msg.slice(0, 93) + "…" : msg;
        showToast(lang === "fa"
          ? "خطا در ارتباط با سرور — تغییرات ذخیره نشد." + (shortMsg ? " («" + shortMsg + "»)" : "")
          : "Cannot reach server — changes not saved." + (shortMsg ? " («" + shortMsg + "»)" : ""), true);
      } catch { /* ignore */ }
    }
  }
  dbNotify({ type: "error" });
}

function dbUpsert(table, rows, conflict) {
  if (!rows || !rows.length) return Promise.resolve();
  return supa.from(table).upsert(rows, conflict ? { onConflict: conflict } : {})
    .then(r => { if (r.error) dbLog(r.error); return r; })
    .catch(dbLog);
}

function dbSyncCatalog(list, goneNames) {
  if (!DB_READY || !supa) return;
  const rows = list.map(s => ({
    name: s.name, img: s.img, weapon: s.weapon, wear: s.wear,
    rarity: s.rarity, type: s.type, price: s.price, discount: s.discount, sort: s.sort || 0,
    delivery_mode: s.delivery_mode === "days" ? "days" : "immediate",
    delivery_days: Math.max(0, Math.min(30, Math.round(Number(s.delivery_days) || 0))),
  }));
  const gone = Array.isArray(goneNames) ? goneNames : [];
  deltaDb("skins", rows, gone);
}
function deltaDb(table, rows, gone) {
  if (!supa) return;
  const chain = (gone.length)
    ? supa.from(table).delete().in("name", gone).then(r => { if (r.error) dbLog(r.error); return r; }).catch(dbLog)
    : Promise.resolve();
  if (rows.length) chain.then(() => dbUpsert(table, rows, "name"));
}

function dbSyncOrders(list) {
  if (!DB_READY || !supa) return;
  const rows = list.map(o => ({
    id: o.id, telegram: o.telegram, items: o.items, total: o.total,
    status: o.status, coupon: o.coupon || "", date: o.date || new Date().toISOString(),
  }));
  if (!rows.length) return;
  dbUpsert("orders", rows, "id").then(r => {
    if (r && r.error) return;
    const have = new Set(list.map(o => o.id));
    const gone = (ordersCache || []).filter(o => !have.has(o.id));
    /* (kept simple: order rows are never removed in this app) */
  });
}

/* ----------------------------------------------------------
   Awaited, VERIFIED writes — the admin panel uses these for
   approve / reject / delete so an RLS block can't silently
   succeed (returns an error string when no rows were affected).
   Status changes use a plain UPDATE (only the "orders admin
   change" policy + is_admin), NOT an upsert — an upsert also
   needs the public anti-spam INSERT check (checkout_allowed)
   and can fail with no-rows-affected even when every policy
   exists. If the row is missing, falls back to an insert.
   ---------------------------------------------------------- */
async function dbSaveOrderDirect(o) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  if (!(await dbEnsureSessionNow())) return "not-signed-in";
  const base = {
    id: Number(o.id) || 0, telegram: String(o.telegram || ""),
    items: Array.isArray(o.items) ? o.items : [],
    total: Number(o.total) || 0, status: String(o.status || "pending"),
    date: o.date ? new Date(o.date).toISOString() : new Date().toISOString(),
  };
  const coupon = String(o.coupon || "").trim().toUpperCase();
  const row = coupon ? { ...base, coupon } : base;
  try {
    /* 1) plain UPDATE (existing row, admin-only) */
    const u = await supa.from("orders").update(row).eq("id", Number(o.id) || 0);
    if (u.error) return (u.error && u.error.message) || "err";
    if (u.data && u.data.length > 0) return null;
    /* 2) row missing → try an insert (guarded policy applies) */
    const ins = await supa.from("orders").insert([row])
      .then(r => r.error ? (r.error.message || "err") : (r.data && r.data.length > 0 ? null : "no-rows-affected"))
      .catch(e => (e && e.message) || "err");
    if (ins && coupon && /coupon/i.test(ins)) {
      const again = await supa.from("orders").insert([base])
        .then(r => r.error ? (r.error.message || "err") : (r.data && r.data.length > 0 ? null : "no-rows-affected"))
        .catch(e => (e && e.message) || "err");
      return again;
    }
    return ins;
  } catch (e) { return (e && e.message) || "err"; }
}
/* anti-spam server-side gate (RPC installed by supabase-setup.sql part 7).
   Returns { ok: false, reason } when the insert policy would reject; returns
   { ok: true } when allowed or when the RPC isn't installed yet (graceful). */
async function dbCheckoutAllowed(tg) {
  if (!DB_MODE || !supa || !DB_READY || !tg) return { ok: true };
  try {
    const { data, error } = await supa.rpc("checkout_allowed", { tg: String(tg).trim() });
    if (error) return { ok: true, probe: error.message };         /* RPC missing → no server gate */
    return data === true ? { ok: true } : { ok: false, reason: "limit" };
  } catch (e) { return { ok: true, probe: (e && e.message) || "err" }; }
}
async function dbDeleteOrderDirect(id) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  if (!(await dbEnsureSessionNow())) return "not-signed-in";
  try {
    const { data, error } = await supa.from("orders").delete().eq("id", Number(id) || 0);
    if (error) return error.message;
    if (!data || !data.length) return "no-rows-affected";
    return null;
  } catch (e) { return e.message || "err"; }
}
async function dbAddInventoryDirect(tg, items) {
  if (!DB_MODE || !supa || !DB_READY) return null;
  tg = String(tg || "").trim();
  if (!tg || !Array.isArray(items) || !items.length) return null;
  if (!(await dbEnsureSessionNow())) return "not-signed-in";
  try {
    const mapped = items.filter(it => it && !it.special).map(it => ({
      telegram: tg, name: String(it && it.name || ""), price: Number(it && it.price) || 0,
      img: String(it && it.img || ""), weapon: String(it && it.weapon || ""),
      wear: String(it && it.wear || ""), rarity: String(it && it.rarity || ""),
      type: String(it && it.type || ""), created_at: new Date().toISOString(),
    }));
    const { data, error } = await supa.from("inventory").insert(mapped);
    if (error) return error.message;
    if (!data || !Array.isArray(data) || data.length === 0) return "no-rows-affected";
    return null;
  } catch (e) { return e.message || "err"; }
}

/* =========================================================
   Init — connect, load everything, broadcast "zeus-db-ready"
   ========================================================= */
async function dbInit() {
  if (!DB_MODE) {
    heavyReady = true;
    DB_READY = true;
    dbReady("local");
    return false;
  }
  if (!Array.isArray(catCache)) catCache = lsGet(K_CAT, []);
  try {
    supa = supabaseLib.createClient(DB_URL, DB_KEY);
    /* orders/inventory start loading right away, in parallel with the critical
       tables — the "latest purchases" ticker then appears as fast as possible
       instead of waiting for the critical load to finish first */
    dbInitHeavy();
    /* critical / small tables first — the shop can render and the
       announcement can show as soon as these are in cache */
    const crit = await Promise.all([
      fetchRows("skins"),
      fetchRows("announcement"),
      fetchRows("site_settings"),
    ]);
    const [e1, d1] = crit[0];
    const [e5, d5] = crit[1];
    const [e6, d6] = crit[2];

    if (e1 || e5) {
      /* skins / announcement table(s) missing — stay in fallback mode */
      console.warn("ZEUSSHOP db: tables not ready yet — using local mode.", e1 || e5);
      supa = null;
      heavyReady = true;
      DB_READY = true;
      dbReady("local");
      return false;
    }

    catCache    = (d1 || []).map(normSkin).sort((a, b) => a.sort - b.sort);
    annCache    = d5 && d5[0] ? normAnn(d5[0]) : { id: 1, enabled: false, text: "" };
    setCache    = {};
    (Array.isArray(d6) ? d6 : []).forEach(r => { if (r && r.key) setCache[r.key] = r.value; });

    lsSet(K_CAT, catCache);
    lsSet(K_ANN, annCache);
    lsSet(K_SET, setCache);

    DB_READY = true;
    dbRealtime();
    dbReady("db");
    dbStartPolling();
    return true;
  } catch (err) {
    console.warn("ZEUSSHOP db: init failed — local mode.", err);
    supa = null;
    heavyReady = true;
    DB_READY = true;
    dbReady("local");
    return false;
  }
}

/* heavy/large tables (orders · users · inventory) load in the background so
   they never delay the page; every table notifies the UI as soon as it lands */
async function dbInitHeavy() {
  if (!DB_MODE || !supa || dbHeavyStarted) return;
  dbHeavyStarted = true;
  try {
    /* THE PANEL MUST READ ORDERS AS THE ADMIN. RLS hides every pending order from
       an anonymous session ("orders public read approved"), so the very first
       fetch used to come back with nothing to approve. Sign in first (resolves
       fast when a Supabase session already exists), then start the fetches. */
    if (IS_ADMIN_PAGE) {
      const ensureP = dbEnsureSessionNow().catch(() => false);
      const raced = await Promise.race([
        ensureP,
        new Promise(r => setTimeout(() => r(undefined), 6000)),
      ]);
      if (raced === true) {
        dbRestartRealtime();          /* channel now knows we're the admin */
      } else if (raced === undefined) {
        ensureP.then(ok => { if (ok === true) dbRestartRealtime(); });
      }
    }
    /* notify each table the moment IT lands — the "latest purchases" ticker only
       needs orders, so it must not wait for slower tables (inventory/users) */
    const ordP = fetchRows("orders");
    const invP = fetchRows("inventory");
    const usrP = IS_ADMIN_PAGE ? fetchRows("users") : null;
    const countP = (userCountCache === null || userCountCache === 0) ? fetchUserCount() : null;
    let e2 = null, e3 = null, e4 = null;
    ordP.then(r => { const e = r[0], d = r[1]; e2 = e; if (!e && Array.isArray(d)) { ordersCache = d.map(normOrder); lsSet(K_ORD, ordersCache); dbNotify({ type: "orders" }); } });
    invP.then(r => { const e = r[0], d = r[1]; e3 = e; if (!e && Array.isArray(d)) { invRowsCache = d.map(normInv); lsSet(K_INV, invRowsCache); dbNotify({ type: "inventory" }); } });
    if (usrP) usrP.then(r => { const e = r[0], d = r[1]; e4 = e; if (!e && Array.isArray(d)) { usersCache = d.map(normUser); lsSet(K_USR, usersCache); userCountCache = usersCache.length; } });
    if (countP) {
      const c = await countP;
      if (c !== null && Number.isFinite(Number(c))) userCountCache = Number(c);
    }
    await ordP;
    await invP;
    if (usrP) await usrP;
    if (e2 || e3 || e4) console.warn("ZEUSSHOP db: some heavy tables failed — applying the ones that loaded.", e2 || e3 || e4);
    dbNotify({ type: "users" });
    heavyReady = true;
  } catch (err) {
    console.warn("ZEUSSHOP db: heavy load failed — keeping local mirrors.", err);
    heavyReady = true;
    dbNotify({ type: "inventory" });
  }
}

const FETCH_TIMEOUT = 6000;
/* heavy tables (orders carry base64 receipt photos → big payloads) get a longer
   window: a timeout here means the admin list simply stays empty */
const HEAVY_FETCH_TIMEOUT = 15000;

/* ---------- change detection ----------
   cheap signatures protect pages from re-rendering (and images/requests
   from reloading) when a poll returns data identical to what we already
   have. Images are hashed by length + first/last chars only — huge base64
   strings are never scanned. */
const sigCache = {};
function hashStr(s) {
  let h = 5381;
  s = String(s == null ? "" : s);
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  return h;
}
function rowsSig(rows, table) {
  const arr = Array.isArray(rows) ? rows : [];
  if (table === "announcement") {
    const r = arr[0];
    return hashStr(r ? ((r.enabled ? "1" : "0") + "|" + (r.text || "")) : "0|");
  }
  let h = 1;
  for (const r of arr) {
    if (table === "skins") {
      const i = String(r && r.img || "");
      h = (h * 31 + hashStr((r && r.name || "") + "|" + (r && r.price || 0) + "|" + (r && r.discount || 0) + "|" + (r && r.sort || 0) + "|" + (r && r.delivery_mode || "") + "|" + (r && r.delivery_days || 0) + "|" + i.length + "|" + i.slice(0, 20) + "|" + i.slice(-20))) >>> 0;
    } else if (table === "orders") {
      const its = Array.isArray(r && r.items) ? r.items : [];
      h = (h * 31 + hashStr((r && r.id || 0) + "|" + (r && r.status || "") + "|" + (r && r.telegram || "") + "|" + (r && r.total || 0) + "|" + (r && r.date || "") + "|" + its.length + "|" + its.map(it => (it && it.name || "") + ":" + (it && it.price || 0)).join(","))) >>> 0;
    } else if (table === "inventory") {
      const i = String(r && r.img || "");
      h = (h * 31 + hashStr((r && r.id || 0) + "|" + (r && r.telegram || "") + "|" + (r && r.name || "") + "|" + (r && r.price || 0) + "|" + i.length + "|" + i.slice(0, 20) + "|" + i.slice(-20))) >>> 0;
    } else if (table === "users") {
      h = (h * 31 + hashStr((r && r.id || 0) + "|" + (r && r.tg || ""))) >>> 0;
    } else {
      h = (h * 31 + hashStr((r && r.key || "") + "|" + String(r && r.value || "").length + "|" + String(r && r.value || "").slice(0, 200))) >>> 0;
    }
  }
  return arr.length + "|" + h;
}
function dataChanged(table, rows, honorKey) {
  const s = rowsSig(rows, table);
  const k = honorKey || table;
  if (sigCache[k] === s) return false;
  sigCache[k] = s;
  return true;
}

const ORDER_DESC_TABLES = { orders: "id", inventory: "id", users: "id" };
function fetchRows(table) {
  return new Promise(resolve => {
    let done = false;
    const fin = (err, data) => { if (!done) { done = true; resolve([err, data || []]); } };
    const timer = setTimeout(() => fin(new Error("timeout: " + table)), ORDER_DESC_TABLES[table] ? HEAVY_FETCH_TIMEOUT : FETCH_TIMEOUT);
    /* newest-first: with a full 1000-row window an unordered read can simply miss
       the brand-new pending order the admin is waiting for */
    let q = supa.from(table).select("*").limit(1000);
    if (ORDER_DESC_TABLES[table]) {
      try { q = q.order(ORDER_DESC_TABLES[table], { ascending: false }); } catch { /* ignore */ }
    }
    q.then(r => { clearTimeout(timer); fin(r.error, r.data); })
      .catch(e => { clearTimeout(timer); fin(e, null); });
  });
}

/* live updates: when anyone changes skins/orders, auto rebuild locals */
let realtimeChannel = null;
let realtimeSeq = 0;
/* Realtime applies RLS too: a channel opened before the admin signs in only ever
   receives events for publicly readable rows (approved orders). Rebuild it once
   the admin session exists so pending INSERT/UPDATE events actually arrive. */
function dbRestartRealtime() {
  if (!supa) return;
  if (realtimeChannel) { try { supa.removeChannel(realtimeChannel); } catch { /* ignore */ } realtimeChannel = null; }
  dbRealtime();
}
function dbRealtime() {
  if (!supa) return;
  const ch = supa.channel("zeus-live-" + (++realtimeSeq))
    .on("postgres_changes", { event: "*", schema: "public", table: "skins" }, () => { realtimeSeen = true; reloadTable("skins"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "announcement" }, () => { realtimeSeen = true; reloadTable("announcement"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { realtimeSeen = true; reloadTable("orders"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => { realtimeSeen = true; reloadTable("site_settings"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => { realtimeSeen = true; reloadTable("users"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => { realtimeSeen = true; reloadTable("inventory"); });
  try { ch.subscribe(); } catch { /* ignore */ }
  realtimeChannel = ch;
}
function reloadTable(table) {
  if (!supa || !DB_READY) return;
  fetchRows(table).then(([err, data]) => {
    if (err) return;
    const rows = data || [];
    if (!dataChanged(table, rows)) return;
    if (table === "skins") { catCache = rows.map(normSkin); lsSet(K_CAT, catCache); dbNotify({ type: "catalog" }); }
    if (table === "announcement") { annCache = rows[0] ? normAnn(rows[0]) : normAnn(null); lsSet(K_ANN, annCache); dbNotify({ type: "announcement" }); }
    if (table === "orders") { ordersCache = rows.map(normOrder); lsSet(K_ORD, ordersCache); dbNotify({ type: "orders" }); }
    if (table === "users" && IS_ADMIN_PAGE) { usersCache = rows.map(normUser); userCountCache = usersCache.length; lsSet(K_USR, usersCache); dbNotify({ type: "users" }); }
    if (table === "inventory") { invRowsCache = rows.map(normInv); lsSet(K_INV, invRowsCache); dbNotify({ type: "inventory" }); }
    if (table === "site_settings") {
      setCache = {};
      rows.forEach(r => { if (r && r.key) setCache[r.key] = r.value; });
      lsSet(K_SET, setCache);
      dbNotify({ type: "settings" });
    }
  });
}

/* re-read site_settings (polling fallback for when Realtime is off) */
async function refreshSettings() {
  let rows = null;
  if (DB_MODE && DB_READY && supa) {
    const [err, data] = await fetchRows("site_settings");
    if (err) return false;
    rows = data || [];
  } else {
    const s = lsRawGet(K_SET, null);
    rows = (s && typeof s === "object" && !Array.isArray(s)) ? Object.keys(s).map(k => ({ key: k, value: s[k] })) : [];
  }
  if (!dataChanged("site_settings", rows, "settings")) return false;
  const next = {};
  rows.forEach(r => { if (r && r.key) next[r.key] = r.value; });
  setCache = next;
  lsSet(K_SET, setCache);
  dbNotify({ type: "settings" });
  return true;
}

/* lightweight polling so the shop stays live even when Supabase Realtime is not published.
   Adaptive: when a Realtime message has arrived (channel works) the scans slow way down and
   act as a safety net only. The admin panel polls orders fast so new purchases appear quickly. */
let dbPollTimer = null;
function dbStartPolling() {
  if (dbPollTimer) return;
  const isAdmin = IS_ADMIN_PAGE;
  const fast = () => {
    if (!supa || !DB_READY) return;
    reloadTable("skins");
    reloadTable("announcement");
    refreshSettings();
  };
  const heavy = () => {
    if (!supa || !DB_READY) return;
    reloadTable("inventory");
    /* the full users table is admin-only (RLS) — only fetch it in the panel */
    if (isAdmin) reloadTable("users");
  };
  /* orders get their own loop: in the panel they are polled FAST on purpose.
     Realtime can't be trusted for pending rows (it applies RLS, and the channel
     may predate the admin sign-in), so the admin must never wait 45s+ for a new
     purchase to show up. On the shop page the normal adaptive cadence applies. */
  const orders = () => {
    if (!supa || !DB_READY) return;
    reloadTable("orders");
  };
  const counts = () => {
    if (!supa || !DB_READY) return;
    fetchUserCount().then(c => {
      if (c !== null && Number.isFinite(Number(c)) && Number(c) !== userCountCache) {
        userCountCache = Number(c);
        dbNotify({ type: "users" });
      }
    });
  };
  const fastMs = () => hasRealtime() ? 60000 : (isAdmin ? 15000 : 20000);
  const heavyMs = () => hasRealtime() ? 45000 : (isAdmin ? 6000 : 12000);
  const ordersMs = () => (isAdmin ? 4000 : (hasRealtime() ? 45000 : 12000));
  const countMs = () => hasRealtime() ? 90000 : 30000;
  const loop = (fn, ms) => { fn(); setTimeout(() => loop(fn, ms), ms()); };
  fast();
  orders();
  heavy();
  counts();
  loop(fast, fastMs);
  loop(orders, ordersMs);
  loop(heavy, heavyMs);
  loop(counts, countMs);
  dbPollTimer = true;
}

/* =========================================================
   Auth (Supabase Email/Password) — admin only
   ========================================================= */
const getSupa = () => supa;
const isDbMode = () => DB_MODE && DB_READY && !!supa;

/* bare username support: "zeus"  ->  "zeus@zeusshop.app".
   Usernames may contain Persian / special characters — the Supabase account email is
   always derived from a safe ASCII slug so it stays a valid address regardless. */
const ADMIN_DOMAIN = "zeusshop.app";
const normalizeAdminLogin = val => {
  const v = String(val || "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("@")) {
    /* already an email — accept only a well-formed address */
    const m = v.match(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/);
    return m ? m[0] : "";
  }
  const slug = v.replace(/[^a-z0-9._-]+/g, "").replace(/^[^a-z0-9]+/, "").replace(/[._-]{2,}/g, ".");
  return ((slug || "admin") + "@" + ADMIN_DOMAIN).toLowerCase();
};

async function dbAdminLogin(email, password) {
  if (!DB_MODE || !supa) return { error: "no-db" };
  try {
    const { error } = await supa.auth.signInWithPassword({ email: normalizeAdminLogin(email), password: String(password) });
    if (error) return { error: error.message };
    try { await supa.rpc("admin_self_register"); } catch { /* ignore */ }
    return { ok: true };
  } catch (e) { return { error: e.message || "err" }; }
}

/* Panel login is a simple username/password (default admin/1234). In DB mode we
   also need a Supabase admin session so order approval / settings writes pass RLS.
   Supabase requires a 6+ char account password, while the panel password can be
   short (1234) — so the Supabase account is kept on its own internal strong secret
   (managed here, mirrored to settings+localStorage). It is auto-created on first
   login and reused afterwards. */
const getSupabaseSecret = () => {
  let s = lsRawGet("skm_supa_secret", "");
  if (!s && typeof getSetting === "function") s = getSetting("admin_dbpass");
  if (s) return s;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  s = "zx_" + out;
  lsSet("skm_supa_secret", s);
  if (typeof saveSetting === "function") saveSetting("admin_dbpass", s);
  return s;
};
/* One guard for every admin write: if the Supabase session lapsed, re-establish it
   from the panel credentials the admin set in settings — so a valid panel login alone
   is enough for everything to persist ("full access"). Only admin-panel functions call
   this (visitor flows are never routed through it), so it can't mint admins casually. */
let dbSessionLock = null;
async function dbEnsureSessionNow() {
  if (!DB_MODE || !supa) return false;
  try {
    const { data, error } = await supa.auth.getUser();
    if (!error && data && data.user) return true;
  } catch { /* fallthrough to sign-in */ }
  if (dbSessionLock) { try { return await dbSessionLock; } catch { return false; } }
  dbSessionLock = (async () => {
    try {
      const creds = (typeof getAdminCreds === "function") ? getAdminCreds() : { user: "admin", pass: "1234" };
      const r = await dbEnsureAdminAuth(String(creds.user || "admin"), String(creds.pass || ""));
      return !!(r && r.ok);
    } catch { return false; }
  })();
  try { return await dbSessionLock; } finally { dbSessionLock = null; }
}
/* Auth attempts are throttled & cached: Supabase rate-limits signup/signin per hour
   ("email rate limit exceeded"), so we never blast it with duplicate attempts from
   panel-load + settings-saves + write-guards. A detected rate-limit also locks further
   network attempts for an hour instead of hammering the provider. */
let dbAuthInflight = null;
let dbAuthCacheT = 0;
let dbAuthCacheRes = null;
let dbAuthLockedUntil = 0;
/* Only an explicit "login" submit may auto-CREATE the admin account (signUp sends a
   confirmation email when "Confirm email" is ON, which burns Supabase's email quota and
   trips rate limits). Background flows — panel auto-ensure, write guards — only sign IN. */
let dbAllowSignUp = false;
const dbSetAllowSignUp = v => { dbAllowSignUp = !!v; };
async function dbEnsureAdminAuth(user, pass) {
  if (!DB_MODE || !supa) return { ok: false, error: "no-db" };
  if (Date.now() < dbAuthLockedUntil) return { ok: false, error: "rate-limit", message: "email rate limit exceeded" };
  const email = normalizeAdminLogin(user);
  if (!email) return { ok: false, error: "bad-username", message: "invalid username for db account" };
  if (dbAuthInflight) return dbAuthInflight;
  if (Date.now() - dbAuthCacheT < 5000 && dbAuthCacheRes) return dbAuthCacheRes;
  dbAuthCacheT = Date.now();
  dbAuthInflight = (async () => {
    const secret = getSupabaseSecret();
    const isBad = err => /invalid|wrong|credentials|not found|rate limit|too many/i.test(String(err || ""));
    const isRate = err => /rate limit|too many requests|\b429\b/i.test(String(err || ""));
    const lockIfRate = err => { if (isRate(err)) dbAuthLockedUntil = Date.now() + 60 * 60 * 1000; };
    let res;
    const r1 = await supa.auth.signInWithPassword({ email: email, password: secret });
    if (!r1.error) {
      try { await supa.rpc("admin_self_register"); } catch { /* ignore */ }
      res = { ok: true };
    } else if (isRate(r1.error.message)) {
      res = { ok: false, error: "rate-limit", message: r1.error.message };
      lockIfRate(r1.error.message);
    } else if (!isBad(r1.error.message)) {
      res = { ok: false, error: "signin", message: r1.error.message };
    } else {
      /* no account under the internal secret yet — first try the panel password so
         accounts created by earlier versions keep working, then auto-create */
      let okR = null;
      if (String(pass || "")) {
        const r2 = await supa.auth.signInWithPassword({ email: email, password: String(pass) });
        if (!r2.error) {
          try { await supa.rpc("admin_self_register"); } catch { /* ignore */ }
          okR = { ok: true };
        } else {
          lockIfRate(r2.error.message);
          if (isRate(r2.error.message)) res = { ok: false, error: "rate-limit", message: r2.error.message };
        }
      }
      if (okR) {
        res = okR;
      } else if (!res) {
        /* auto-creating the account only happens on an EXPLICIT login submit —
           background flows must never fire signUp (it sends emails and trips
           Supabase's rate limiter) */
        if (!dbAllowSignUp) {
          res = { ok: false, error: "no-account", message: "account not found — sign in with the database email/password" };
        } else {
          const signUpR = await supa.auth.signUp({ email: email, password: String(pass || secret), options: { emailRedirectTo: location.origin } })
            .catch(e => ({ error: e }));
          if (signUpR.error) {
            lockIfRate(signUpR.error.message);
            if (isRate(signUpR.error.message)) res = { ok: false, error: "rate-limit", message: signUpR.error.message };
            else if (/already|exists|registered/i.test(String(signUpR.error.message || ""))) res = { ok: false, error: "conflict", message: signUpR.error.message };
            else res = { ok: false, error: "signup", message: signUpR.error.message };
          } else if (signUpR.data && signUpR.data.session) {
            const reg = await supa.rpc("admin_self_register");
            res = reg.error
              ? { ok: false, error: "register", message: (reg.error && reg.error.message) || "err" }
              : { ok: true };
          } else {
            res = { ok: false, error: "confirm-email" };
          }
        }
      }
    }
    dbAuthCacheRes = res;
    return res;
  })().catch(e => {
    dbAuthLockedUntil = 0;
    return { ok: false, error: "err", message: (e && e.message) || "err" };
  }).finally(() => { dbAuthInflight = null; });
  return dbAuthInflight;
}

/* change admin username(email)/password on the Supabase Auth account */
async function dbAdminChangeCreds(name, password) {
  if (!DB_MODE || !supa) return { error: "no-db" };
  const email = normalizeAdminLogin(name);
  if (!email || email.length < 4) return { error: "bad-username" };
  if (!(await dbEnsureSessionNow())) return { error: "not-signed-in" };
  const s = await dbAdminSession();
  if (!s || !s.user) return { error: "not-signed-in" };
  const curEmail = String(s.user.email || "").toLowerCase();
  const updates = {};
  let emailChanged = false;
  if (email.toLowerCase() !== curEmail) { updates.email = email; emailChanged = true; }
  const p = String(password || "");
  /* Supabase accounts need 6+ char passwords; a shorter panel password only
     updates the panel login (the DB session keeps running on the internal secret) */
  const shortPassword = (p && p.length < 6) ? p : "";
  if (p && p.length >= 6) updates.password = p;
  try {
    const { error } = await supa.auth.updateUser(updates);
    if (error) return { error: error.message };
    return { ok: true, emailChanged, email, shortPassword: !!shortPassword };
  } catch (e) { return { error: e.message || "err" }; }
}
async function dbAdminSession() {
  if (!DB_MODE || !supa) return null;
  try {
    const { data } = await supa.auth.getSession();
    return (data && data.session) ? data.session : null;
  } catch { return null; }
}
async function dbAdminLogout() {
  if (supa) { try { await supa.auth.signOut(); } catch { /* ignore */ } }
}

/* delete a user + their inventory rows + orders (admin action; RLS checks is_admin) */
async function removeUser(tg) {
  if (!tg) return "no-tg";
  try {
    if (DB_MODE && DB_READY && supa) {
      if (!(await dbEnsureSessionNow())) return "not-signed-in";
      const r1 = await supa.from("users").delete().eq("tg", tg);
      if (r1.error) return r1.error.message;
      await supa.from("inventory").delete().eq("telegram", tg);
      await supa.from("orders").delete().eq("telegram", tg);
    }
    usersCache   = usersCache.filter(u => String(u.tg || u.id || "") !== String(tg));
    invRowsCache = invRowsCache.filter(r => String(r.telegram || "") !== String(tg));
    ordersCache  = ordersCache.filter(o => String(o.telegram || "") !== String(tg));
    if (Number.isFinite(userCountCache) && userCountCache !== null) userCountCache = Math.max(0, userCountCache - 1);
    lsSet(K_USR, usersCache);
    lsSet(K_INV, invRowsCache);
    lsSet(K_ORD, ordersCache);
    dbNotify({ type: "users" });
    dbNotify({ type: "inventory" });
    dbNotify({ type: "orders" });
    return null;
  } catch (e) { return e.message || "err"; }
}

/* wipe legacy localStorage keys only (current DB mirrors are kept as offline cache) */
try {
  ["skm_custom_skins", "skm_deleted", "skm_orders", "skm_inventory", "skm_users", "skm_ann", "skm_hero"]
    .forEach(k => localStorage.removeItem(k));
} catch { /* ignore */ }
setCache = {}; annCache = null; invRowsCache = []; usersCache = [];

/* fire on load */
if (DB_MODE && supabaseLib) {
  dbInit().then(() => dbInitHeavy());
} else {
  DB_READY = true;
  dbReady("local");
}