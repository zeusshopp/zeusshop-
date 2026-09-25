/* =========================================================
   ZEUSSHOP — CS2 Skin Marketplace (shared frontend logic)
   bilingual FA/EN · filters · cart · telegram ·
   safe to run on shop AND admin pages
   ========================================================= */

const $id = id => document.getElementById(id);
const escT = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tgUsername = val => {
  val = String(val || "").trim();
  if (!val || val.startsWith("+")) return "";
  const m = val.match(/(?:t\.me\/|https?:\/\/)?@?([A-Za-z][A-Za-z0-9_]{3,31})/);
  return m ? m[1] : "";
};

/* --- open panel when the URL ends with #kmk --- */
function adminFromHash() {
  const onLogin = !!$id("loginForm");
  const onPanel = !!document.querySelector(".admin__main");
  if (location.hash === "#kmk" && !onLogin && !onPanel) {
    location.replace("admin.html");
  }
}
adminFromHash();
window.addEventListener("hashchange", adminFromHash);

/* ---------- زبان / i18n ---------- */
const I18N = {
  fa: {
    navMarket: "مارکت", navProfile: "پروفایل",
    navTf2: "کلید TF2",
    heroBadge: "مارکت زنده",
    heroTitle: 'خرید و فروش <span class="hero__accent">اسکین CS2</span><br/>در چند ثانیه',
    heroSub: "تحویل آنی روی تلگرام، با کمترین کارمزد.",
    heroBrowse: "مشاهده مارکت",
    statSkins: "اسکین در فروش", statVolume: "حجم مارکت", statTraders: "کاربران فعال", statUnit: "تومان",
    searchPlaceholder: "جستجوی اسکین... (مثلاً AK-47 Asiimov)",
    filtersTitle: "فیلترها", filtersClear: "حذف همه", filtersBtn: "فیلتر",
    fgRarity: "راریتی", fgGuns: "نوع گان", fgWear: "وضعیت / Wear", fgType: "نوع اسکین", fgPrice: "حداکثر قیمت",
    rarConsumer: "Consumer Grade", rarIndustrial: "Industrial Grade", rarMilSpec: "Mil-Spec Grade",
    rarRestricted: "Restricted", rarClassified: "Classified", rarCovert: "Covert",
    wrFactoryNew: "Factory New", wrMinimal: "Minimal Wear", wrField: "Field-Tested",
    wrWell: "Well-Worn", wrBattle: "Battle-Scarred",
    tyNormal: "Normal",
    priceTo: "تا سقف",
    count: "{n} آیتم",
    emptyTitle: "اسکینی با این فیلترها پیدا نشد.", emptyReset: "ریست فیلترها",
    tf2Title: "کلیدهای TF2",
    tf2Sub: "خرید کلید TF2 با تحویل فوری روی تلگرام.",
    tf2Empty: "فعلاً کلید TF2 برای فروش نیست.",
    trust1: "تحویل فوری", trust2: "معامله ۱۰۰٪ امن", trust3: "کارمزد صفر خرید", trust4: "تحویل ~۱۰ ثانیه‌ای",
    footerDesc: "بهترین مارکت‌پلیس اسکین CS2. ساخته‌شده برای گیمرها، توسط گیمرها.",
    footerNoteTitle: "چرا <span dir=&quot;ltr&quot;>ZEUSSHOP</span>",
    footerNote: "مارکت‌پلیس سریع و امن اسکین‌های CS2؛ تحویل آنی روی آیدی تلگرام، بدون کارمزد برای خریدار و ضمانت ۱۰۰٪ معامله.",
    footerContactTitle: "پشتیبانی",
    footerTelegram: "کانال ما در تلگرام",
    footerSupport: "پشتیبانی 24/7",
    ft1t: "سفارش سریع", ft1d: "اسکین را انتخاب کن و مشخصات موردنظر خودت را تعیین کن.",
    ft2t: "ارتباط مستقیم", ft2d: "سفارش از طریق تلگرام مدیریت پیگیری می‌شود.",
    ft3t: "پشتیبانی", ft3d: "برای پیگیری سفارش با مدیریت در ارتباط باش.",
    fQuick: "دسترسی سریع", fMarket: "مارکت", fProfile: "پروفایل",
    fSupport: "پشتیبانی", fFaq: "سوالات متداول", fHelp: "راهنمای خرید", fContact: "تماس",
    fLegal: "قوانین", fTerms: "قوانین استفاده", fPrivacy: "حریم خصوصی", fRefund: "بازگشت وجه",
    footerCr: "© 2026 ZEUSSHOP. وابسته به Valve نیست.",
    footerPay: "تحویل از طریق تلگرام / استیم",
    cartTitle: "سبد خرید", cartEmpty: "سبد خرید شما خالی است.", cartTotal: "جمع کل", cartCheckout: "نهایی‌کردن خرید",
    couponPh: "کد تخفیف (اختیاری)", couponApply: "اعمال", couponOk: "کد تخفیف اعمال شد ✓", couponOff: "تخفیف",
    couponErrNF: "کد تخفیف پیدا نشد.", couponErrUsed: "این کد قبلاً استفاده شده یا مخصوص شما نیست.", couponErrElse: "این کد مخصوص کاربر دیگری است.",
    couponRemove: "حذف کد", couponMsg: "کد <b dir=\"ltr\">{code}</b> اعمال شد — {off} ({disc}%)",
    profileTitle: "حساب کاربری", profileTgLabel: "آیدی تلگرام",
    profileTgPlace: "@username یا +98912...",
    profileNote: "اسکین‌های خریداری‌شده روی همین آیدی تلگرام تحویل داده می‌شوند.",
    profileSave: "ذخیره",
    reqTitle: "ابتدا وارد حساب کاربری شوید",
    reqText: "برای ثبت سفارش باید آیدی تلگرام خود را در حساب کاربری ثبت کنید. بدون آن امکان خرید وجود ندارد.",
    reqGo: "رفتن به حساب کاربری", reqLater: "بعداً",
    tTgEmpty: "لطفاً آیدی تلگرام را وارد کنید.",
    tTgSaved: "آیدی تلگرام <b>{val}</b> ثبت شد.",
    tAdded: "<b>{name}</b> به سبد اضافه شد",
    tInCart: "<b>{name}</b> از قبل در سبد است؛ سبد باز شد.",
    skinBuy: "افزودن به سبد خرید",
    skinInCart: "در سبد خرید ✓",
    lblName: "اسم گان", lblWeapon: "گان", lblType: "نوع",
    lblWear: "وضعیت", lblRarity: "راریتی", lblDelivery: "تحویل",
    tCheckout: "سفارش ثبت شد! پیام آن در تلگرام مدیریت (<b>@ZEUS_ADMIN0</b>) ارسال شد.",
    ckWaitSec: "برای جلوگیری از اسپم، {s} ثانیه صبر کن.",
    ckTooFast: "سفارشات شما زیاد است؛ لطفاً کمی صبر کن.",
    payTitle: "پرداخت سفارش",
    paySub: "مبلغ سفارش را به کارت زیر واریز کن، بعد عکس «فیش» را آپلود کن.",
    payItemsLbl: "سفارش تو:",
    payCardLbl: "واریز به کارت:",
    payCardNameLbl: "به نام:",
    payNote: "بعد از واریز، عکس فیش را اینجا آپلود کن تا کد پیگیری بگیری.",
    payDropTxt: "آپلود فیش واریز",
    payDropSub: "عکس فیش — روی کادر بزن یا بکش و رها کن",
    payDropBad: "فقط عکس انتخاب کن.",
    payDropBig: "حجم عکس خیلی زیاد است (حداکثر ۸ مگابایت).",
    paySubmit: "ثبت فیش و دریافت کد پیگیری",
    payTrackLbl: "کد پیگیری:",
    payOkTitle: "پرداخت ثبت شد 🎉",
    payOkSub: "کد پیگیری سفارش تو:",
    payCopy: "کپی کد",
    payCopied: "کپی شد ✓",
    payOkNote: "سفارش با همین کد به تلگرام مدیریت ارسال شد. اگر سوالی داشتی، این کد را به ادمین بگو.",
    payDone: "باشه، بستن",
    admPayTitle: "اطلاعات کارت پرداخت",
    admPayNote: "شماره کارت و نام صاحب کارتی که هنگام خرید برای کاربر نمایش داده می‌شود.",
    admPayCard: "شماره کارت",
    admPayCardPh: "6037-XXXX-XXXX-XXXX",
    admPayHolder: "نام صاحب کارت",
    admPayHolderPh: "مثلاً: علی رضایی",
    admPaySave: "ذخیره کارت",
    admPaySaved: "اطلاعات کارت ذخیره شد ✓",
    admPayCardOnly: "فقط عدد و خط تیره وارد کنید.",
    admPayEmpty: "شماره کارت را وارد کنید.",
    tProfileFirst: "ابتدا در پروفایل آیدی تلگرام ثبت کنید.",
    navInv: "اینونتوری", invTitle: "اینونتوری من", invEmptyTitle: "هنوز آیتمی در اینونتوری شما نیست.",
    invLoading: "در حال بارگذاری اینونتوری...",
    navRaffle: "قرعه‌کشی", raffleTitle: "قرعه‌کشی", raffleSpinning: "در حال چرخش...",
    raffleEmpty: "هنوز بخشی برای قرعه‌کشی تنظیم نشده.",
    raffleOff: "قرعه‌کشی در حال حاضر غیرفعال است.",
    invEmptyLoginTitle: "برای مشاهده اینونتوری ابتدا در پروفایل آیدی تلگرام ثبت کنید.",
    invBack: "بازگشت به مارکت",
    annTitle: "اعلامیه فروشگاه", annOk: "تایید ✓",
    latestLabel: "آخرین خریدهای تاییدشده",
  },
  en: {
    navMarket: "Market", navProfile: "Profile",
    navTf2: "TF2 Key",
    heroBadge: "LIVE MARKET",
    heroTitle: 'Buy &amp; Sell <span class="hero__accent">CS2 Skins</span><br/>in Seconds',
    heroSub: "Instant delivery via Telegram. Lowest fees.",
    heroBrowse: "Browse Market",
    statSkins: "Skins on sale", statVolume: "Market volume", statTraders: "Active users", statUnit: "Toman",
    searchPlaceholder: "Search skins... (e.g. AK-47 Asiimov)",
    filtersTitle: "Filters", filtersClear: "Clear all", filtersBtn: "Filter",
    fgRarity: "Rarity", fgGuns: "Gun type", fgWear: "Condition / Wear", fgType: "Skin type", fgPrice: "Max price",
    rarConsumer: "Consumer Grade", rarIndustrial: "Industrial Grade", rarMilSpec: "Mil-Spec Grade",
    rarRestricted: "Restricted", rarClassified: "Classified", rarCovert: "Covert",
    wrFactoryNew: "Factory New", wrMinimal: "Minimal Wear", wrField: "Field-Tested",
    wrWell: "Well-Worn", wrBattle: "Battle-Scarred",
    tyNormal: "Normal",
    priceTo: "Up to",
    count: "{n} items",
    emptyTitle: "No skins match your filters.", emptyReset: "Reset filters",
    tf2Title: "TF2 Keys",
    tf2Sub: "Buy TF2 keys with instant delivery on Telegram.",
    tf2Empty: "No TF2 keys on sale right now.",
    trust1: "Instant Delivery", trust2: "100% Secure Trades", trust3: "0% Buyer Fees", trust4: "~10 sec Delivery",
    footerDesc: "The ultimate CS2 skins marketplace. Built for players, by players.",
    footerNoteTitle: "Why <span dir=&quot;ltr&quot;>ZEUSSHOP</span>",
    footerNote: "Fast and secure CS2 skin marketplace: instant delivery to your Telegram ID, zero buyer fees, and a 100% safe-trade guarantee.",
    footerContactTitle: "Support",
    footerTelegram: "Our Telegram channel",
    footerSupport: "24/7 support",
    ft1t: "Fast Order", ft1d: "Pick a skin and set the specifics you want.",
    ft2t: "Direct Contact", ft2d: "Your order is managed and tracked via admin Telegram.",
    ft3t: "Support", ft3d: "Stay in touch with the admin to follow up on your order.",
    fQuick: "Quick links", fMarket: "Market", fProfile: "Profile",
    fSupport: "Support", fFaq: "FAQ", fHelp: "Purchase guide", fContact: "Contact",
    fLegal: "Legal", fTerms: "Terms of Service", fPrivacy: "Privacy Policy", fRefund: "Refund Policy",
    footerCr: "© 2026 ZEUSSHOP. Not affiliated with Valve Corp.",
    footerPay: "Delivery via Telegram / Steam",
    cartTitle: "Your Cart", cartEmpty: "Your cart is empty.", cartTotal: "Total", cartCheckout: "Checkout",
    couponPh: "Discount code (optional)", couponApply: "Apply", couponOk: "Coupon applied ✓", couponOff: "Discount",
    couponErrNF: "Coupon not found.", couponErrUsed: "This code was already used.", couponErrElse: "This code is for another user.",
    couponRemove: "Remove code", couponMsg: "Code <b dir=\"ltr\">{code}</b> applied — {off} ({disc}%)",
    profileTitle: "My Account", profileTgLabel: "Telegram ID",
    profileTgPlace: "@username or +98912...",
    profileNote: "Purchased skins will be delivered to this Telegram ID.",
    profileSave: "Save",
    reqTitle: "Open your account first",
    reqText: "You must save your Telegram ID in your account before ordering. Purchases are blocked until then.",
    reqGo: "Go to Account", reqLater: "Later",
    tTgEmpty: "Please enter your Telegram ID.",
    tTgSaved: "Telegram ID <b>{val}</b> saved.",
    tAdded: "<b>{name}</b> added to cart",
    tInCart: "<b>{name}</b> is already in cart; cart opened.",
    skinBuy: "Add to cart",
    skinInCart: "In cart ✓",
    lblName: "Skin", lblWeapon: "Weapon", lblType: "Type",
    lblWear: "Wear", lblRarity: "Rarity", lblDelivery: "Delivery",
    tCheckout: "Order placed! Sent to admin Telegram (<b>@ZEUS_ADMIN0</b>).",
    ckWaitSec: "Wait {s}s to prevent spam.",
    ckTooFast: "Too many orders — please wait a moment.",
    payTitle: "Checkout",
    paySub: "Send the amount to the card below, then upload the receipt photo.",
    payItemsLbl: "Your order:",
    payCardLbl: "Pay to card:",
    payCardNameLbl: "Holder:",
    payNote: "After paying, upload the receipt photo here to get your tracking code.",
    payDropTxt: "Upload payment receipt",
    payDropSub: "Receipt photo — tap or drag & drop",
    payDropBad: "Please choose an image.",
    payDropBig: "Image is too large (max 8 MB).",
    paySubmit: "Upload receipt & get tracking code",
    payTrackLbl: "Tracking code:",
    payOkTitle: "Payment received 🎉",
    payOkSub: "Your tracking code:",
    payCopy: "Copy code",
    payCopied: "Copied ✓",
    payOkNote: "Your order (with this code) was sent to admin Telegram. Show this code to the admin if you have any questions.",
    payDone: "OK, done",
    admPayTitle: "Payment card",
    admPayNote: "Card number & holder name shown to buyers at checkout.",
    admPayCard: "Card number",
    admPayCardPh: "6037-XXXX-XXXX-XXXX",
    admPayHolder: "Card holder",
    admPayHolderPh: "e.g. Ali Rezayi",
    admPaySave: "Save card",
    admPaySaved: "Card info saved ✓",
    admPayCardOnly: "Digits and dashes only.",
    admPayEmpty: "Enter the card number.",
    tProfileFirst: "Save your Telegram ID in your profile first.",
navInv: "Inventory", invTitle: "My Inventory", invEmptyTitle: "No items in your inventory yet.",
    invLoading: "Loading inventory...",
    navRaffle: "Raffle", raffleTitle: "Raffle", raffleSpinning: "Spinning...",
    raffleEmpty: "No raffle sections configured yet.",
    raffleOff: "Raffle is currently disabled.",
    invEmptyLoginTitle: "Register your Telegram ID in your profile to view your inventory.",
    invBack: "Back to market",
    annTitle: "Shop Announcement", annOk: "Got it ✓",
    latestLabel: "Recent Approved Purchases",
  },
};

let lang = "fa";
try { lang = localStorage.getItem("skm_lang") || "fa"; } catch { /* ignore */ }
if (lang !== "en") lang = "fa";
let isFirstApply = true;

function t(key, vars = {}) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  Object.keys(vars).forEach(k => { s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]); });
  return s;
}

function applyLang() {
  const d = I18N[lang];
  const toLTR = lang === "en";
  const dir = toLTR ? "ltr" : "rtl";
  document.documentElement.lang = lang;
  document.documentElement.setAttribute("dir", dir);
  if ($id("skinsGrid")) {
    document.title = lang === "fa" ? "ZEUSSHOP — خرید و فروش اسکین CS2" : "ZEUSSHOP — Buy & Sell CS2 Skins";
  }
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = d[el.dataset.i18n] || el.textContent; });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = d[el.dataset.i18nHtml] || el.innerHTML; });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = d[el.dataset.i18nPh] || el.placeholder; });
  const toggle = $id("langToggle");
  if (toggle) {
    toggle.textContent = lang === "fa" ? "EN" : "فا";
    toggle.classList.toggle("is-en", lang === "en");
  }
  if (!isFirstApply) {
    document.documentElement.classList.remove("is-switching", "to-ltr", "to-rtl");
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add("is-switching", toLTR ? "to-ltr" : "to-rtl");
    setTimeout(() => document.documentElement.classList.remove("is-switching", "to-ltr", "to-rtl"), 600);
  }
  isFirstApply = false;
  refreshHero();
  if (typeof globalState === "function") globalState();
  if (typeof renderLatest === "function") renderLatest();
  if (typeof updateSkinModalBtn === "function") updateSkinModalBtn();
}

const langToggle = $id("langToggle");
if (langToggle) langToggle.addEventListener("click", () => {
  if (document.documentElement.classList.contains("is-switching")) return;
  lang = lang === "fa" ? "en" : "fa";
  try { localStorage.setItem("skm_lang", lang); } catch { /* ignore */ }
  applyLang();
});

/* ---------- محصولات ---------- */
const RARITY = {
  "Consumer Grade":  { color: "#b8bec9", label: "Consumer Grade" },
  "Industrial Grade":{ color: "#5e98d9", label: "Industrial Grade" },
  "Mil-Spec Grade":  { color: "#4b69ff", label: "Mil-Spec Grade" },
  Restricted:        { color: "#8847ff", label: "Restricted" },
  Classified:        { color: "#d32ce6", label: "Classified" },
  Covert:            { color: "#eb4b4b", label: "Covert" },
  Extraordinary:     { color: "#ffce1f", label: "Extraordinary" },
};

/* ---------- اعداد / قیمت ---------- */
const toFaDigits = str => String(str).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const showNum = str => (lang === "fa" ? toFaDigits(str) : String(str));
const fmtNum = n => {
  const v = Math.round(Number(n) || 0).toLocaleString("en-US");
  return lang === "fa" ? toFaDigits(v).replace(/,/g, "٬") : v;
};
const unitTxt = () => (lang === "fa" ? "تومان" : "Toman");
const fmtPrice = n => `${fmtNum(n)} ${unitTxt()}`;
const twoFix = n => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const encImg = src => encodeURI(src);
const timeAgo = iso => {
  const t = iso ? new Date(iso).getTime() : 0;
  if (!t) return lang === "fa" ? "به تازگی" : "recently";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return lang === "fa" ? "لحظاتی پیش" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return lang === "fa" ? `${toFaDigits(m)} دقیقه پیش` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "fa" ? `${toFaDigits(h)} ساعت پیش` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === "fa" ? `${toFaDigits(d)} روز پیش` : `${d}d ago`;
};

/* --- قیمت با تخفیف --- */
const skinDiscount = s => Math.max(0, Math.min(100, Number(s.discount) || 0));
const skinFinalPrice = s => {
  const d = skinDiscount(s);
  return d > 0 ? Number(s.price) * (1 - d / 100) : Number(s.price);
};
const priceInner = s => {
  const d = skinDiscount(s);
  const p = skinFinalPrice(s);
  const now = `<b class="price-now">${fmtNum(p)} <small>${unitTxt()}</small></b>`;
  return d > 0
    ? `<s class="price-old">${fmtNum(s.price)}</s> ${now}`
    : now;
};

/* --- کلید TF2: ردیف‌های کاتالوگ با type === "TF2" (جدا از اسکین‌ها) --- */
const isTf2 = s => String((s && s.type) || "") === "TF2";
const getTf2List = () => getSkins().filter(isTf2);

function refreshHero() {
  const count = getSkins().filter(s => !isTf2(s)).length;
  const badge = document.querySelector("[data-i18n='heroBadge']");
  if (badge) badge.textContent = lang === "fa"
    ? `مارکت زنده · ${toFaDigits(count)} اسکین در فروش`
    : `LIVE MARKET · ${count} SKINS ON SALE`;
  const skinsEl = $id("statSkinsCount");
  if (skinsEl) skinsEl.textContent = showNum(count);
  const usersEl = $id("statUsersCount");
  if (usersEl) {
    const prefix = usersEl.dataset.prefix || "";
    const n = (typeof getUserCount === "function") ? getUserCount() : (typeof getUsers === "function" ? getUsers().length : 0);
    usersEl.textContent = prefix + showNum(n);
  }
  const volEl = $id("statVolume");
  if (volEl) {
    const listed = (getSkins() || []).filter(s => !isTf2(s)).reduce((s, k) => {
      const d = Math.max(0, Math.min(100, Number(k.discount) || 0));
      const p = d > 0 ? Number(k.price) * (1 - d / 100) : Number(k.price);
      return s + (Number(p) || 0);
    }, 0);
    volEl.textContent = fmtNum(listed);
  }
  applyHeroImg();
}

/* custom hero background set from the admin panel (site settings) */
function applyHeroImg() {
  const bg = document.querySelector(".hero__bg");
  if (!bg) return;
  const hero = (typeof getHeroImg === "function") ? getHeroImg() : "";
  if (hero) {
    bg.style.backgroundImage = 'url("' + hero + '")';
    bg.classList.add("is-custom");
  } else {
    bg.style.backgroundImage = "";
    bg.classList.remove("is-custom");
  }
}

/* =========================================================
   گردونه قرعه‌کشی — رندر مشترک (shop + admin preview)
   ========================================================= */
const RAFFLE_PAIRS = [
  ["#8a5f10", "#ffe08a", "#2a1c00"],
  ["#0a0804", "#2d2618", "#f7efd6"],
  ["#5e3f08", "#e6b23e", "#241a00"],
  ["#060503", "#221c10", "#f0c24b"],
  ["#a9791a", "#ffe6a0", "#2a1c00"],
  ["#0d0a05", "#2c2412", "#ffe9a8"],
];
function raffleRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawRaffleWheel(canvas, entries, size, winnerIndex) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  size = size || 340;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * DPR;
  canvas.height = size * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 22;
  const list = Array.isArray(entries) ? entries : [];
  const n = list.length;
  const win = Number.isInteger(winnerIndex) ? winnerIndex : -1;

  ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#030201"; ctx.fill();

  const ringBase = ctx.createLinearGradient(0, 0, size, size);
  ringBase.addColorStop(0, "#2f2310");
  ringBase.addColorStop(.45, "#0a0703");
  ringBase.addColorStop(.75, "#1c1508");
  ringBase.addColorStop(1, "#3a2b12");
  ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
  ctx.lineWidth = 15; ctx.strokeStyle = ringBase; ctx.stroke();

  ctx.save();
  for (let i = 0; i < 144; i++) {
    const a = (Math.PI * 2 / 144) * i;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
    ctx.lineTo(cx + Math.cos(a) * (R + 18.5), cy + Math.sin(a) * (R + 18.5));
    ctx.lineWidth = 1;
    ctx.strokeStyle = (i % 2) ? "rgba(255,232,170,.15)" : "rgba(0,0,0,.5)";
    ctx.stroke();
  }
  ctx.restore();

  const goldBevel = ctx.createLinearGradient(0, 0, size, size);
  goldBevel.addColorStop(0, "#fff6d8");
  goldBevel.addColorStop(.35, "#e6b23e");
  goldBevel.addColorStop(.62, "#8a6110");
  goldBevel.addColorStop(1, "#c9962c");
  ctx.beginPath(); ctx.arc(cx, cy, R + 18.8, 0, Math.PI * 2);
  ctx.lineWidth = 2.4; ctx.strokeStyle = goldBevel; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
  ctx.lineWidth = 2.6; ctx.strokeStyle = goldBevel; ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 / 12) * i - Math.PI / 2 + Math.PI / 12;
    const bx = cx + Math.cos(a) * (R + 12);
    const by = cy + Math.sin(a) * (R + 12);
    ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1206"; ctx.fill();
    const rg = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, 2.8);
    rg.addColorStop(0, "#fff6d8");
    rg.addColorStop(.5, "#c9962c");
    rg.addColorStop(1, "#5e3f08");
    ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = rg; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - 1.7, by); ctx.lineTo(bx + 1.7, by);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(40,26,0,.7)"; ctx.stroke();
  }

  ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
  ctx.lineWidth = 2.6; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.stroke();

  if (n) {
    const seg = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * seg;
      const p = RAFFLE_PAIRS[i % RAFFLE_PAIRS.length];

      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + seg); ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, R * 0.16, cx, cy, R);
      grad.addColorStop(0, p[0]);
      grad.addColorStop(.72, p[1]);
      grad.addColorStop(1, p[0]);
      ctx.fillStyle = grad; ctx.fill();

      if (i === win) {
        const wg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
        wg.addColorStop(0, "rgba(255,225,140,.12)");
        wg.addColorStop(1, "rgba(255,225,140,.5)");
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + seg); ctx.closePath();
        ctx.fillStyle = wg; ctx.fill();
      }

      ctx.lineWidth = 1.3; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();

      const mid = a0 + seg / 2;
      const fs = n > 18 ? 9 : n > 12 ? 10.5 : n > 8 ? 12 : n > 5 ? 14 : 16;
      const raw = String(list[i] == null ? "" : list[i]).trim() || "—";
      ctx.save();
      ctx.font = "800 " + fs + "px Vazirmatn, system-ui, sans-serif";
      if (n <= 8) {
        const rr = R * 0.66;
        const tx = cx + Math.cos(mid) * rr;
        const ty = cy + Math.sin(mid) * rr;
        const maxW = 2 * rr * Math.sin(seg / 2) * 0.92 - 16;
        if (maxW >= 14) {
          ctx.translate(tx, ty);
          let label = raw;
          while (label.length > 1 && ctx.measureText(label).width > maxW) label = label.slice(0, -1).trim();
          if (label !== raw) label = (label || raw.slice(0, 1)) + "…";
          const tw = ctx.measureText(label).width;
          const ph = fs + 9, pw = tw + 16;
          raffleRoundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
          const plateG = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
          plateG.addColorStop(0, "rgba(14,10,4,.66)");
          plateG.addColorStop(1, "rgba(0,0,0,.4)");
          ctx.fillStyle = plateG; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,232,170,.32)"; ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = p[2];
          ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
          ctx.fillText(label, 0, 0);
        }
      } else {
        const rOuter = R - 12, rInner = R * 0.30;
        const avail = rOuter - rInner - 18;
        let label = raw;
        while (label.length > 1 && ctx.measureText(label).width > avail) label = label.slice(0, -1).trim();
        if (label !== raw) label = (label || raw.slice(0, 1)) + "…";
        if (avail >= 16 && label) {
          const tw = ctx.measureText(label).width;
          const ph = fs + 8, pw = tw + 12;
          const flip = Math.cos(mid) < 0;
          ctx.translate(cx, cy);
          ctx.rotate(flip ? mid + Math.PI : mid);
          const rr = (rOuter + rInner) / 2;
          const x = flip ? -rr : rr;
          raffleRoundRect(ctx, x - pw / 2, -ph / 2, pw, ph, ph / 2);
          const plateG = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
          plateG.addColorStop(0, "rgba(14,10,4,.7)");
          plateG.addColorStop(1, "rgba(0,0,0,.44)");
          ctx.fillStyle = plateG; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,232,170,.34)"; ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = p[2];
          ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
          ctx.fillText(label, x, 0);
        }
      }
      ctx.restore();
    }

    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.lineWidth = 1.8; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.stroke();
      ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(255,232,170,.38)"; ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(255,240,200,.28)"; ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const sheen = ctx.createLinearGradient(0, 0, size, size);
    sheen.addColorStop(0, "rgba(255,255,255,.11)");
    sheen.addColorStop(.4, "rgba(255,255,255,0)");
    sheen.addColorStop(.62, "rgba(0,0,0,0)");
    sheen.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    const rec = ctx.createRadialGradient(cx, cy - R * 0.05, 2, cx, cy, R * 0.24);
    rec.addColorStop(0, "#161616");
    rec.addColorStop(1, "#000000");
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = rec; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#1b1b1b"; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,224,150,.5)"; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "#0f0c06"; ctx.fill();
  }

  const bulbs = Math.max(18, n ? n * 2 : 22);
  const bulbR = R + 2.9;
  for (let i = 0; i < bulbs; i++) {
    const a = (Math.PI * 2 / bulbs) * i - Math.PI / 2;
    const bx = cx + Math.cos(a) * bulbR;
    const by = cy + Math.sin(a) * bulbR;
    const bright = i % 2 === 0;
    ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fill();
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 2.4);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(.45, bright ? "#fff0b8" : "#e6b23e");
    bg.addColorStop(1, "rgba(255,200,80,0)");
    ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.shadowColor = bright ? "#fff3c9" : "#ffd873"; ctx.shadowBlur = bright ? 7 : 4;
    ctx.fill(); ctx.shadowBlur = 0;
  }
}

/* Motion blur + faster halo while the wheel spins */
function setWheelSpinFX(canvas, on) {
  const wheel = canvas && canvas.closest ? canvas.closest(".raffle-wheel") : null;
  if (!wheel) return;
  wheel.classList.toggle("is-spinning", !!on);
}

/* Black & gold paper-confetti burst over a host element */
function burstConfetti(host) {
  if (!host || host.querySelector(".raffle-confetti")) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  const cv = document.createElement("canvas");
  cv.className = "raffle-confetti";
  cv.width = w; cv.height = h;
  cv.style.width = w + "px"; cv.style.height = h + "px";
  host.appendChild(cv);
  const ctx = cv.getContext("2d");
  const COLORS = ["#f0c24b", "#ffe08a", "#b8860b", "#7a5808", "#111111", "#2b2b2b", "#ffffff"];
  const parts = [];
  for (let i = 0; i < 140; i++) {
    parts.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.55,
      y: h * 0.44 + (Math.random() - 0.5) * h * 0.18,
      vx: (Math.random() - 0.5) * 8,
      vy: -6.5 - Math.random() * 7,
      g: 0.3 + Math.random() * 0.18,
      pw: 6 + Math.random() * 7,
      ph: 9 + Math.random() * 10,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      col: COLORS[(Math.random() * COLORS.length) | 0]
    });
  }
  const t0 = performance.now();
  function frame(now) {
    const t = now - t0;
    ctx.clearRect(0, 0, w, h);
    const fade = Math.max(0, Math.min(1, 1 - Math.max(0, t - 1600) / 900));
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.pw / 2, -p.ph / 2, p.pw, p.ph);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else cv.remove();
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   Toast (used on shop AND admin pages)
   ========================================================= */
const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);
let toastTimer;
function showToast(msg, error = false) {
  toast.classList.remove("error");
  if (error) toast.classList.add("error");
  toast.innerHTML = msg;
  toast.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 2400);
}
function hideToast() { toast.classList.remove("is-show"); }

/* =========================================================
   پروفایل / آیدی تلگرام (shop only)
   ========================================================= */
const TG_KEY = "skm_telegram_id";

function getTelegram() {
  try {
    let v = localStorage.getItem(TG_KEY) || "";
    v = v.trim().replace(/@+$/, "");
    if (v && !v.startsWith("@") && !v.startsWith("+")) v = /^\d{9,15}$/.test(v) ? "+" + v : "@" + v;
    return v;
  } catch { return ""; }
}
function setTelegram(v) {
  try { localStorage.setItem(TG_KEY, v); } catch { /* ignore */ }
}

const profileModal = $id("profileModal");
if (profileModal) {
  const profileOverlay = $id("profileOverlay");
  const telegramInput = $id("telegramInput");
  const profileAvatar = $id("profileAvatar");
  const headerAvatar = $id("headerAvatar");
  const TG_AVATAR_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%228%22 r=%224%22 fill=%22%23c7b862%22/><path d=%22M4 21c0-4 3.6-6 8-6s8 2 8 6%22 fill=%22%23c7b862%22/></svg>";

  function usernameFromTg(val) {
    val = val.trim();
    if (!val || val.startsWith("+")) return "";
    const m = val.match(/(?:t\.me\/|https?:\/\/)?@?([A-Za-z][A-Za-z0-9_]{3,31})/);
    return m ? m[1] : "";
  }
  function tgAvatarSrc(uname) {
    if (!uname) return TG_AVATAR_FALLBACK;
    return "https://t.me/i/userpic/320/" + uname + ".jpg";
  }
  function applyTgAvatar() {
    const uname = usernameFromTg(telegramInput.value);
    const src = tgAvatarSrc(uname);
    [profileAvatar, headerAvatar].forEach(img => {
      img.onerror = function () { this.onerror = null; this.src = TG_AVATAR_FALLBACK; };
      img.src = src;
    });
  }
  function openProfile() {
    telegramInput.value = getTelegram();
    applyTgAvatar();
    profileModal.classList.add("is-open");
    profileOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (!getTelegram()) setTimeout(() => telegramInput.focus(), 250);
  }
  function closeProfile() {
    profileModal.classList.remove("is-open");
    profileOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  $id("avatarBtn").addEventListener("click", openProfile);
  $id("closeProfile").addEventListener("click", closeProfile);
  profileOverlay.addEventListener("click", closeProfile);
  telegramInput.addEventListener("input", applyTgAvatar);

  $id("saveProfile").addEventListener("click", () => {
    let val = telegramInput.value.trim().replace(/@+$/, "");
    if (!val) {
      showToast(t("tTgEmpty"), true);
      telegramInput.focus();
      return;
    }
    if (!val.startsWith("@") && !val.startsWith("+")) {
      val = /^\d{9,15}$/.test(val) ? "+" + val : "@" + val;
    }
    setTelegram(val);
    addUser(val);
    telegramInput.value = val;
    applyTgAvatar();
    closeProfile();
    hideToast();
    showToast(t("tTgSaved", { val }));
  });

  telegramInput.value = getTelegram();
  applyTgAvatar();

  const reqModal = $id("reqModal");
  const reqOverlay = $id("reqOverlay");
  let pendingAction = null;

  function requireTelegram(cb) {
    if (getTelegram()) { cb(); return; }
    pendingAction = cb;
    reqModal.classList.add("is-open");
    reqOverlay.classList.add("is-open");
  }
  function closeReq() {
    reqModal.classList.remove("is-open");
    reqOverlay.classList.remove("is-open");
    pendingAction = null;
  }
  $id("goProfile").addEventListener("click", () => { closeReq(); openProfile(); });
  $id("skipNow").addEventListener("click", closeReq);
  reqOverlay.addEventListener("click", closeReq);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeReq(); closeProfile(); closeSkinModal(); }
  });

  /* =========================================================
     رندر کارت‌ها / فیلتر / جستجو (shop only)
     ========================================================= */
  const grid = $id("skinsGrid");
  const resultCount = $id("resultCount");
  const emptyState = $id("emptyState");
  const searchInput = $id("searchInput");
  const priceRange = $id("priceRange");
  const priceVal = $id("priceVal");
  const emptyReset = $id("emptyReset");

  function applySort(list) {
    return (Array.isArray(list) ? list : []).slice().sort(
      (a, b) => ((typeof FEATURED !== "undefined" ? FEATURED.indexOf(a.name) : -1) -
                 (typeof FEATURED !== "undefined" ? FEATURED.indexOf(b.name) : -1)) || (a.sort - b.sort));
  }

  function render(list) {
    grid.innerHTML = list.map((s, idx) => {
      const r = RARITY[s.rarity] ? RARITY[s.rarity].color : "#f0c24b";
      const delMode = s.delivery_mode === "days" ? "days" : "immediate";
      const delTxt = delMode === "days"
        ? (lang === "fa" ? `تحویل تا ${toFaDigits(s.delivery_days || 1)} روز` : `Delivery up to ${s.delivery_days || 1} days`)
        : (lang === "fa" ? "تحویل فوری" : "Instant delivery");
      return `
      <article class="card skin-card card--enter" style="--rarity:${r};animation-delay:${Math.min(idx, 11) * 60}ms" data-name="${s.name}" data-price="${s.price}">
        <span class="card__incart" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.3 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/></svg>
          <i>${lang === "fa" ? "در سبد" : "In cart"}</i>
        </span>
        ${s.type === "StatTrak™" || s.type === "Souvenir" ? `<span class="card__type">${s.type}</span>` : ""}
        <div class="card__img">
          <span class="card__glow" aria-hidden="true"></span>
          <img src="${encImg(s.img)}" alt="${s.name}" loading="lazy" onerror="this.closest('.card__img').classList.add('is-missing')" />
        </div>
        <div class="card__body">
          <div class="card__name" title="${s.name}">${s.name}</div>
          <span class="card__del card__del--${delMode}">${delTxt}</span>
          <div class="card__bottom">
            <span class="card__price">${priceInner(s)}</span>
          </div>
        </div>
      </article>`;
    }).join("");
    resultCount.textContent = t("count", { n: showNum(list.length) });
    emptyState.hidden = list.length !== 0;
    syncCards();
  }

  let activeWeapon = new Set();
  let activeWear = new Set();
  let activeType = new Set();

  const PRICE_MIN = 1000;
  const PRICE_MAX = 200000000;
  const SLIDER_MAX = 1000;

  function sliderToPrice(p) {
    const t = p / SLIDER_MAX;
    const v = PRICE_MIN * Math.pow(PRICE_MAX / PRICE_MIN, t);
    return Math.max(PRICE_MIN, Math.round(v / 100) * 100);
  }
  let maxPrice = PRICE_MAX;

  function globalState() {
    if (!grid) return;
    if (priceVal) priceVal.textContent = fmtPrice(maxPrice);
    let list = getSkins().filter(s => !isTf2(s));
    if (activeWeapon.size) list = list.filter(s => activeWeapon.has(s.weapon));
    if (activeWear.size) list = list.filter(s => activeWear.has(s.wear));
    if (activeType.size) list = list.filter(s => activeType.has(s.type));
    list = list.filter(s => skinFinalPrice(s) <= maxPrice);
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
    if (q) list = list.filter(s => s.name.toLowerCase().includes(q));
    list = applySort(list);
    render(list);
    if (typeof renderTf2 === "function") renderTf2();
    refreshHero();
  }

  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(globalState, 140);
  });

  let priceRaf = 0;
  priceRange.addEventListener("input", e => {
    maxPrice = sliderToPrice(+e.target.value);
    priceVal.textContent = fmtPrice(maxPrice);
    if (priceRaf) return;
    priceRaf = requestAnimationFrame(() => { priceRaf = 0; globalState(); });
  });

  document.querySelectorAll(".flt-weapon").forEach(cb =>
    cb.addEventListener("change", e => {
      e.target.checked ? activeWeapon.add(e.target.value) : activeWeapon.delete(e.target.value);
      globalState();
    }));
  document.querySelectorAll(".flt-wear").forEach(cb =>
    cb.addEventListener("change", e => {
      e.target.checked ? activeWear.add(e.target.value) : activeWear.delete(e.target.value);
      globalState();
    }));
  document.querySelectorAll(".flt-type").forEach(cb =>
    cb.addEventListener("change", e => {
      e.target.checked ? activeType.add(e.target.value) : activeType.delete(e.target.value);
      globalState();
    }));

  $id("clearFilters").addEventListener("click", () => {
    document.querySelectorAll(".flt-weapon, .flt-wear, .flt-type").forEach(cb => { cb.checked = false; });
    activeWeapon.clear(); activeWear.clear(); activeType.clear();
    maxPrice = PRICE_MAX; priceRange.value = SLIDER_MAX; priceVal.textContent = fmtPrice(PRICE_MAX);
    searchInput.value = "";
    globalState();
  });
  emptyReset.addEventListener("click", () => $id("clearFilters").click());

  /* =========================================================
     سبد خرید (shop only)
     ========================================================= */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("skm_cart") || "[]"); } catch { cart = []; }
  if (!Array.isArray(cart)) cart = [];

  let appliedCoupon = null;

  function claimedList() {
    try { return JSON.parse(localStorage.getItem("skm_claimed") || "[]"); } catch { return []; }
  }
  function claimLocal(code) {
    const cl = claimedList();
    if (!cl.includes(code)) { cl.push(code); try { localStorage.setItem("skm_claimed", JSON.stringify(cl)); } catch { /* ignore */ } }
  }
  function cartSubtotal() { return cart.reduce((x, n) => x + cartPrice(n), 0); }
  function cartDiscount() { return appliedCoupon ? Math.round(cartSubtotal() * appliedCoupon.discount / 100) : 0; }
  function cartFinal() { return Math.max(0, cartSubtotal() - cartDiscount()); }

  const cartBody = $id("cartBody");
  const cartFoot = $id("cartFoot");
  const cartTotal = $id("cartTotal");
  const drawer = $id("cartDrawer");
  const miniCart = $id("miniCart");
  const miniCartCount = $id("miniCartCount");
  const cartDrawerCount = $id("cartDrawerCount");
  const cartCount = $id("cartCount");

  function saveCart() { try { localStorage.setItem("skm_cart", JSON.stringify(cart)); } catch { /* ignore */ } }
  function cartPrice(n) { const s = findSkin(n); return s ? skinFinalPrice(s) : 0; }

  function updateMiniCart() {
    if (!drawer) return;
    if (cart.length && !drawer.classList.contains("is-open")) {
      miniCartCount.textContent = cart.length;
      miniCart.hidden = false;
    } else {
      miniCart.hidden = true;
    }
  }

  function syncCards() {
    const tf2Grid = $id("tf2Grid");
    if (tf2Grid) {
      Array.prototype.forEach.call(tf2Grid.children, card => {
        card.classList.toggle("is-in-cart", cart.includes(card.dataset.name || ""));
      });
    }
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, card => {
      const name = card.dataset.name || "";
      card.classList.toggle("is-in-cart", cart.includes(name));
    });
  }

  function renderCart() {
    if (!cartBody) return;
    if (cartCount) {
      cartCount.textContent = cart.length;
      cartCount.classList.remove("is-anim"); void cartCount.offsetWidth; cartCount.classList.add("is-anim");
    }
    if (cart.length === 0) {
      cartBody.innerHTML = `<div class="drawer__empty">
        <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-1.5 9H6L4 3H2"/><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/></svg>
        <p>${t("cartEmpty")}</p></div>`;
      cartFoot.hidden = true;
      closeCart();
    } else {
      cartBody.innerHTML = cart.map(name => {
        const s = findSkin(name);
        if (!s) return "";
        const r = RARITY[s.rarity] ? RARITY[s.rarity].color : "#f0c24b";
        return `<div class="cart-item" style="--rarity:${r}">
          <div class="cart-item__img"><img src="${encImg(s.img)}" alt="${s.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2211%22 cy=%2211%22 r=%227%22 fill=%22%232b261a%22/><path d=%22m20 20-3.2-3.2%22 stroke=%22%23f0c24b%22/></svg>'"/></div>
          <div class="cart-item__info">
            <div class="cart-item__name">${s.name}</div>
            ${isTf2(s) ? "" : `<div class="cart-item__meta"><b>${s.wear}</b> · ${s.weapon}</div>`}
          </div>
          <span class="cart-item__price">${priceInner(s)}</span>
          <button class="cart-item__remove" data-remove="${name}" aria-label="×">×</button>
        </div>`;
      }).join("");
      cartFoot.hidden = false;
      cartTotal.textContent = fmtPrice(cartFinal());
      cartDrawerCount.textContent = cart.length;
    }
    updateCouponUI();
    updateMiniCart();
    syncCards();
  }

  /* ---------- skin detail modal ---------- */
  const skinModal = $id("skinModal");
  const skinOverlay = $id("skinOverlay");
  const skinModalImg = $id("skinModalImg");
  const skinModalRows = $id("skinModalRows");
  const skinModalPrice = $id("skinModalPrice");
  const skinModalBuy = $id("skinModalBuy");
  const skinModalImgWrap = skinModal ? skinModal.querySelector(".skin-modal__img") : null;
  let skinModalCurrent = null;

  function skinRowsHTML(s) {
    const r = RARITY[s.rarity] ? RARITY[s.rarity].color : "#f0c24b";
    const delMode = s.delivery_mode === "days" ? "days" : "immediate";
    const delTxt = delMode === "days"
      ? (lang === "fa" ? `تا ${toFaDigits(s.delivery_days || 1)} روز` : `Up to ${s.delivery_days || 1} days`)
      : (lang === "fa" ? "فوری" : "Instant");
    const typeTxt = (s.type === "StatTrak™" || s.type === "Souvenir") ? s.type : t("tyNormal");
    const ico = {
      type: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 6h8l8 8-6 6-8-8V6Z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>',
      wear: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0C6 9.6 12 3 12 3Z"/></svg>',
      rarity: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.5 14.6 8 20 8l-4.3 3.6L17.4 17 12 13.9 6.6 17l1.7-5.4L4 8l5.4 0L12 2.5Z"/></svg>',
      delivery: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>'
    };
    const spec = (k, v, icon, color = "") =>
      `<div class="skin-spec"><span class="skin-spec__k">${icon}${k}</span><span class="skin-spec__v"${color ? ` style="color:${color}"` : ""}>${v}</span></div>`;
    return `
      <div class="skin-modal__head">
        <div class="skin-modal__top">
          <span class="skin-modal__weapon">${escT(s.weapon)}</span>
          <span class="skin-modal__badge">${escT(s.rarity)}</span>
        </div>
        <h3 class="skin-modal__name">${escT(s.name)}</h3>
        <span class="skin-modal__bar"></span>
      </div>
      <div class="skin-specs">
        ${spec(t("lblType"), escT(typeTxt), ico.type)}
        ${spec(t("lblWear"), escT(s.wear), ico.wear)}
        ${spec(t("lblRarity"), escT(s.rarity), ico.rarity, r)}
        ${spec(t("lblDelivery"), delTxt, ico.delivery)}
      </div>`;
  }

  function updateSkinModalBtn() {
    if (!skinModal || !skinModalCurrent) return;
    const inCart = cart.includes(skinModalCurrent.name);
    if (skinModalBuy) {
      skinModalBuy.textContent = inCart ? t("skinInCart") : t("skinBuy");
      skinModalBuy.classList.toggle("is-in", inCart);
    }
  }

  function openSkinModal(skin) {
    if (!skinModal || !skin) return;
    skinModalCurrent = skin;
    const r = RARITY[skin.rarity] ? RARITY[skin.rarity].color : "#f0c24b";
    skinModal.style.setProperty("--rarity", r);
    if (skinModalImgWrap) skinModalImgWrap.style.setProperty("--rarity", r);
    if (skinModalImg) { skinModalImg.style.display = ""; skinModalImg.src = encImg(skin.img); skinModalImg.alt = skin.name; }
    if (skinModalRows) skinModalRows.innerHTML = skinRowsHTML(skin);
    if (skinModalPrice) skinModalPrice.innerHTML = priceInner(skin);
    updateSkinModalBtn();
    skinModal.classList.add("is-open");
    if (skinOverlay) skinOverlay.classList.add("is-open");
  }

  function closeSkinModal() {
    if (!skinModal) return;
    skinModal.classList.remove("is-open");
    if (skinOverlay) skinOverlay.classList.remove("is-open");
    skinModalCurrent = null;
  }

  if (skinModalBuy) skinModalBuy.addEventListener("click", () => {
    const skin = skinModalCurrent;
    if (!skin) return;
    const name = skin.name;
    if (cart.includes(name)) { showToast(t("tInCart", { name })); closeSkinModal(); openCart(); return; }
    requireTelegram(() => {
      cart.push(name);
      saveCart();
      renderCart();
      showToast(t("tAdded", { name }));
      updateSkinModalBtn();
      closeSkinModal();
      openCart();
    });
  });
  if (skinOverlay) skinOverlay.addEventListener("click", closeSkinModal);
  const closeSkinBtn = $id("closeSkin");
  if (closeSkinBtn) closeSkinBtn.addEventListener("click", closeSkinModal);

  grid.addEventListener("click", e => {
    const card = e.target.closest(".skin-card");
    if (!card) return;
    const name = card.dataset.name || "";
    const skin = findSkin(name);
    if (!skin) return;
    openSkinModal(skin);
  });

  /* =========================================================
     کلیدهای TF2 — بخش جداگانه‌ی سایت (type === "TF2")
     ========================================================= */
  function renderTf2() {
    const g = $id("tf2Grid");
    if (!g) return;
    const empty = $id("tf2Empty");
    const list = applySort(getTf2List());
    if (empty) empty.hidden = list.length !== 0;
    g.innerHTML = list.map((s, idx) => `
      <article class="card skin-card tf2-card card--enter" style="animation-delay:${Math.min(idx, 11) * 60}ms" data-name="${s.name}" data-price="${s.price}">
        <span class="card__incart" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.3 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/></svg>
          <i>${lang === "fa" ? "در سبد" : "In cart"}</i>
        </span>
        <div class="card__img">
          <span class="card__glow" aria-hidden="true"></span>
          <img src="${encImg(s.img)}" alt="${s.name}" loading="lazy" onerror="this.closest('.card__img').classList.add('is-missing')" />
        </div>
        <div class="card__body">
          <div class="card__name" title="${s.name}">${s.name}</div>
          <div class="card__bottom">
            <span class="card__price">${priceInner(s)}</span>
          </div>
        </div>
      </article>`).join("");
    syncCards();
  }

  const tf2GridEl = $id("tf2Grid");
  if (tf2GridEl) tf2GridEl.addEventListener("click", e => {
    const card = e.target.closest(".skin-card");
    if (!card) return;
    const name = card.dataset.name || "";
    const item = findSkin(name);
    if (!item) return;
    if (cart.includes(name)) { showToast(t("tInCart", { name })); openCart(); return; }
    requireTelegram(() => {
      cart.push(name);
      saveCart();
      renderCart();
      showToast(t("tAdded", { name }));
      openCart();
    });
  });

  /* نمای TF2 — مانند اینونتوری: تعویض کامل نما (صفحه‌ی جدا از مارکت) */
  function showTf2(open) {
    document.body.classList.toggle("is-tf2", open);
    if (open) {
      document.body.classList.remove("is-inv");
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      renderTf2();
    }
  }
  const tf2Nav = $id("tf2Nav");
  if (tf2Nav) tf2Nav.addEventListener("click", e => {
    e.preventDefault();
    showTf2(!document.body.classList.contains("is-tf2"));
  });
  const tf2Back = $id("tf2Back");
  if (tf2Back) tf2Back.addEventListener("click", () => showTf2(false));
  const marketNav = $id("marketNav");
  if (marketNav) marketNav.addEventListener("click", e => {
    e.preventDefault();
    showTf2(false);
    document.body.classList.remove("is-inv");
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  });

  cartBody.addEventListener("click", e => {
    const btn = e.target.closest("[data-remove]");
    if (btn) removeFromCart(btn.dataset.remove);
  });

  function removeFromCart(name) {
    cart = cart.filter(n => n !== name);
    saveCart();
    renderCart();
  }

  $id("closeCart").addEventListener("click", closeCart);
  miniCart.addEventListener("click", openCart);

  /* ---------- discount coupon ---------- */
  const couponInput = $id("couponInput");
  const couponMsg = $id("couponMsg");
  const couponApplyBtn = $id("couponApply");
  const couponRemoveBtn = $id("couponRemove");
  function updateCouponUI() {
    if (!couponMsg) return;
    if (appliedCoupon) {
      couponMsg.hidden = false;
      couponMsg.classList.remove("is-err");
      couponMsg.innerHTML = t("couponMsg", { code: escT(appliedCoupon.code), off: fmtPrice(cartDiscount()), disc: showNum(appliedCoupon.discount) });
      if (couponInput) couponInput.value = appliedCoupon.code;
      if (couponRemoveBtn) couponRemoveBtn.hidden = false;
    } else {
      couponMsg.hidden = true;
      if (couponRemoveBtn) couponRemoveBtn.hidden = true;
    }
  }
  function applyCoupon() {
    if (couponInput && couponInput.value && !String(couponInput.value).trim()) return;
    requireTelegram(() => {
      const code = String(couponInput ? couponInput.value : "").trim();
      if (!code) return;
      const res = (typeof validateCoupon === "function") ? validateCoupon(code, getTelegram()) : { error: "not-found" };
      const fail = msg => {
        appliedCoupon = null;
        if (couponMsg) { couponMsg.innerHTML = msg; couponMsg.classList.add("is-err"); couponMsg.hidden = false; }
        if (couponRemoveBtn) couponRemoveBtn.hidden = true;
      };
      if (!res.ok) {
        const claimed = claimedList();
        const used = res.error === "used" || claimed.includes(String(code).toUpperCase());
        fail(used ? t("couponErrUsed") : res.error === "not-yours" ? t("couponErrElse") : t("couponErrNF"));
        return;
      }
      const accept = () => {
        appliedCoupon = res.coupon;
        renderCart();
        showToast(t("couponOk"));
      };
      /* cross-device single-use: if someone else already claimed this code
         on the server, refuse it (graceful if the claims table is missing) */
      if (typeof dbIsCouponClaimed === "function") {
        Promise.resolve(dbIsCouponClaimed(code)).then(claimedOnServer => {
          if (claimedOnServer === true) { fail(t("couponErrUsed")); return; }
          accept();
        });
        return;
      }
      accept();
    });
  }
  if (couponApplyBtn) couponApplyBtn.addEventListener("click", applyCoupon);
  if (couponInput) couponInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } });
  if (couponRemoveBtn) couponRemoveBtn.addEventListener("click", () => { appliedCoupon = null; if (couponInput) couponInput.value = ""; renderCart(); });

  /* ---------- پرداخت / checkout flow (card → receive → tracking code → telegram) ---------- */
  const payOverlay = $id("payOverlay");
  const payModalEl = $id("payModal");
  const payStep1 = $id("payStep1");
  const payStep2 = $id("payStep2");
  const payItemsEl = $id("payItems");
  const payCardNum = $id("payCardNum");
  const payCardName = $id("payCardName");
  const payFile = $id("payFile");
  const payDrop = $id("payDrop");
  const payPrevWrap = $id("payPrevWrap");
  const payPrev = $id("payPrev");
  const payClear = $id("payClear");
  const paySubmit = $id("paySubmit");
  const payCode = $id("payCode");
  const copyCodeBtn = $id("copyCode");
  const payDone = $id("payDone");
  let payFlow = null;
  let payDataUrl = "";

  function fmtCard(v) {
    return String(v || "").replace(/[^0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
  }
  function makeTrackCode() {
    const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
    return "ZSH-" + s + "-" + Date.now().toString(36).toUpperCase().slice(-3);
  }
  function openPayModal() {
    if (!payModalEl || !payFlow) return;
    const card = fmtCard(getSetting("pay_card"));
    const holder = String(getSetting("pay_card_name") || "").trim();
    payCardNum.textContent = card || "6037-0000-0000-0000";
    payCardName.textContent = holder || "—";
    payItemsEl.innerHTML = (payFlow.items || []).map(n => {
      const s = findSkin(n);
      const price = s ? skinFinalPrice(s) : 0;
      return `<div class="pay-item"><span>${escT(s ? s.name : n)}</span><b>${twoFix(price)} ${unitTxt()}</b></div>`;
    }).join("");
    if (payFlow.discountAmt > 0 && payFlow.couponCode) {
      payItemsEl.insertAdjacentHTML("beforeend",
        `<div class="pay-item pay-item--disc"><span>${t("couponOff")} (${escT(payFlow.couponCode)})</span><b>-${twoFix(payFlow.discountAmt)} ${unitTxt()}</b></div>`);
    }
    payItemsEl.insertAdjacentHTML("beforeend",
      `<div class="pay-item pay-item--total"><span>${t("cartTotal")}</span><b>${twoFix(payFlow.total)} ${unitTxt()}</b></div>`);
    payDataUrl = "";
    if (payFile) payFile.value = "";
    if (payPrev) payPrev.removeAttribute("src");
    if (payPrevWrap) payPrevWrap.hidden = true;
    if (paySubmit) paySubmit.disabled = true;
    if (payStep1) payStep1.hidden = false;
    if (payStep2) payStep2.hidden = true;
    if (payCode) payCode.textContent = "---";
    payModalEl.classList.add("is-open");
    if (payOverlay) payOverlay.classList.add("is-open");
    closeCart();
  }
  function closePayModal() {
    payFlow = null; payDataUrl = "";
    if (payModalEl) payModalEl.classList.remove("is-open");
    if (payOverlay) payOverlay.classList.remove("is-open");
  }
  /* receipts are stored base64 INSIDE the order row: an untouched 8 MB photo makes
     the orders query so heavy it times out and the admin panel shows nothing.
     Shrink it (like the hero image) before it ever reaches the database. */
  function shrinkReceipt(dataUrl, cb) {
    const img = new Image();
    img.onload = () => {
      const MAXW = 1400;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) { cb(dataUrl); return; }
      if (w > MAXW) { h = Math.round(h * MAXW / w); w = MAXW; }
      try {
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        const out = cv.toDataURL("image/webp", .82);
        cb((!out || out.length >= dataUrl.length) ? dataUrl : out);
      } catch { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }
  function setReceiptFile(f) {
    if (!f || !/^image\//.test(f.type)) { showToast(t("payDropBad"), true); return; }
    if (f.size > 8 * 1024 * 1024) { showToast(t("payDropBig"), true); return; }
    const fr = new FileReader();
    if (fr.error) return;
    fr.onload = () => {
      shrinkReceipt(String(fr.result || ""), out => {
        payDataUrl = out;
        if (payPrev) payPrev.setAttribute("src", payDataUrl);
        if (payPrevWrap) payPrevWrap.hidden = false;
        if (paySubmit) paySubmit.disabled = false;
      });
    };
    fr.readAsDataURL(f);
  }
  if (payDrop) {
    payDrop.addEventListener("click", () => { if (payFile) payFile.click(); });
    ["dragover", "dragleave", "drop"].forEach(ev => {
      payDrop.addEventListener(ev, e => {
        e.preventDefault();
        if (ev === "dragleave") { payDrop.classList.remove("is-drag"); return; }
        if (ev === "dragover") { payDrop.classList.add("is-drag"); return; }
        payDrop.classList.remove("is-drag");
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) setReceiptFile(f);
      });
    });
  }
  if (payFile) payFile.addEventListener("change", () => {
    const f = payFile.files && payFile.files[0];
    if (f) setReceiptFile(f);
  });
  if (payClear) payClear.addEventListener("click", () => {
    payDataUrl = "";
    if (payFile) payFile.value = "";
    if (payPrev) payPrev.removeAttribute("src");
    if (payPrevWrap) payPrevWrap.hidden = true;
    if (paySubmit) paySubmit.disabled = true;
  });
  const closePayEls = [payOverlay, $id("closePay"), payDone];
  closePayEls.forEach(el => { if (el) el.addEventListener("click", closePayModal); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && payModalEl && payModalEl.classList.contains("is-open")) closePayModal();
  });
  if (copyCodeBtn) copyCodeBtn.addEventListener("click", () => {
    const code = String(payCode && payCode.textContent ? payCode.textContent : "").trim();
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code);
      else {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
    } catch { /* ignore */ }
    showToast(t("payCopied"));
  });
  if (paySubmit) paySubmit.addEventListener("click", () => {
    const flow = payFlow;
    if (!flow || !flow.newOrder) return;
    if (!payDataUrl) { showToast(t("payDropBad"), true); return; }
    const tg = flow.tg;
    const CD_MS = 30000;
    paySubmit.disabled = true;
    const code = makeTrackCode();
    flow.newOrder.items.push({ special: "receipt", code: code, img: payDataUrl });
    if (typeof placeOrder === "function") {
      placeOrder(flow.newOrder);
    } else {
      const orders = getOrders();
      orders.push(flow.newOrder);
      saveOrders(orders);
    }
    addUser(tg);
    if (flow.couponCode) {
      claimLocal(String(flow.couponCode).toUpperCase());
      if (typeof dbClaimCoupon === "function") {
        Promise.resolve(dbClaimCoupon(String(flow.couponCode).toUpperCase(), tg))
          .then(r => { if (r && r.ok === false) showToast(t("couponErrUsed"), true); });
      }
    }
    appliedCoupon = null;
    cart = [];
    saveCart();
    renderCart();
    closeCart();
    hideToast();
    localStorage.setItem(flow.tgKey, String(Date.now()));
    const cb = $id("checkoutBtn");
    if (cb) { cb.disabled = true; setTimeout(() => { cb.disabled = false; }, CD_MS); }
    const body = [...flow.msgBody];
    body.push(`\n${t("payTrackLbl")} ${code}`);
    const msg = encodeURIComponent(
      `🛒⚡️ New order ZEUSSHOP⚡️\n\n${body.join("\n")}\nCustomer telegram: ${tg}`
    );
    window.open("https://t.me/ZEUS_ADMIN0?text=" + msg, "_blank", "noopener");
    showToast(t("tCheckout", { tg }));
    if (payCode) payCode.textContent = code;
    if (payStep1) payStep1.hidden = true;
    if (payStep2) payStep2.hidden = false;
  });

  $id("checkoutBtn").addEventListener("click", () => {
    requireTelegram(async () => {
      const tg = getTelegram();
      const CD_MS = 30000;
      const tgKey = "zs_last_order_" + (String(tg || "").trim().replace(/[^\w@+]/gi, "") || "anon");
      const lastTs = Number(localStorage.getItem(tgKey) || 0);
      const wait = lastTs ? CD_MS - (Date.now() - lastTs) : 0;
      if (wait > 0) { showToast(t("ckWaitSec", { s: Math.ceil(wait / 1000) }), true); return; }
      if (typeof dbCheckoutAllowed === "function") {
        const gate = await dbCheckoutAllowed(tg);
        if (gate && gate.ok === false) { showToast(t("ckTooFast"), true); return; }
      }
      const EMOJIS = ["✅", "❤️‍🔥", "💸", "🛍️", "⭐", "💎", "🎁", "⚡", "🔫", "🛡️"];
      const items = cart.map((n, idx) => {
        const s = findSkin(n);
        if (!s) return n;
        return `${s.name} — ${twoFix(skinFinalPrice(s))} ${unitTxt()}${EMOJIS[idx % EMOJIS.length]}`;
      }).filter(Boolean);
      const total = cartFinal();
      const discountAmt = cartDiscount();
      const msgBody = [...items];
      if (discountAmt > 0 && appliedCoupon) {
        msgBody.push(`\n🏷️ ${t("couponOff")} (${appliedCoupon.code}): -${twoFix(discountAmt)} ${unitTxt()}`);
      }
      msgBody.push(`\nTotal: ${twoFix(total)} ${unitTxt()}`);
      const newOrder = {
        id: Date.now(),
        items: cart.map(n => {
          const s = findSkin(n);
          return s
            ? { name: n, price: skinFinalPrice(s), img: s.img, rarity: s.rarity, weapon: s.weapon, wear: s.wear, type: s.type }
            : { name: n, price: 0, img: "", rarity: "", weapon: "", wear: "", type: "" };
        }),
        total,
        telegram: tg,
        date: new Date().toISOString(),
        status: "pending",
        coupon: appliedCoupon ? appliedCoupon.code : "",
      };
      payFlow = {
        newOrder: newOrder,
        tg: tg,
        tgKey: tgKey,
        msgBody: msgBody,
        items: [...cart],
        total: total,
        discountAmt: discountAmt,
        couponCode: appliedCoupon ? appliedCoupon.code : "",
      };
      openPayModal();
    });
  });

  function openCart() {
    drawer.classList.add("is-open");
    miniCart.hidden = true;
    document.body.style.overflow = "";
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
    updateMiniCart();
  }

  const searchToggle = $id("searchToggle");
  const searchbar = $id("searchbar");
  const searchClear = $id("searchClear");
  function openSearch() {
    searchbar.classList.add("is-open");
    searchInput.focus();
  }
  function closeSearch() {
    searchbar.classList.remove("is-open");
    searchClear.hidden = true;
  }
  searchToggle.addEventListener("click", e => {
    e.stopPropagation();
    if (searchbar.classList.contains("is-open")) closeSearch();
    else openSearch();
  });
  searchInput.addEventListener("input", () => {
    searchClear.hidden = !searchInput.value.trim();
  });
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.hidden = true;
    globalState();
    searchInput.focus();
  });

  /* ===== Mobile hamburger menu ===== */
  const hamburgerBtn = $id("hamburgerBtn");
  const hamburgerMenu = $id("hamburgerMenu");
  if (hamburgerBtn && hamburgerMenu) {
    function closeHamburger() {
      hamburgerMenu.hidden = true;
      hamburgerBtn.classList.remove("is-open");
    }
    function toggleHamburger() {
      hamburgerMenu.hidden = !hamburgerMenu.hidden;
      hamburgerBtn.classList.toggle("is-open", !hamburgerMenu.hidden);
    }
    hamburgerBtn.addEventListener("click", e => {
      e.stopPropagation();
      toggleHamburger();
    });
    hamburgerMenu.querySelectorAll("[data-hm]").forEach(b => {
      b.addEventListener("click", () => {
        const target = $id(b.dataset.hm);
        if (target) target.click();
        closeHamburger();
      });
    });
    document.addEventListener("click", e => {
      if (!hamburgerMenu.hidden && !e.target.closest(".header")) closeHamburger();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !hamburgerMenu.hidden) closeHamburger();
    });
    window.addEventListener("resize", () => { if (window.innerWidth > 520) closeHamburger(); });
  }
  document.addEventListener("click", e => {
    if (searchbar.classList.contains("is-open") && !searchbar.contains(e.target)) closeSearch();
    if (drawer.classList.contains("is-open") && !drawer.contains(e.target) && !miniCart.contains(e.target)) closeCart();
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (searchbar.classList.contains("is-open")) closeSearch();
    if (drawer.classList.contains("is-open")) closeCart();
  });

  const hdrPill = document.querySelector(".header__in");
  const HEADER_COLLAPSE_Y = 42;
  const HEADER_EXPAND_Y = 10;
  let headerScrolled = false;
  const onScrollHeader = () => {
    const y = window.scrollY;
    if (!headerScrolled && y > HEADER_COLLAPSE_Y) headerScrolled = true;
    else if (headerScrolled && y < HEADER_EXPAND_Y) headerScrolled = false;
    hdrPill.classList.toggle("is-scrolled", headerScrolled);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  const filtersSide = $id("filters");
  const filtersBackdrop = $id("filtersBackdrop");
  const filtersClose = $id("filtersClose");
  function closeFilters() {
    filtersSide.classList.remove("is-open");
    if (filtersBackdrop) filtersBackdrop.classList.remove("is-on");
  }
  function openFilters() {
    filtersSide.classList.add("is-open");
    if (filtersBackdrop) filtersBackdrop.classList.add("is-on");
  }
  $id("filtersToggle").addEventListener("click", () =>
    filtersSide.classList.contains("is-open") ? closeFilters() : openFilters());
  if (filtersClose) filtersClose.addEventListener("click", closeFilters);
  if (filtersBackdrop) filtersBackdrop.addEventListener("click", closeFilters);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && filtersSide.classList.contains("is-open")) closeFilters();
  });

  /* never let a mobile drawer state leak to desktop: on wide screens the filters
     are an always-visible sticky column, so drop the is-open/is-on overlay state */
  let filtersResizeT;
  window.addEventListener("resize", () => {
    clearTimeout(filtersResizeT);
    filtersResizeT = setTimeout(() => {
      if (window.innerWidth > 900) closeFilters();
    }, 120);
  });

  document.querySelectorAll(".filter-group h3").forEach(h =>
    h.addEventListener("click", () => h.closest(".filter-group")?.classList.toggle("is-open")));

  $id("heroBrowse").addEventListener("click", () =>
    $id("market") ? $id("market").scrollIntoView({ behavior: "smooth" }) : null);

  /* =========================================================
     اعلامیه سایت (admin تنظیمش می‌کند)
     ========================================================= */
  const annEl = $id("annModal");
  if (annEl) {
    const annText = $id("annText");
    const annOk = $id("annOk");
    const body = document.body;
    function closeAnn() {
      annEl.classList.remove("is-on");
      body.classList.remove("ann-on");
      setTimeout(() => { annEl.hidden = true; }, 320);
    }
    function renderAnnouncement() {
      const a = getAnnouncement();
      if (!(a.enabled && String(a.text).trim())) {
        annEl.hidden = true;
        annEl.classList.remove("is-on");
        body.classList.remove("ann-on");
        return;
      }
      if (annText) annText.textContent = a.text;
      annEl.hidden = false;
      body.classList.add("ann-on");
      requestAnimationFrame(() => annEl.classList.add("is-on"));
    }
    annEl.addEventListener("click", e => {
      if (e.target === annEl || (e.target && e.target.hasAttribute("data-ann-close"))) closeAnn();
    });
    if (annOk) annOk.addEventListener("click", closeAnn);
    renderAnnouncement();
  }

  /* =========================================================
     اینونتوری کاربر (تاریخچه خرید)
     ========================================================= */
  const invNav = $id("invNav");
  if (invNav) {
    const invBack = $id("invBack");
    const invGrid = $id("invGrid");
    const invEmpty = $id("invEmpty");
    function renderUserInventory() {
      const tg = getTelegram();
      invGrid.innerHTML = "";
      if (!tg) {
        invEmpty.querySelector("p").textContent = t("invEmptyLoginTitle");
        invEmpty.hidden = false;
        return;
      }
      const list = getInventoryFor(tg);
      invEmpty.querySelector("p").textContent = t("invEmptyTitle");
      if (typeof isHeavyReady === "function" && typeof DB_MODE !== "undefined" && DB_MODE && !isHeavyReady() && !list.length) {
        invEmpty.querySelector("p").textContent = t("invLoading");
        invEmpty.classList.add("is-loading");
        invEmpty.hidden = false;
        invGrid.innerHTML = "";
        return;
      }
      invEmpty.classList.remove("is-loading");
      invEmpty.hidden = list.length !== 0;
      invGrid.innerHTML = list.map(it => {
        const r = RARITY[it.rarity] ? RARITY[it.rarity].color : "#f0c24b";
        const metaPts = it.type === "TF2"
          ? ["TF2"]
          : [it.weapon, it.wear, it.type && it.type !== "Normal" ? it.type : null].filter(Boolean);
        const date = (it.created_at || it.date) ? new Date((it.created_at || it.date)).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-GB") : "";
        return `
        <article class="card card--inv" style="--rarity:${r}">
          <div class="card__img">
            <span class="card__glow" aria-hidden="true"></span>
            <img src="${encImg(it.img)}" alt="${it.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2211%22 cy=%2211%22 r=%227%22 fill=%22%232b261a%22/><path d=%22m20 20-3.2-3.2%22 stroke=%22%23f0c24b%22/></svg>'" />
          </div>
          <div class="card__body">
            <div class="card__name" title="${it.name}">${it.name}</div>
            <div class="card__meta"><b>${it.wear || ""}</b>${metaPts.length ? " · " + metaPts.join(" · ") : ""}</div>
            <div class="card__bottom">
              <span class="card__price">${fmtNum(it.price)} <small>${unitTxt()}</small></span>
              <span class="inv-date">${date}</span>
            </div>
          </div>
        </article>`;
      }).join("");
    }
    function showInv(open) {
      document.body.classList.toggle("is-inv", open);
      if (open) { document.body.classList.remove("is-tf2"); window.scrollTo(0, 0); document.documentElement.scrollTop = 0; renderUserInventory(); }
    }
    invNav.addEventListener("click", e => { e.preventDefault(); showInv(!document.body.classList.contains("is-inv")); });
    if (invBack) invBack.addEventListener("click", () => showInv(false));
  }

  /* =========================================================
     قرعه‌کشی — فقط ادمین می‌چرخاند، بقیه به‌صورت زنده تماشا می‌کنند
     ========================================================= */
  let raffleSync = null;
  const raffleNav = $id("raffleNav");
  if (raffleNav) {
    const rModal = $id("raffleModal");
    const rOverlay = $id("raffleOverlay");
    const rCanvas = $id("raffleCanvas");
    const rTitle = $id("raffleTitle");
    const rWinner = $id("raffleWinner");
    const rEmpty = $id("raffleEmpty");
    const rStatus = $id("raffleStatus");
    let rOpen = false, rLastSeq = -1, rLastRot = null, rSpinTimer = null, rPollId = null, rEntries = [];
    const rBox = rModal ? (rModal.querySelector(".raffle-modal") || rModal) : null;

    function drawWheel(entries, winner) {
      drawRaffleWheel(rCanvas, entries, 340, winner);
    }

    function setRot(deg, animate) {
      if (!rCanvas) return;
      rCanvas.style.transition = animate ? "transform 5s cubic-bezier(.12,.72,.12,1.03)" : "none";
      void rCanvas.offsetWidth;
      rCanvas.style.transform = "rotate(" + deg + "deg)";
    }

    function spinTo(rot, winner, winnerIdx) {
      if (!rCanvas) return;
      if (rStatus) rStatus.textContent = t("raffleSpinning");
      if (rWinner) { rWinner.textContent = ""; rWinner.classList.remove("is-on"); }
      setWheelSpinFX(rCanvas, true);
      setRot(rot, true);
      clearTimeout(rSpinTimer);
      rSpinTimer = setTimeout(() => {
        setWheelSpinFX(rCanvas, false);
        if (rStatus) rStatus.textContent = "";
        if (rWinner) { rWinner.textContent = winner; rWinner.classList.add("is-on"); }
        drawWheel(rEntries, winnerIdx);
        if (winner) burstConfetti(rBox);
      }, 5000);
    }

    function applyRaffle(cfg) {
      if (!rModal) return;
      if (rTitle) rTitle.textContent = cfg.title || t("raffleTitle");
      const has = cfg.entries.length > 0;
      if (rEmpty) rEmpty.hidden = has;
      rEntries = cfg.entries;
      drawWheel(cfg.entries, cfg.winnerIndex);
      if (!has) { if (rWinner) rWinner.textContent = ""; return; }
      if (rLastRot === null) {
        setRot(cfg.rotation, false);
        rLastRot = cfg.rotation;
        rLastSeq = cfg.seq;
        if (rWinner) rWinner.textContent = cfg.winnerIndex >= 0 ? (cfg.entries[cfg.winnerIndex] || "") : "";
        return;
      }
      if (cfg.seq !== rLastSeq) {
        rLastSeq = cfg.seq;
        rLastRot = cfg.rotation;
        spinTo(cfg.rotation, cfg.entries[cfg.winnerIndex] || "", cfg.winnerIndex);
      }
    }

    function openRaffle() {
      const rf = getRaffle();
      if (!rf.enabled) {
        showToast(t("raffleOff"), true);
        return;
      }
      rOpen = true;
      rModal.classList.add("is-open");
      if (rOverlay) rOverlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      rLastRot = null;
      rLastSeq = -1;
      applyRaffle(getRaffle());
      if (typeof refreshSettings === "function") refreshSettings();
      if (!rPollId) rPollId = setInterval(() => { if (typeof refreshSettings === "function") refreshSettings(); }, 2500);
    }
    function closeRaffle() {
      rOpen = false;
      rModal.classList.remove("is-open");
      if (rOverlay) rOverlay.classList.remove("is-open");
      document.body.style.overflow = "";
      clearInterval(rPollId); rPollId = null;
      clearTimeout(rSpinTimer);
    }

    raffleNav.addEventListener("click", openRaffle);
    const closeRaffleBtn = $id("closeRaffle");
    if (closeRaffleBtn) closeRaffleBtn.addEventListener("click", closeRaffle);
    if (rOverlay) rOverlay.addEventListener("click", closeRaffle);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && rOpen) closeRaffle(); });

    raffleSync = () => {
      const rf = getRaffle();
      if (raffleNav) raffleNav.classList.toggle("is-disabled", !rf.enabled);
      if (!rOpen) return;
      if (!rf.enabled) {
        closeRaffle();
        showToast(t("raffleOff"), true);
        return;
      }
      applyRaffle(rf);
    };
    raffleSync();
  }

  renderCart();

  /* ---------- آخرین خریدهای تاییدشده (مارکیِ CSS با حرکت خودکار) ----------
     The endless motion is a pure-CSS translateX marquee on the track: it
     starts with the stylesheet, so no JS error can ever freeze it. JS only
     (a) duplicates the set until one period always fits the viewport,
     (b) tunes speed via --rail-dur / --rail-shift, (c) freezes it while the
     user holds or pans, and (d) falls back to scrollLeft writes when an old
     cached stylesheet has no marquee rule (partial upload still moves). */
  const latestEl = $id("latestBuy");
  const recentSlide = $id("recentSlide");
  const latestCount = $id("latestCount");
  const recentScroll = $id("recentScroll");   /* overflow-x container     */
  const recentRail = $id("recentRail");       /* wrapper: edge fades */

  function avatarOf(tg) {
    const uname = tgUsername(tg);
    return uname ? "https://t.me/i/userpic/320/" + uname + ".jpg" : "";
  }
  function tickerChip(it, o) {
    const tg = String(o.telegram || "");
    const name = String(it.name || "");
    const img = String(it.img || "");
    const price = Number(it.price) || 0;
    const rc = (it.rarity && RARITY[it.rarity]) ? RARITY[it.rarity].color : "#f0c24b";
    const weaponL = String(it.weapon || "");
    const av = avatarOf(tg);
    const mark = (tg.replace(/^[\s@+]/, "") || "؟").trim();
    const initial = escT((mark.charAt(0) || "؟").toUpperCase());
    return `
      <div class="bought" style="--c:${rc}">
        <span class="bought__av" data-mark="${mark ? escT(mark) : ""}">
          <em>${initial}</em>
          ${av ? `<img src="${encImg(av)}" alt="${escT(tg)}" loading="lazy" onerror="this.remove()" />` : ""}
        </span>
        <span class="bought__who-item">
          <b dir="ltr">${escT(tg)}</b>
          <i><b class="bought__sub">${timeAgo(o.date)}</b></i>
        </span>
        <span class="bought__sep" aria-hidden="true"></span>
        <span class="bought__skin">
          <span class="bought__gun">
            ${img
              ? `<img src="${encImg(img)}" alt="" loading="lazy" onerror="this.remove()" />`
              : `<em>${weaponL ? escT(weaponL.charAt(0)) : "؟"}</em>`}
          </span>
          <span class="bought__meta">
            <b title="${escT(name)}">${name ? escT(name) : "؟"}</b>
            <i>${fmtPrice(price)}</i>
          </span>
        </span>
      </div>`;
  }

  /* ---------- rail engine ---------- */
  const railReduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rail = { loop: 0, hold: false, holdSince: 0, target: 46, last: 0, vel: 46, frame: 0, css: false, selfWrite: false };

  /* console diagnostics: __zeusRailDebug() → tells you exactly WHY it is paused */
  window.__zeusRailDebug = function () {
    const d = {
      loop: rail.loop, hold: rail.hold, css: rail.css,
      dur: recentSlide && recentSlide.style ? recentSlide.style.getPropertyValue("--rail-dur") : "",
      reduce: railReduce, tabHidden: document.hidden,
      sectionHidden: !!(latestEl && latestEl.hidden),
      scrollW: recentScroll ? recentScroll.scrollWidth : -1,
      clientW: recentScroll ? recentScroll.clientWidth : -1,
      scrollLeft: recentScroll ? recentScroll.scrollLeft : -1,
      sets: recentSlide ? recentSlide.children.length : -1
    };
    d.pausedBy =
      d.sectionHidden ? "section-hidden"
      : d.tabHidden ? "tab-hidden"
      : !d.loop ? "loop-0"
      : d.hold ? "hold"
      : (recentRail && recentRail.classList.contains("is-panning")) ? "panning"
      : "RUNNING";
    return d;
  };

  /* The marquee is endless in both directions (enough copies), so the edge
     fades stay on; only a strip with nothing to scroll hides them. */
  function railFades() {
    if (recentRail) recentRail.classList.toggle("is-static", !rail.loop);
  }

  /* how far the user may pan: every point of the track must stay covered by
     (copies - 1) periods + the viewport, or a blank gap could open at the
     tail while the marquee keeps sliding */
  function railMaxOK() {
    if (!recentScroll || !rail.loop) return 0;
    return Math.max(0, (recentSlide.children.length - 1) * rail.loop - recentScroll.clientWidth);
  }

  /* keep a user pan inside the covered range — never while a gesture runs */
  function railNormalize() {
    if (!recentScroll || rail.hold) return;
    const sl = recentScroll.scrollLeft;
    const maxOK = railMaxOK();
    if (sl < 0) recentScroll.scrollLeft = 0;
    else if (sl > maxOK) recentScroll.scrollLeft = maxOK;
  }

  /* Does the stylesheet own the motion? New CSS = translateX marquee on the
     track (pure CSS — impossible for a JS error to freeze). Old cached CSS has
     no marquee rule -> JS drives scrollLeft instead, so even a PARTIAL upload
     can never leave the strip dead. */
  function railCssOwns() {
    if (!recentSlide || !window.getComputedStyle) return false;
    const an = window.getComputedStyle(recentSlide).animationName || "";
    return an.indexOf("rail-marquee") !== -1;
  }

  /* Duplicate the set until (copies - 1) periods always cover the viewport
     (one full period must always be reachable — the old two-copy math stalled
     a set narrower than the screen), then publish the marquee's period shift
     and a duration that keeps a constant speed. Re-run periodically so late
     layout (webfonts, images, resize) re-measures. */
  function railEnsureLoop() {
    if (!recentScroll || !recentSlide) { rail.loop = 0; return; }
    const one = recentSlide.firstElementChild;
    const viewport = recentScroll.clientWidth;
    if (!one || !viewport) { rail.loop = 0; return; }
    const setW = one.getBoundingClientRect().width;
    if (!(setW > 0)) {
      rail.loop = 0;
      if (recentRail) recentRail.classList.add("is-static");
      return;
    }
    const need = Math.ceil((viewport + 32) / setW) + 1;
    const sets = recentSlide.children;
    while (sets.length < need) {
      const clone = one.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      recentSlide.appendChild(clone);
    }
    while (sets.length > need) recentSlide.removeChild(recentSlide.lastElementChild);
    rail.loop = setW;                        /* one set = exactly one period */
    rail.css = railCssOwns();
    if (recentSlide.style) {
      recentSlide.style.setProperty("--rail-shift", -(100 / sets.length) + "%");
      recentSlide.style.setProperty("--rail-dur", Math.max(8, setW / rail.target) + "s");
    }
    if (recentRail) recentRail.classList.remove("is-static");
  }

  function railTick(ts) {
    requestAnimationFrame(railTick);
    if (!recentScroll || !latestEl || latestEl.hidden) { rail.last = ts || 0; return; }
    rail.frame = (rail.frame + 1) % 90;
    if (!rail.loop || rail.frame === 0) railEnsureLoop();  /* self-heal + re-measure ~1.5s */
    /* safety net: a pointerup/cancel we never saw must not hold it forever */
    if (rail.hold && rail.holdSince && (Date.now() - rail.holdSince) > 6000) {
      rail.hold = false; rail.holdSince = 0;
    }
    if (recentRail) recentRail.classList.toggle("is-hold", rail.hold);
    railFades();
    if (rail.css) return;                   /* CSS marquee owns the motion */

    /* --- fallback: stylesheet without the marquee rule (stale CSS) --- */
    if (!rail.last) rail.last = ts;
    const dt = Math.min(0.06, Math.max(0, (ts - rail.last) / 1000));
    rail.last = ts;
    const panning = recentRail && recentRail.classList.contains("is-panning");
    if (!rail.loop || rail.hold || panning) {
      rail.vel *= Math.exp(-dt * 8);        /* decelerate, then ramp back up */
      if (rail.vel < 1) rail.vel = 0;
      return;
    }
    rail.vel += (rail.target - rail.vel) * Math.min(1, dt * 8);
    let sl = recentScroll.scrollLeft + rail.vel * dt;
    if (sl >= rail.loop) sl -= rail.loop;
    rail.selfWrite = true;                  /* scroll listener: ignore our own write */
    recentScroll.scrollLeft = sl;
  }
  if (recentScroll) requestAnimationFrame(railTick);
  /* webfonts can widen the chips after first paint — re-measure once ready */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { rail.loop = 0; });

  function setLatestCount(itemCount, recent) {
    if (!latestCount || !recent || !recent[0]) return;
    latestCount.textContent =
      (lang === "fa" ? showNum(itemCount) + " آیتم خرید اخیر ・ " + timeAgo(recent[0].date)
                     : showNum(itemCount) + " recent items ・ " + timeAgo(recent[0].date));
  }

  function hideLatest() {
    if (latestEl) latestEl.hidden = true;
    if (recentSlide) { recentSlide.innerHTML = ""; recentSlide._lk = ""; }
    rail.loop = 0;
    if (latestCount) latestCount.textContent = "";
  }

  /* one set is drawn here; railEnsureLoop duplicates it as often as needed —
     each .recent__set is exactly one period, so the wrap seam stays invisible */
  function railBuild(chips) {
    if (!recentScroll || !recentSlide) return;
    const keep = recentScroll.scrollLeft;
    recentSlide.innerHTML = '<div class="recent__set">' + chips + "</div>";
    rail.loop = 0;
    railEnsureLoop();
    recentScroll.scrollLeft = Math.max(0, Math.min(keep, railMaxOK()));
    railFades();
  }

  function renderLatest() {
    if (!latestEl || !recentSlide) return;
    const approved = getOrders().filter(o => o.status === "approved");
    if (!approved.length) { hideLatest(); return; }
    const seen = new Set();
    const uniq = approved.filter(o => {
      if (!o || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    uniq.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const recent = uniq.slice(0, 12);
    let chips = "";
    let itemCount = 0;
    recent.forEach(o => {
      (Array.isArray(o.items) ? o.items : []).forEach(it => {
        if (!it || typeof it !== "object" || it.special) return;
        /* Every real item gets its own chip and its own +1 — NO name-dedup:
           a second buyer of the same skin is still a purchase, and the header
           count must match what the strip shows (a 2-item buy has to add 2,
           not 1). Nameless junk rows (legacy receipts) are skipped. */
        if (!String(it.name || "").trim()) return;
        chips += tickerChip(it, o);
        itemCount++;
      });
    });
    if (!chips) { hideLatest(); return; }

    /* Don't rebuild when nothing changed: DB events and resizes fire often and
       a rebuild would visibly restart the strip. Width is bucketed to 48px so a
       URL-bar/scrollbar twitch can't re-key it, while a real width change still
       flips the rail between static and scrolling. */
    const railW = recentScroll ? Math.round(recentScroll.clientWidth / 48) : 0;
    const stableKey = itemCount + "|W" + railW + "|" + recent.map(o => o.id).join(",");
    if (recentSlide._lk === stableKey) {
      latestEl.hidden = false;
      setLatestCount(itemCount, recent);
      railFades();
      return;
    }
    recentSlide._lk = stableKey;
    latestEl.hidden = false;   /* MUST be visible before measuring: while hidden
                                  the section is display:none, clientWidth is 0 and
                                  the rail would be built (and stay) static forever */
    railBuild(chips);
    setLatestCount(itemCount, recent);
  }

  (function initRail() {
    if (!recentScroll || recentScroll._in) return;
    recentScroll._in = true;
    let pid = null, dragging = false, startX = 0, startSL = 0;

    /* Hold freezes the auto-advance on every device; on top of that, mice can
       drag the strip (touch & trackpad already pan through native scrolling). */
    recentScroll.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      rail.hold = true; rail.holdSince = Date.now();
      if (e.pointerType === "mouse") {
        pid = e.pointerId; dragging = true;
        startX = e.clientX; startSL = recentScroll.scrollLeft;
        if (recentRail) recentRail.classList.add("is-dragging");
        try { recentScroll.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    });    recentScroll.addEventListener("pointermove", e => {
      if (!dragging || e.pointerId !== pid) return;
      recentScroll.scrollLeft = Math.max(0, Math.min(startSL - (e.clientX - startX), railMaxOK()));  /* follows cursor, inside covered range */
      railFades();
    });
    /* Release is bound to WINDOW: a pointerup/cancel outside the strip (or an
       event the element never saw) must never be able to freeze the rail. */
    const release = () => {
      if (!rail.hold && !dragging) return;
      rail.hold = false; rail.holdSince = 0;
      if (dragging) {
        const capPid = pid;
        dragging = false; pid = null;
        if (recentRail) recentRail.classList.remove("is-dragging");
        if (capPid !== null) { try { recentScroll.releasePointerCapture(capPid); } catch { /* ignore */ } }
      }
      railNormalize();
      railFades();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    /* NO hover-pause on purpose: resting the mouse over the strip must not stop
       it. Press-&-hold (and touch) is the deliberate way to freeze it. */

    /* A scroll event can only mean the USER is panning (the CSS marquee never
       touches scrollLeft, and fallback writes flag themselves): hold the
       animation for the gesture + momentum, then let it resume. */
    let panT = 0;
    recentScroll.addEventListener("scroll", () => {
      if (rail.selfWrite) { rail.selfWrite = false; return; }  /* our own fallback write */
      if (!rail.hold) railNormalize();
      if (recentRail) recentRail.classList.add("is-panning");
      clearTimeout(panT);
      panT = setTimeout(() => {
        if (recentRail) recentRail.classList.remove("is-panning");
        railNormalize();
      }, 180);
      railFades();
    }, { passive: true });
  })();

  renderLatest();
  let latestResizeT;
  window.addEventListener("resize", () => {
    clearTimeout(latestResizeT);
    latestResizeT = setTimeout(renderLatest, 150);
  });

  /* ---------- live DB updates (Supabase) ---------- */
  document.addEventListener("zeus-db-ready", () => {
    if (typeof globalState === "function") globalState();
    try { renderAnnouncement(); } catch { /* ignore */ }
    try { renderCart(); } catch { /* ignore */ }
    if (typeof refreshHero === "function") refreshHero();
    try { renderLatest(); } catch { /* ignore */ }
    if (raffleSync) raffleSync();
  });
  document.addEventListener("zeus-db", e => {
    const type = (e.detail && e.detail.type) || "";
    if (type === "catalog") { if (typeof globalState === "function") globalState(); if (typeof refreshHero === "function") refreshHero(); }
    if (type === "announcement") { try { renderAnnouncement(); } catch { /* ignore */ } }
    if (type === "settings") { if (typeof globalState === "function") globalState(); if (typeof applyHeroImg === "function") applyHeroImg(); if (raffleSync) raffleSync(); }
    if (type === "orders") { try { renderLatest(); } catch { /* ignore */ } }
    if (type === "users") { if (typeof refreshHero === "function") refreshHero(); }
    if (type === "inventory" && typeof document !== "undefined" && document.body.classList.contains("is-inv") && typeof renderUserInventory === "function") {
      try { renderUserInventory(); } catch { /* ignore */ }
    }
  });
}

/* =========================================================
   شمارنده‌های انیمیشنی
   ========================================================= */
function animateCount(el) {
  if (!el) return;
  const target = +String(el.dataset.count || "0").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const prefix = el.dataset.prefix || "";
  const dur = 1400, start = performance.now();
  const step = now => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(target * eased);
    el.textContent = prefix + showNum(val.toLocaleString("en-US"));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.querySelectorAll("[data-count]").forEach(animateCount);

/* =========================================================
   شروع
   ========================================================= */
document.body.classList.add("js");
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-in"); revealIO.unobserve(en.target); } });
}, { threshold: .1 });
document.querySelectorAll(".reveal").forEach(el => revealIO.observe(el));

applyLang();