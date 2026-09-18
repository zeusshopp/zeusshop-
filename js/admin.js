/* =========================================================
   ZEUSSHOP — Admin (login + panel) logic
   Depends on main.js (shared i18n, skins, storage helpers)
   ========================================================= */

/* ---------- session ---------- */
async function checkSession() {
  const isLogin = !!$id("loginForm");
  if (typeof DB_MODE === "boolean" && DB_MODE) {
    /* wait until the Supabase layer finishes connecting/loading */
    if (typeof DB_READY !== "boolean" || !DB_READY) {
      try {
        await new Promise(res => {
          const h = () => { document.removeEventListener("zeus-db-ready", h); res(); };
          document.addEventListener("zeus-db-ready", h);
          setTimeout(h, 6000);
        });
      } catch { /* ignore */ }
    }
    if (typeof isDbMode === "function" && isDbMode()) {
      const s = await dbAdminSession();
      if (isLogin && s) { location.replace("admin.html"); return; }
      if (!isLogin && !s) { location.replace("admin-login.html"); return; }
      return;
    }
  }
  let sess = "";
  try { sess = localStorage.getItem("skm_admin") || ""; } catch { /* ignore */ }
  if (isLogin) {
    if (sess === "1") location.replace("admin.html");
  } else if (sess !== "1") {
    location.replace("admin-login.html");
  }
}
checkSession();

/* =========================================================
   LOGIN PAGE — DB mode: Supabase email/password (secure)
                 fallback: username / password (localStorage)
   ========================================================= */
const loginForm = $id("loginForm");
if (loginForm) {
  const userEl = $id("adminUser");
  const passEl = $id("adminPass");
  const errEl = $id("loginErr");
  const submitBtn = loginForm.querySelector("button[type='submit']");
  const dbActive = () => typeof isDbMode === "function" && isDbMode();

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    errEl.classList.remove("is-on");
    if (submitBtn) submitBtn.disabled = true;

    if (dbActive()) {
      const email = userEl.value.trim();
      const pass = passEl.value;
      if (!email || !pass) {
        errEl.textContent = lang === "fa" ? "ایمیل و رمز عبور را وارد کنید." : "Enter email and password.";
        errEl.classList.add("is-on");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
      const res = await dbAdminLogin(email, pass);
      if (submitBtn) submitBtn.disabled = false;
      if (res && res.ok) {
        showToast(lang === "fa" ? "ورود موفق ✓" : "Login successful ✓");
        setTimeout(() => location.href = "admin.html", 400);
      } else {
        errEl.textContent = lang === "fa"
          ? "ایمیل یا رمز عبور اشتباه است."
          : (res && res.error && res.error !== "no-db") ? res.error : "Wrong email or password.";
        errEl.classList.add("is-on");
      }
    } else {
      const u = userEl.value.trim();
      const p = passEl.value;
      const creds = getAdminCreds();
      if (u === creds.user && p === creds.pass) {
        try { localStorage.setItem("skm_admin", "1"); } catch { /* ignore */ }
        showToast(lang === "fa" ? "ورود موفق ✓" : "Login successful ✓");
        setTimeout(() => location.href = "admin.html", 400);
      } else {
        errEl.textContent = lang === "fa" ? "نام کاربری یا رمز عبور اشتباه است." : "Wrong username or password.";
        errEl.classList.add("is-on");
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  });
  [userEl, passEl].forEach(el => el.addEventListener("input", () => errEl.classList.remove("is-on")));
}

/* =========================================================
   ADMIN PANEL
   ========================================================= */
const adminMain = document.querySelector(".admin__main");
if (adminMain) {

  /* ---------- custom skins (storage handled by db.js — Supabase/local) ---------- */
  const addCustomSkin = obj => {
    const custom = getCustom().filter(s => s.name !== obj.name);
    custom.push(obj);
    saveCustom(custom);
  };

  const RARITY_LABEL = {
    consumer: "Consumer Grade", industrial: "Industrial Grade", milspec: "Mil-Spec Grade",
    restricted: "Restricted", classified: "Classified", covert: "Covert", extraordinary: "Extraordinary",
  };
  const RARITY_KEY = {
    "Consumer Grade": "consumer", "Industrial Grade": "industrial", "Mil-Spec Grade": "milspec",
    Restricted: "restricted", Classified: "classified", Covert: "covert", Extraordinary: "extraordinary",
  };

  const FA = (fa, en) => (lang === "fa" ? fa : en);

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(lang === "fa" ? "fa-IR" : "en-GB");
    } catch { return ""; }
  };

  /* ---------- stats ---------- */
  function renderStats() {
    $id("statSkins").textContent = toFaDigits(getSkins().length);
    $id("statOrders").textContent = toFaDigits(getOrders().filter(o => o.status === "pending").length);
    $id("statUsers").textContent = toFaDigits(getUsers().length);
  }

  /* ---------- inventory («موجودی») with search + discount ---------- */
  let invQuery = "";
  function renderInventory() {
    const grid = $id("inventoryGrid");
    const empty = $id("admEmpty");
    const count = $id("invCount");
    const q = invQuery.trim().toLowerCase();
    const list = getSkins().filter(s => !q || s.name.toLowerCase().includes(q));
    empty.hidden = list.length !== 0;
    if (count) count.textContent = list.length;
    grid.innerHTML = list.map((s, idx) => {
      const r = RARITY[s.rarity] ? RARITY[s.rarity].color : "#f0c24b";
      const d = skinDiscount(s);
      const isOff = d > 0;
      return `
      <article class="card skin-card card--enter${isOff ? " is-off" : ""}" style="--rarity:${r};animation-delay:${Math.min(idx, 11) * 40}ms" data-name="${s.name}">
        <div class="card__img">
          <span class="card__glow" aria-hidden="true"></span>
          <img src="${encImg(s.img)}" alt="${s.name}" loading="lazy" onerror="this.closest('.card__img').classList.add('is-missing')" />
        </div>
        <div class="card__body">
          <div class="card__name" title="${s.name}">${s.name}</div>
          <div class="card__meta"><b>${s.wear}</b> · ${s.weapon}</div>
          <div class="card__bottom">
            <span class="card__price">${priceInner(s)}</span>
          </div>
        </div>
        <div class="skin__actions">
          <button class="btn btn--sm btn--disc" data-disc="${s.name}" title="${FA("تنظیم تخفیف", "Set discount")}">${FA("تخفیف", "Disc")}${isOff ? " " + d + "%" : ""}</button>
          <button class="btn btn--sm btn--ghost" data-edit="${s.name}">${FA("ویرایش", "Edit")}</button>
          <button class="btn btn--sm btn--danger" data-del="${s.name}">${FA("حذف", "Delete")}</button>
        </div>
      </article>`;
    }).join("");
  }

  const invSearch = $id("invSearch");
  if (invSearch) {
    let invTimer = 0;
    invSearch.addEventListener("input", e => {
      invQuery = e.target.value;
      clearTimeout(invTimer);
      invTimer = setTimeout(renderInventory, 140);
    });
  }

  /* ---------- orders — approve / reject → user inventory ---------- */
  let ordFilter = "all";
  const ORD_LBL = {
    pending:  { cls: "badge--pending",  fa: "در انتظار", en: "Pending" },
    approved: { cls: "badge--ok",       fa: "تایید شده", en: "Approved" },
    rejected: { cls: "badge--danger",   fa: "رد شده",    en: "Rejected" },
  };
  function renderOrders() {
    const wrap = $id("ordersList");
    const empty = $id("admOrdersEmpty");
    const list = getOrders().slice().sort((a, b) => b.id - a.id).filter(o => {
      return ordFilter === "all" ? true : (o.status || "pending") === ordFilter;
    });
    empty.hidden = list.length !== 0;
    const matchFilters = document.querySelectorAll("#ordFilters .chip");
    if (matchFilters.length) {
      matchFilters.forEach(c => c.classList.toggle("is-active", c.dataset.filter === ordFilter));
    }
    wrap.innerHTML = list.map(o => {
      const st = o.status || "pending";
      const meta = ORD_LBL[st] || ORD_LBL.pending;
      const items = (o.items || []).map((it, idx) => {
        const r = RARITY[it.rarity] ? RARITY[it.rarity].color : "#f0c24b";
        return `<span class="order-item" style="--oc:${r}">${esc(it.name)}<em>${twoFix(it.price)} ${unitTxt()}</em><button class="order-item__x" data-del-item="${o.id}|${idx}" title="${FA("حذف این آیتم", "Remove item")}">×</button></span>`;
      }).join("");
      const date = fmtDate(o.date);
      const sumItems = (o.items || []).reduce((s, it) => s + (Number(it && it.price) || 0), 0);
      const discTag = Number(o.total) < sumItems - 0.01
        ? ` <span class="order-row__disc">${FA("تخفیف", "Disc")}: -${fmtPrice(sumItems - Number(o.total))}</span>`
        : "";
      const codeTag = o.coupon
        ? ` <span class="order-row__code" dir="ltr">${esc(o.coupon)}</span>`
        : "";
      const actions = st === "pending"
        ? `<button class="btn btn--sm btn--ok" data-approve="${o.id}">${FA("تایید ✓", "Approve ✓")}</button>
           <button class="btn btn--sm btn--danger" data-reject="${o.id}">${FA("رد", "Reject")}</button>
           <button class="btn btn--sm btn--ghost" data-delord="${o.id}" title="${FA("حذف سفارش", "Delete order")}">${FA("حذف", "Delete")}</button>`
        : `<button class="btn btn--sm btn--ghost" data-delord="${o.id}" title="${FA("حذف سفارش از لیست", "Delete order")}">${FA("حذف", "Delete")}</button>`;
      const ordColor = st === "approved" ? "var(--success)" : st === "rejected" ? "var(--danger)" : "var(--warning)";
      return `
      <div class="order-row" style="--ord-c:${ordColor}">
        <div class="order-row__head">
          <span class="order-row__id">#${esc(o.id)}</span>
          <span class="badge ${meta.cls}">${FA(meta.fa, meta.en)}</span>
        </div>
        <div class="order-row__items">${items || `<span class="order-row__meta">${FA("بدون آیتم", "No items")}</span>`}</div>
        <div class="order-row__meta">
          <span class="order-row__date">${date || "—"}</span>
          <span class="order-row__tg">${esc(o.telegram || "")}</span>
        </div>
        <div class="order-row__foot">
          <span class="order-row__total"><small>${FA("مجموع", "Total")}</small> ${fmtPrice(o.total)}${discTag}${codeTag}</span>
          <div class="order-row__actions">${actions}</div>
        </div>
      </div>`;
    }).join("");
  }

  const ordFilters = $id("ordFilters");
  if (ordFilters) ordFilters.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    ordFilter = chip.dataset.filter || "all";
    renderOrders();
  });

  /* ---------- discount coupons ---------- */
  function renderCoupons() {
    const wrap = $id("couponList");
    if (!wrap) return;
    const list = (typeof getCoupons === "function") ? getCoupons() : [];
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/></svg><p>${FA("کدی ساخته نشده است.", "No coupons yet.")}</p></div>`;
      return;
    }
    wrap.innerHTML = list.map(c => {
      const used = !!(c && c.used);
      const tgt = String((c && c.telegram) || "").replace(/^@/, "") || "—";
      return `
      <div class="coupon-item${used ? " is-used" : ""}">
        <div class="coupon-item__main">
          <b class="coupon-item__code" dir="ltr">${esc(c.code)}</b>
          <span class="coupon-item__meta">
            <i>${FA("تخفیف", "Disc")} ${toFaDigits(c.discount)}%</i>
            <i dir="ltr">@${esc(tgt)}</i>
          </span>
        </div>
        <div class="coupon-item__side">
          <span class="badge ${used ? "badge--danger" : "badge--ok"}">${used ? FA("استفاده شده", "Used") : FA("فعال", "Active")}</span>
          <button class="btn btn--sm btn--ghost" data-cp-toggle="${esc(c.code)}">${used ? FA("فعال کن", "Enable") : FA("استفاده شد", "Mark used")}</button>
          <button class="btn btn--sm btn--danger" data-cp-del="${esc(c.code)}">${FA("حذف", "Delete")}</button>
        </div>
      </div>`;
    }).join("");
  }

  const couponList = $id("couponList");
  if (couponList) couponList.addEventListener("click", e => {
    const del = e.target.closest("[data-cp-del]");
    if (del) {
      const k = del.dataset.cpDel;
      const typed = prompt(FA("برای حذف کد «" + k + "» تایپش کن", `Type ${k} to delete this code`));
      if (typed !== k) { showToast(FA("کد اشتباه بود؛ حذف نشد.", "Wrong code; not deleted."), true); return; }
      const list = (typeof getCoupons === "function") ? getCoupons() : [];
      saveCoupons(list.filter(c => String(c.code).toUpperCase() !== k.toUpperCase()));
      showToast(FA("کد حذف شد ✓", "Code deleted ✓"));
      renderCoupons();
      return;
    }
const tog = e.target.closest("[data-cp-toggle]");
    if (tog) {
      const k = tog.dataset.cpToggle;
      const list = (typeof getCoupons === "function") ? getCoupons() : [];
      const i = list.findIndex(c => String(c.code).toUpperCase() === k.toUpperCase());
      if (i >= 0) {
        list[i].used = !list[i].used;
        saveCoupons(list);
        renderCoupons();
        /* reactivating the code also frees its server-side claim (single-use) */
        if (!list[i].used && typeof dbReleaseCoupon === "function") {
          Promise.resolve(dbReleaseCoupon(k));
        }
        showToast(FA("بهروزرسانی شد ✓", "Updated ✓"));
      }
    }
  });

  const cpAdd = $id("cpAdd");
  if (cpAdd) cpAdd.addEventListener("click", () => {
    const code = ($id("cpCode").value || "").trim().toUpperCase();
    const disc = Math.max(1, Math.min(99, Math.round(Number($id("cpDisc").value) || 0)));
    const tg = ($id("cpUser").value || "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9_+]/g, "");
    if (!code) { showToast(FA("کد را وارد کنید.", "Enter a code."), true); $id("cpCode").focus(); return; }
    if (!$id("cpDisc").value || !disc) { showToast(FA("درصد تخفیف را وارد کنید (۱ تا ۹۹).", "Enter discount percent (1-99)."), true); $id("cpDisc").focus(); return; }
    if (!tg) { showToast(FA("تلگرام کاربر را وارد کنید.", "Enter the user telegram."), true); $id("cpUser").focus(); return; }
    const list = (typeof getCoupons === "function") ? getCoupons() : [];
    if (list.some(c => String(c.code).toUpperCase() === code)) { showToast(FA("این کد قبلاً ساخته شده.", "Code already exists."), true); return; }
    list.push({ code: code, discount: disc, telegram: tg, used: false, date: new Date().toISOString() });
    saveCoupons(list);
    $id("cpCode").value = ""; $id("cpDisc").value = ""; $id("cpUser").value = "";
    renderCoupons();
    showToast(FA("کد ساخته شد ✓", "Code created ✓"));
  });

  /* ---------- قرعه‌کشی (raffle) ---------- */
  let raffleDraft = null;

  function setRfPreviewRot(deg, animate) {
    const cv = $id("rfPreview");
    if (!cv) return;
    cv.style.transition = animate ? "transform 5s cubic-bezier(.12,.72,.12,1.03)" : "none";
    void cv.offsetWidth;
    cv.style.transform = "rotate(" + deg + "deg)";
  }
  function updateRafflePreview() {
    const cv = $id("rfPreview");
    if (!cv || typeof drawRaffleWheel !== "function") return;
    const entries = collectRaffleEntries().filter(x => x !== "");
    const r = raffleDraft || getRaffle();
    const shown = entries.length ? entries : r.entries;
    drawRaffleWheel(cv, shown.length ? shown : ["—"], 340, entries.length ? -1 : r.winnerIndex);
  }
  function updateRaffleCount() {
    const el = $id("rfCount");
    if (el) el.textContent = toFaDigits(collectRaffleEntries().filter(x => x !== "").length);
  }

  function collectRaffleEntries() {
    const wrap = $id("rfEntries");
    if (!wrap) return [];
    return [...wrap.querySelectorAll(".rf-entry__in")].map(i => i.value.trim());
  }
  function renderRaffleEntries(entries) {
    const wrap = $id("rfEntries");
    if (!wrap) return;
    const list = entries.length ? entries : [""];
    wrap.innerHTML = list.map((v, i) => `
      <div class="rf-entry">
        <span class="rf-entry__n">${toFaDigits(i + 1)}</span>
        <input class="field__input rf-entry__in" value="${esc(v)}" maxlength="40" placeholder="${FA("نام بخش", "Section name")}" />
        <button type="button" class="rf-entry__del" data-rf-del="${i}" aria-label="Delete">✕</button>
      </div>`).join("");
    updateRaffleCount();
  }
  function syncRaffleWinnerSelect() {
    const sel = $id("rfWinnerSel");
    if (!sel) return;
    const entries = collectRaffleEntries();
    const prev = raffleDraft ? raffleDraft.winnerIndex : -1;
    sel.innerHTML = entries.map((e, i) => `<option value="${i}">${toFaDigits(i + 1)} — ${esc(e || "—")}</option>`).join("");
    if (prev >= 0 && prev < entries.length) sel.value = String(prev);
  }
  function syncRaffleMode() {
    const manual = (document.querySelector('input[name="rfMode"]:checked') || {}).value === "manual";
    const w = $id("rfWinnerWrap");
    if (w) w.hidden = !manual;
  }
  function renderRaffleAdmin() {
    if (!$id("rfEntries")) return;
    raffleDraft = getRaffle();
    const titleEl = $id("rfTitle");
    if (titleEl) titleEl.value = raffleDraft.title || "";
    const r = document.querySelector('input[name="rfMode"][value="' + raffleDraft.mode + '"]');
    if (r) r.checked = true;
    renderRaffleEntries(raffleDraft.entries);
    syncRaffleMode();
    syncRaffleWinnerSelect();
    updateRaffleCount();
    updateRafflePreview();
    setRfPreviewRot(raffleDraft.rotation, false);
    applyRaffleEnabledUI();
  }
  function applyRaffleEnabledUI() {
    const sec = document.getElementById("raffle");
    const on = !!(raffleDraft && raffleDraft.enabled);
    if (sec) sec.classList.toggle("is-off", !on);
    const state = $id("rfState");
    if (state) { state.textContent = on ? FA("فعال", "ON") : FA("غیرفعال", "OFF"); state.classList.toggle("is-off", !on); }
    const tg = $id("rfToggle");
    if (tg) tg.checked = on;
    if (sec) {
      sec.querySelectorAll("input, button, select").forEach(el => {
        if (el && el.id !== "rfToggle") el.disabled = !on;
      });
    }
  }

  if ($id("rfEntries")) {
    $id("rfEntries").addEventListener("input", () => { syncRaffleWinnerSelect(); updateRaffleCount(); updateRafflePreview(); });
    $id("rfEntries").addEventListener("click", e => {
      const b = e.target.closest("[data-rf-del]");
      if (!b) return;
      const i = Number(b.dataset.rfDel);
      const entries = collectRaffleEntries();
      if (entries.length <= 1) { renderRaffleEntries([""]); syncRaffleWinnerSelect(); updateRafflePreview(); return; }
      entries.splice(i, 1);
      renderRaffleEntries(entries);
      syncRaffleWinnerSelect();
      updateRafflePreview();
    });
    const addEntry = $id("rfAddEntry");
    if (addEntry) addEntry.addEventListener("click", () => {
      const entries = collectRaffleEntries();
      if (entries.length >= 24) { showToast(FA("حداکثر ۲۴ بخش مجاز است.", "Max 24 sections."), true); return; }
      entries.push("");
      renderRaffleEntries(entries);
      updateRafflePreview();
      const inputs = $id("rfEntries").querySelectorAll(".rf-entry__in");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    document.querySelectorAll('input[name="rfMode"]').forEach(r => r.addEventListener("change", () => { syncRaffleMode(); syncRaffleWinnerSelect(); }));

    const rfToggle = $id("rfToggle");
    if (rfToggle) rfToggle.addEventListener("change", () => {
      const cur = getRaffle();
      saveRaffle({ ...cur, enabled: rfToggle.checked });
      raffleDraft = getRaffle();
      applyRaffleEnabledUI();
      showToast(FA(rfToggle.checked ? "قرعه‌کشی فعال شد ✓" : "قرعه‌کشی غیرفعال شد.", rfToggle.checked ? "Raffle enabled ✓" : "Raffle disabled."));
    });

    const rfSave = $id("rfSave");
    if (rfSave) rfSave.addEventListener("click", () => {
      const entries = collectRaffleEntries().filter(x => x !== "");
      if (entries.length < 2) { showToast(FA("حداقل ۲ بخش با نام لازم است.", "At least 2 named sections."), true); return; }
      const mode = (document.querySelector('input[name="rfMode"]:checked') || {}).value === "manual" ? "manual" : "random";
      const cur = getRaffle();
      saveRaffle({ ...cur, title: ($id("rfTitle").value || "").trim(), entries, mode });
      renderRaffleAdmin();
      showToast(FA("تنظیمات قرعه‌کشی ذخیره شد ✓", "Raffle settings saved ✓"));
    });

    const rfSpin = $id("rfSpin");
    if (rfSpin) rfSpin.addEventListener("click", () => {
      const entries = collectRaffleEntries().filter(x => x !== "");
      if (entries.length < 2) { showToast(FA("حداقل ۲ بخش با نام لازم است.", "At least 2 named sections."), true); return; }
      const mode = (document.querySelector('input[name="rfMode"]:checked') || {}).value === "manual" ? "manual" : "random";
      let winner;
      if (mode === "manual") {
        winner = Number($id("rfWinnerSel").value);
        if (!(winner >= 0 && winner < entries.length)) winner = 0;
      } else {
        winner = Math.floor(Math.random() * entries.length);
      }
      const cur = getRaffle();
      const seg = 360 / entries.length;
      const target = (((-(winner + 0.5) * seg) % 360) + 360) % 360;
      const curMod = ((Number(cur.rotation) || 0) % 360 + 360) % 360;
      let delta = target - curMod;
      if (delta < 0) delta += 360;
      const rotation = (Number(cur.rotation) || 0) + 360 * (4 + Math.floor(Math.random() * 3)) + delta;
      saveRaffle({ ...cur, title: ($id("rfTitle").value || "").trim(), entries, mode, winnerIndex: winner, seq: (Number(cur.seq) || 0) + 1, rotation });
      const hint = $id("rfHint");
      if (hint) hint.textContent = FA("برنده: ", "Winner: ") + (entries[winner] || "");
      updateRafflePreview();
      setRfPreviewRot(Number(cur.rotation) || 0, false);
      const previewCv = $id("rfPreview");
      if (typeof setWheelSpinFX === "function") setWheelSpinFX(previewCv, true);
      requestAnimationFrame(() => setRfPreviewRot(rotation, true));
      const previewHost = document.querySelector(".raffle-admin__preview");
      setTimeout(() => {
        if (typeof setWheelSpinFX === "function") setWheelSpinFX(previewCv, false);
        if (previewHost && typeof burstConfetti === "function") burstConfetti(previewHost);
      }, 5000);
      showToast(FA("گردونه چرخانده شد — کاربران زنده می‌بینند ✓", "Wheel spun — users see it live ✓"));
    });

    const rfReset = $id("rfReset");
    if (rfReset) rfReset.addEventListener("click", () => {
      const cur = getRaffle();
      saveRaffle({ ...cur, winnerIndex: -1 });
      const hint = $id("rfHint");
      if (hint) hint.textContent = "";
      showToast(FA("برنده پاک شد.", "Winner cleared."));
    });
  }

  $id("ordersList").addEventListener("click", async e => {
    const di = e.target.closest("[data-del-item]");
    if (di) {
      const bits = String(di.getAttribute("data-del-item") || "").split("|");
      const oid = Number(bits[0]), oix = Number(bits[1]);
      if (oid && Number.isInteger(oix) && oix >= 0) {
        const cur = getOrders().find(x => x.id === oid);
        if (typeof isDbMode === "function" && isDbMode()) {
          const sess = await dbAdminSession();
          if (!sess) {
            showToast(FA("برای تغییر سفارش باید با «ورود ادمین» وارد شوید.", "Sign in via admin login to modify orders."), true);
            return;
          }
          if (cur) {
            cur.items = Array.isArray(cur.items) && oix < cur.items.length ? cur.items.filter((_, i) => i !== oix) : cur.items;
            cur.total = (Array.isArray(cur.items) ? cur.items : []).reduce((s, it) => s + (Number(it && it.price) || 0), 0);
            const dbErr = await dbSaveOrderDirect(cur);
            if (dbErr) {
              showToast(FA("در دیتابیس ذخیره نشد (" + dbErr + "). مطمئن شو وارد شده‌ای و در public.admins ثبت هستی.", "Not saved (" + dbErr + "). Ensure you're signed in and registered in public.admins."), true);
              return;
            }
            saveOrders(getOrders());
          }
        } else {
          deleteOrderItem(oid, oix);
        }
        renderAll();
        showToast(FA("آیتم حذف شد.", "Item removed."));
      }
      return;
    }
    const a = e.target.closest("[data-approve]");
    const r = e.target.closest("[data-reject]");
    const d = e.target.closest("[data-delord]");
    const id = a ? +a.dataset.approve : r ? +r.dataset.reject : d ? +d.dataset.delord : null;
    if (id == null) return;
    const orders = getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return;
    if (typeof isDbMode === "function" && isDbMode()) {
      const sess = await dbAdminSession();
      if (!sess) {
        showToast(FA("برای تأیید/رد سفارش‌ها باید با «ورود ادمین» و ایمیل Supabase وارد شوید؛ در غیر این صورت تغییر در دیتابیس ذخیره نمی‌شود و خریدار چیزی نمی‌بیند.", "Sign in via admin login to approve/reject orders, otherwise the change won't persist and buyers see nothing."), true);
        return;
      }
    }
    const dbErrText = async err => FA(
      "در دیتابیس ذخیره نشد (" + err + "). مطمئن شو با «ورود ادمین» و ایمیل Supabase وارد شده‌ای و کاربر در جدول public.admins دیتابیس ثبت است؛ سپس دوباره امتحان کن.",
      "Not saved (" + err + "). Make sure you're signed in via admin login and your user is registered in the public.admins table, then try again."
    );
    if (a) {
      if (typeof isDbMode === "function" && isDbMode()) {
        o.status = "approved";
        let dbErr = await dbSaveOrderDirect(o);
        if (!dbErr) dbErr = await dbAddInventoryDirect(o.telegram, o.items || []);
        if (dbErr) {
          o.status = "pending";
          showToast(await dbErrText(dbErr), true);
          return;
        }
      }
      addToInventory(o.telegram, o.items || []);
      o.status = "approved";
      if (o.coupon) {
        const cl = (typeof getCoupons === "function") ? getCoupons() : [];
        const ci = cl.findIndex(x => String(x.code || "").trim().toUpperCase() === o.coupon);
        if (ci >= 0 && !cl[ci].used) {
          cl[ci].used = true;
          saveCoupons(cl);
        }
      }
    } else if (r) {
      if (typeof isDbMode === "function" && isDbMode()) {
        o.status = "rejected";
        const dbErr = await dbSaveOrderDirect(o);
        if (dbErr) {
          o.status = "pending";
          showToast(await dbErrText(dbErr), true);
          return;
        }
      }
      o.status = "rejected";
    } else {
      if (typeof isDbMode === "function" && isDbMode()) {
        const dbErr = await dbDeleteOrderDirect(id);
        if (dbErr) {
          showToast(await dbErrText(dbErr), true);
          return;
        }
      }
      deleteOrder(id);
      renderAll();
      showToast(FA("سفارش حذف شد.", "Order deleted."));
      return;
    }
    saveOrders(orders);
    renderAll();
    showToast(a
      ? FA(`سفارش تایید شد؛ آیتم‌ها به اینونتوری ${o.telegram} اضافه شد ✓`, `Order approved; items added to ${o.telegram}'s inventory ✓`)
      : FA("سفارش رد شد.", "Order rejected."));
  });

  /* ---------- users ---------- */
  function renderUsers() {
    const wrap = $id("usersList");
    const list = getUsers();
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><p>${FA("هنوز کاربری ثبت نشده است.", "No users yet.")}</p></div>`;
      return;
    }
    const orders = getOrders();
    const invMap = getInvMap();
    wrap.innerHTML = list.slice().reverse().map(u => {
      const tg = String(u.tg || u.id || "");
      const id = esc(tg);
      const uname = tgUsername(tg);
      const av = uname ? "https://t.me/i/userpic/320/" + uname + ".jpg" : "";
      const initial = (uname[0] || "؟").toUpperCase();
      const date = fmtDate(u.date);
      const bought = orders.filter(x => x.telegram === tg && x.status === "approved").length;
      const invN = (invMap[tg] || []).length;
      return `
      <div class="user-row">
        <div class="user-avatar">
          ${av ? `<img src="${esc(av)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
          <span>${initial}</span>
        </div>
        <div class="user-info">
          <b>${id}</b>
          <span>${FA("عضویت", "Joined")} ${date || "—"}</span>
        </div>
        <div class="user-stats">
          <span class="user-stat"><b>${toFaDigits(bought)}</b><i>${FA("خرید تایید شده", "Purchases")}</i></span>
          <span class="user-stat user-stat--gold"><b>${toFaDigits(invN)}</b><i>${FA("آیتم در اینونتوری", "Inventory items")}</i></span>
        </div>
        <button class="btn btn--sm btn--danger" data-deluser="${id}" title="${FA("حذف کاربر", "Delete user")}">${FA("حذف", "Del")}</button>
      </div>`;
    }).join("");
  }

  function renderAll() { renderStats(); renderInventory(); renderOrders(); renderUsers(); renderCoupons(); }

  /* ---------- add / edit skin modal ---------- */
  const skinModal = $id("skinModal");
  const skinOverlay = $id("skinOverlay");
  const skinForm = $id("skinForm");
  const fName = $id("fName"), fWeapon = $id("fWeapon"), fWear = $id("fWear"),
        fRarity = $id("fRarity"), fPrice = $id("fPrice"), fImg = $id("fImg"),
        fDisOn = $id("fDisOn"), fDiscount = $id("fDiscount"),
        fType = $id("fType"),
        delivWrap = $id("delivWrap"), delivDaysWrap = $id("delivDaysWrap"), fDelivDays = $id("fDelivDays"),
        closeSkinModal = $id("closeSkinModal"), cancelSkin = $id("cancelSkin");

  let editingName = null;
  let imgData = null;

  function openModal(name, focusDisc) {
    editingName = name || null;
    imgData = null;
    skinForm.reset();
    fImg.value = "";
    fDisOn.checked = false;
    fDiscount.value = "";
    if (fType) fType.value = "Normal";
    if (delivWrap) {
      const imm = delivWrap.querySelector('input[value="immediate"]');
      if (imm) imm.checked = true;
      if (delivDaysWrap) delivDaysWrap.hidden = true;
      if (fDelivDays) fDelivDays.value = "2";
    }
    const prev = $id("fImgPrev");
    const empty = $id("fImgEmpty");
    if (prev) prev.hidden = true;
    if (empty) empty.hidden = false;
    const modalTitle = $id("skinModalTitle");
    if (modalTitle) modalTitle.textContent = name
      ? FA(`ویرایش اسکین — ${name}`, `Edit skin — ${name}`)
      : FA("افزودن اسکین جدید", "Add new skin");
    if (name) {
      const s = findSkin(name);
      if (s) {
        fName.value = s.name;
        if (fWeapon && s.weapon) {
          let has = false;
          for (const opt of fWeapon.options) if (opt.value === s.weapon) { has = true; break; }
          if (has) { fWeapon.value = s.weapon; }
          else {
            const opt = document.createElement("option");
            opt.value = s.weapon;
            opt.textContent = s.weapon;
            fWeapon.appendChild(opt);
            fWeapon.value = s.weapon;
          }
        }
        fWear.value = s.wear;
        fRarity.value = RARITY_KEY[s.rarity] || "covert";
        fPrice.value = s.price;
        const d = skinDiscount(s);
        fDisOn.checked = d > 0;
        fDiscount.value = d > 0 ? d : "";
        if (fType) {
          let found = false;
          for (const opt of fType.options) if (opt.value === s.type) { fType.value = opt.value; found = true; break; }
          if (!found) fType.value = "Normal";
        }
        if (delivWrap) {
          const days = s.delivery_mode === "days";
          const imm = delivWrap.querySelector('input[value="immediate"]');
          const lat = delivWrap.querySelector('input[value="days"]');
          if (imm) imm.checked = !days;
          if (lat) lat.checked = days;
          if (delivDaysWrap) delivDaysWrap.hidden = !days;
          if (fDelivDays) fDelivDays.value = days ? (Number(s.delivery_days) || 2) : "2";
        }
      }
    }
    if (focusDisc) {
      fDisOn.checked = true;
      if (!fDiscount.value) fDiscount.value = "25";
      updateDiscPreview();
      setTimeout(() => { fDiscount.focus(); fDiscount.select(); }, 250);
    } else {
      updateDiscPreview();
    }
    skinModal.classList.add("is-on");
    skinOverlay.classList.add("is-on");
  }
  function closeModal() {
    skinModal.classList.remove("is-on");
    skinOverlay.classList.remove("is-on");
    editingName = null;
    imgData = null;
  }

  function updateDiscPreview() {
    const pre = $id("fDiscPreview");
    if (!pre) return;
    const price = parseFloat(fPrice.value);
    const on = fDisOn.checked;
    const pct = Math.max(0, Math.min(99, parseInt(fDiscount.value, 10) || 0));
    if (!on || isNaN(price) || price <= 0) { pre.hidden = true; return; }
    const fin = price * (1 - pct / 100);
    pre.hidden = false;
    pre.innerHTML = FA(
      `قیمت قدیم: <s class="price-old">${fmtNum(price)}</s> &rarr; قیمت نمایشی: <b class="price-now">${fmtNum(fin)} ${unitTxt()}</b>`,
      `Old: <s class="price-old">${fmtNum(price)}</s> &rarr; Display: <b class="price-now">${fmtNum(fin)} ${unitTxt()}</b>`
    );
  }
  fPrice.addEventListener("input", updateDiscPreview);
  fDiscount.addEventListener("input", updateDiscPreview);
  fDisOn.addEventListener("change", updateDiscPreview);

  $id("addSkinBtn").addEventListener("click", () => openModal(null));
  closeSkinModal.addEventListener("click", closeModal);
  cancelSkin.addEventListener("click", closeModal);
  skinOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  if (delivWrap) delivWrap.addEventListener("change", e => {
    if (e.target && e.target.name === "fDeliv") {
      const days = e.target.value === "days";
      if (delivDaysWrap) delivDaysWrap.hidden = !days;
      if (days && fDelivDays) fDelivDays.focus();
    }
  });

  fImg.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    const prev = $id("fImgPrev");
    const empty = $id("fImgEmpty");
    if (!file) { if (prev) prev.hidden = true; if (empty) empty.hidden = false; return; }
    const rd = new FileReader();
    rd.onload = () => {
      imgData = rd.result;
      if (prev) { prev.src = imgData; prev.hidden = false; }
      if (empty) empty.hidden = true;
    };
    rd.readAsDataURL(file);
  });

  skinForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = fName.value.trim();
    if (!name) { showToast(FA("نام اسکین را وارد کنید", "Enter a skin name"), true); fName.focus(); return; }
    const price = parseFloat(fPrice.value);
    if (isNaN(price) || price <= 0) { showToast(FA("قیمت معتبر وارد کنید", "Enter a valid price"), true); fPrice.focus(); return; }

    const discOn = fDisOn.checked;
    const discVal = parseInt(fDiscount.value, 10);
    const discount = discOn ? Math.max(0, Math.min(99, isNaN(discVal) ? 25 : discVal)) : 0;

    const typeVal = fType ? fType.value : "Normal";
    let delMode = "immediate";
    let delDays = 0;
    if (delivWrap) {
      const lat = delivWrap.querySelector('input[name="fDeliv"]:checked');
      if (lat && lat.value === "days") {
        delMode = "days";
        delDays = Math.max(1, Math.min(30, parseInt(fDelivDays.value, 10) || 2));
      }
    }

    const obj = {
      name: name,
      img: imgData || (editingName ? (findSkin(editingName) || {}).img : ""),
      weapon: fWeapon.value.trim() || "Rifle",
      wear: fWear.value,
      rarity: RARITY_LABEL[fRarity.value] || "Covert",
      type: typeVal,
      price: price,
      discount: discount,
      delivery_mode: delMode,
      delivery_days: delDays,
    };

    let custom = getCustom();
    let deleted = getDel();
    if (editingName) {
      custom = custom.filter(s => s.name !== editingName);
      if (!(typeof isDbMode === "function" && isDbMode()) && SKINS.some(s => s.name === editingName)) deleted.push(editingName);
    }
    custom.push(obj);
    if (!(typeof isDbMode === "function" && isDbMode()) && SKINS.some(s => s.name === name)) deleted.push(name);
    saveCustom(custom);
    saveDel([...new Set(deleted)]);
    closeModal();
    renderAll();
    showToast(discount > 0 ? FA(`اسکین ثبت شد ✓ (${discount}٪ تخفیف)`, `Skin saved (${discount}% off) ✓`) : FA("اسکین ثبت شد ✓", "Skin saved ✓"));
  });

  /* ---------- delete skin ---------- */
  function deleteSkin(name) {
    const ok = window.confirm(FA(`اسکین «${name}» حذف شود؟`, `Delete skin "${name}"?`));
    if (!ok) return;
    let custom = getCustom();
    let deleted = getDel();
    if (custom.some(s => s.name === name)) {
      custom = custom.filter(s => s.name !== name);
    } else {
      deleted.push(name);
    }
    saveCustom(custom);
    saveDel(deleted);
    renderAll();
    showToast(FA("اسکین حذف شد ✓", "Skin deleted ✓"));
  }

  $id("inventoryGrid").addEventListener("click", e => {
    const disc = e.target.closest("[data-disc]");
    if (disc) { openModal(disc.dataset.disc, "disc"); return; }
    const del = e.target.closest("[data-del]");
    if (del) { deleteSkin(del.dataset.del); return; }
    const edit = e.target.closest("[data-edit]");
    if (edit) openModal(edit.dataset.edit);
  });

  const usersList = $id("usersList");
  if (usersList) usersList.addEventListener("click", async e => {
    const del = e.target.closest("[data-deluser]");
    if (!del) return;
    const tg = del.dataset.deluser;
    if (!window.confirm(FA(`کاربر ${tg} به همراه اینونتوری و سفارش‌هایش حذف شود؟`, `Delete ${tg} with their inventory and orders?`))) return;
    const err = await removeUser(tg);
    if (err) { showToast(FA("حذف کاربر در دیتابیس انجام نشد: " + err, "Could not delete user: " + err), true); return; }
    renderAll();
    showToast(FA("کاربر حذف شد ✓", "User deleted ✓"));
  });

  /* ---------- settings: creds + announcement ---------- */
  const setUser = $id("setUser"), setPass = $id("setPass"), setPass2 = $id("setPass2");
  const saveCredsBtn = $id("saveCreds");
  const credsFields = $id("credsFields");
  const dbInfoBox = $id("dbInfoBox");
  const annEnabled = $id("annEnabled"), annText = $id("annText");
  const saveAnnBtn = $id("saveAnn");

  async function applyInfoBox() {
    const usingDb = typeof isDbMode === "function" && isDbMode();
    if (credsFields) credsFields.hidden = usingDb;
    if (dbInfoBox && usingDb) {
      let email = "";
      try {
        const s = await dbAdminSession();
        email = s && s.user ? (s.user.email || "") : "";
      } catch { /* ignore */ }
      dbInfoBox.hidden = false;
      if (email) {
        dbInfoBox.innerHTML = FA(
          `<b>اتصال به دیتابیس Supabase برقرار است ✓</b>
           <span>شما با <u dir="ltr">${esc(email)}</u> وارد شده‌اید. تأیید/رد سفارش‌ها روی دیتابیس ذخیره می‌شود.</span>`,
          `<b>Connected to Supabase database ✓</b>
           <span>Signed in as <u dir="ltr">${esc(email)}</u>. Approve/reject changes will persist.</span>`
        );
      } else {
        dbInfoBox.innerHTML = FA(
          `<b>اتصال به دیتابیس برقرار است، اما وارد نشده‌اید ⚠</b>
           <span>برای اینکه تأیید/رد سفارش‌ها و حذف کاربر روی دیتابیس ذخیره و برای خریداران نمایش داده شود، از تب «ورود ادمین» با ایمیل و رمز ادمین Supabase وارد شوید.</span>`,
          `<b>Connected to database, but not signed in ⚠</b>
           <span>Sign in via admin login (Supabase email + password) so approvals and deletions persist and are visible to buyers.</span>`
        );
      }
    } if (dbInfoBox) dbInfoBox.hidden = !usingDb;
  }
  applyInfoBox();

  if (saveCredsBtn) {
    const cur = getAdminCreds();
    setUser.value = cur.user;
    saveCredsBtn.addEventListener("click", () => {
      const u = setUser.value.trim();
      const p = setPass.value;
      const p2 = setPass2.value;
      if (!u) { showToast(FA("نام کاربری را وارد کنید", "Enter a username"), true); setUser.focus(); return; }
      if (p && p.length < 4) { showToast(FA("رمز عبور باید حداقل ۴ کاراکتر باشد", "Password must be at least 4 characters"), true); setPass.focus(); return; }
      if (p !== p2) { showToast(FA("تکرار رمز عبور مطابقت ندارد", "Passwords do not match"), true); setPass2.focus(); return; }
      saveAdminCreds(u, p || cur.pass);
      const nc = getAdminCreds();
      showToast(FA(`اطلاعات ورود ذخیره شد ✓ (${nc.user})`, `Login saved ✓ (${nc.user})`));
      setPass.value = ""; setPass2.value = "";
    });
  }

  if (saveAnnBtn) {
    const a = getAnnouncement();
    annEnabled.checked = !!a.enabled;
    annText.value = a.text || "";
    const annCount = $id("annCount");
    const annBarFill = $id("annBarFill");
    const annPill = $id("annPill");
    const annPreviewBox = $id("annPreviewBox");
    const annPreviewText = $id("annPreviewText");
    function syncAnnUI() {
      const txt = annText.value;
      if (annCount) annCount.textContent = showNum(txt.length) + " / 300";
      if (annBarFill) annBarFill.style.width = Math.min(100, (txt.length / 300) * 100) + "%";
      if (annPreviewBox && annPreviewText) {
        annPreviewBox.hidden = !String(txt).trim();
        annPreviewText.textContent = txt;
      }
    }
    function syncAnnState() {
      if (!annPill) return;
      const on = annEnabled.checked;
      annPill.textContent = on ? FA("فعال", "On") : FA("غیرفعال", "Off");
      annPill.classList.toggle("is-on", on);
    }
    annText.addEventListener("input", syncAnnUI);
    annEnabled.addEventListener("change", syncAnnState);
    syncAnnUI();
    syncAnnState();
    saveAnnBtn.addEventListener("click", () => {
      const txt = annText.value.trim();
      if (!txt && annEnabled.checked) { showToast(FA("متن اعلامیه را وارد کنید", "Enter announcement text"), true); annText.focus(); return; }
      saveAnnouncement({ enabled: annEnabled.checked, text: txt });
      showToast(FA("اعلامیه ذخیره شد ✓", "Announcement saved ✓"));
    });
    /* keep the panel's toggle/text in sync when the announcement arrives from the DB */
    document.addEventListener("zeus-db", e => {
      if ((e.detail && e.detail.type) !== "announcement") return;
      const na = getAnnouncement();
      if (annEnabled) annEnabled.checked = !!na.enabled;
      if (annText) annText.value = na.text || "";
      syncAnnUI();
      syncAnnState();
    });
  }

  /* ---------- hero image ---------- */
  const heroImg = $id("heroImg");
  const heroReset = $id("heroReset");
  const heroSave = $id("heroSave");
  if (heroImg && heroSave) {
    const heroPrev = $id("heroImgPrev");
    const heroEmpty = $id("heroImgEmpty");
    let heroData = "";
    function refreshHeroUI() {
      const cur = typeof getHeroImg === "function" ? getHeroImg() : "";
      heroData = "";
      if (cur) {
        if (heroPrev) { heroPrev.src = cur; heroPrev.hidden = false; }
        if (heroEmpty) heroEmpty.hidden = true;
      } else {
        if (heroPrev) heroPrev.hidden = true;
        if (heroEmpty) heroEmpty.hidden = false;
      }
    }
    refreshHeroUI();
    heroImg.addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        const src = rd.result;
        const img = new Image();
        img.onload = () => {
          const MAXW = 1600;
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > MAXW) { h = Math.round(h * MAXW / w); w = MAXW; }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          try {
            heroData = c.toDataURL("image/webp", .85);
            if (!heroData || heroData.length > src.length) throw 0;
          } catch { heroData = c.toDataURL("image/png"); }
          if (heroPrev) { heroPrev.src = heroData; heroPrev.hidden = false; }
          if (heroEmpty) heroEmpty.hidden = true;
        };
        img.onerror = () => { heroData = src; if (heroPrev) { heroPrev.src = heroData; heroPrev.hidden = false; } if (heroEmpty) heroEmpty.hidden = true; };
        img.src = src;
      };
      rd.readAsDataURL(file);
    });
    heroSave.addEventListener("click", () => {
      if (!heroData) { showToast(FA("اول یک تصویر انتخاب کنید", "Pick an image first"), true); return; }
      saveHeroImg(heroData);
      showToast(FA("تصویر هیرو ذخیره شد ✓", "Hero image saved ✓"));
    });
    if (heroReset) heroReset.addEventListener("click", () => {
      saveHeroImg("");
      refreshHeroUI();
      showToast(FA("هیرو به حالت پیش‌فرض برگشت ✓", "Hero reset to default ✓"));
    });
  }

  /* ---------- sidebar / burger ---------- */
  const burger = $id("burger");
  const side = $id("sideBar");
  const backdrop = $id("sideBackdrop");
  function toggleSide(open) {
    side.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-on", open);
  }
  burger.addEventListener("click", () => toggleSide(!side.classList.contains("is-open")));
  if (backdrop) backdrop.addEventListener("click", () => toggleSide(false));

  /* ---------- sections as separate tabs ---------- */
  const sections = [...document.querySelectorAll(".panel-card")];
  const navLinks = [...document.querySelectorAll(".admin__nav a")];
  const idFromHash = h => (h ? h.slice(1) : "") || "overview";
  const VALID = new Set(navLinks.map(a => a.getAttribute("href").slice(1)));
  function showSection(id) {
    if (!VALID.has(id)) id = "overview";
    sections.forEach(s => s.classList.toggle("is-hidden", s.id !== id));
    navLinks.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
  }
  navLinks.forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      history.replaceState(null, "", "#" + id);
      showSection(id);
      if (window.innerWidth < 861) toggleSide(false);
    });
  });
  window.addEventListener("hashchange", () => showSection(idFromHash(location.hash)));
  showSection(idFromHash(location.hash));

  $id("logoutBtn").addEventListener("click", async () => {
    if (typeof isDbMode === "function" && isDbMode()) {
      try { await dbAdminLogout(); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem("skm_admin"); } catch { /* ignore */ }
    }
    location.href = "admin-login.html";
  });

  /* ---------- init ---------- */
  renderAll();
  try { renderRaffleAdmin(); } catch { /* ignore */ }
  document.addEventListener("zeus-db-ready", () => {
    try { renderAll(); } catch { /* ignore */ }
    try { renderRaffleAdmin(); } catch { /* ignore */ }
    applyInfoBox();
  });
  document.addEventListener("zeus-db", e => {
    const t = (e.detail && e.detail.type) || "";
    if (t === "catalog") renderAll();
    if (t === "orders") renderAll();
    if (t === "inventory") renderAll();
    if (t === "users") renderAll();
    if (t === "coupons" || t === "settings") { renderAll(); try { renderRaffleAdmin(); } catch { /* ignore */ } }
  });
}

/* =========================================================
   BACKUP / RESTORE (Supabase mode)
   ========================================================= */
const BACKUP_TABLES = ["skins", "orders", "inventory", "users", "announcement", "site_settings"];
const backupBtn = $id("backupBtn");
const restoreBtn = $id("restoreBtn");
const restoreFile = $id("restoreFile");

function dbReadyNow() { return typeof isDbMode === "function" && isDbMode(); }

async function fetchAllRows(supa, table) {
  const all = [];
  const step = 1000;
  for (let from = 0; true; from += step) {
    const { data, error } = await supa.from(table).select("*").range(from, from + step - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < step) break;
  }
  return all;
}

async function buildBackup() {
  const supa = getSupa();
  if (!supa) throw new Error("no-db");
  const out = { app: "ZEUSSHOP", version: 1, exported_at: new Date().toISOString(), tables: {} };
  for (const t of BACKUP_TABLES) {
    out.tables[t] = await fetchAllRows(supa, t);
  }
  return out;
}

function downloadBackup(obj) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = "zeusshop-backup-" + stamp + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}

function parseBackup(text) {
  const obj = JSON.parse(text);
  if (!obj || obj.app !== "ZEUSSHOP" || !obj.tables || typeof obj.tables !== "object") {
    throw new Error("bad-format");
  }
  return obj;
}

async function wipeAndRestoreTable(supa, t, rows) {
  if (!Array.isArray(rows)) rows = [];

  /* identity / primary keys differ per table — delete all rows by id where present */
  const hasId = t === "skins" || t === "orders" || t === "inventory" || t === "users" || t === "announcement";
  let del = null;
  if (hasId) {
    del = await supa.from(t).delete().neq("id", -1).select();
  } else {
    /* site_settings has no id column — delete by key */
    del = await supa.from(t).delete().neq("key", "").select();
  }
  if (del && del.error) throw del.error;

  if (!rows.length) return;
  const clean = rows.map(r => {
    const c = {};
    Object.keys(r).forEach(k => {
      if (k === "created_at" || k === "updated_at") {
        c[k] = r[k] ? new Date(r[k]).toISOString() : null;
      } else {
        c[k] = r[k];
      }
    });
    return c;
  });
  const ins = await supa.from(t).upsert(clean, { onConflict: t === "site_settings" ? "key" : "id" });
  if (ins.error) throw ins.error;
}

if (backupBtn) {
  backupBtn.addEventListener("click", async () => {
    if (!dbReadyNow()) {
      showToast(lang === "fa" ? "بکاپ فقط در حالت Supabase فعال است." : "Backup works only in Supabase mode.", true);
      return;
    }
    backupBtn.disabled = true;
    try {
      const data = await buildBackup();
      downloadBackup(data);
      showToast(lang === "fa" ? "بکاپ دانلود شد ✓" : "Backup downloaded ✓");
    } catch (err) {
      dbLog(err);
      showToast(lang === "fa" ? "خطا در ساخت بکاپ." : "Backup failed.", true);
    } finally {
      backupBtn.disabled = false;
    }
  });
}

if (restoreBtn && restoreFile) {
  restoreBtn.addEventListener("click", () => restoreFile.click());
  restoreFile.addEventListener("change", async () => {
    const file = restoreFile.files && restoreFile.files[0];
    restoreFile.value = "";
    if (!file) return;
    if (!dbReadyNow()) {
      showToast(lang === "fa" ? "بازیابی فقط در حالت Supabase فعال است." : "Restore works only in Supabase mode.", true);
      return;
    }
    const ok = window.confirm(lang === "fa"
      ? "بازگردانی همه جدول‌ها موافق؟ داده‌های فعلی با فایل بکاپ جایگزین می‌شوند."
      : "Restore all tables? Current data will be replaced by the backup.");
    if (!ok) return;
    restoreBtn.disabled = true;
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      const supa = getSupa();
      if (!supa) throw new Error("no-db");
      for (const t of BACKUP_TABLES) {
        if (!backup.tables[t]) continue; /* never wipe a table missing from the backup */
        await wipeAndRestoreTable(supa, t, backup.tables[t]);
      }
      showToast(lang === "fa" ? "بازیابی کامل شد ✓" : "Restore complete ✓");
      /* force re-read from cloud so the UI + local mirrors refresh */
      try { await dbInit(); } catch { /* ignore */ }
      try { renderAll(); } catch { /* ignore */ }
    } catch (err) {
      dbLog(err);
      showToast(err && err.message === "bad-format"
        ? (lang === "fa" ? "فایل بکاپ معتبر نیست." : "Invalid backup file.")
        : (lang === "fa" ? "خطا در بازیابی." : "Restore failed."), true);
    } finally {
      restoreBtn.disabled = false;
    }
  });
}