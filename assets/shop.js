/* Micron shop: the live catalogue (window.MICRON_CATALOG from /api/catalog.js) drawn into the shells that
   render.js leaves on each page. Cart, wishlist and compare live in localStorage; the server re-reads every
   price at checkout, so nothing here is trusted. Listeners are delegated from document. */
(function () {
  "use strict";
  var R = window.MicronRender, esc = R.esc, fa = R.fa, icon = R.icon;
  var C = window.MICRON_CONTENT || window.MICRON_DEFAULTS || {};
  var SHOP = C.shop || {};
  var CATS = SHOP.categories || [];
  var page = document.body.getAttribute("data-page");
  var NOW = Date.now();
  var LIST = ((window.MICRON_CATALOG && window.MICRON_CATALOG.products) || []).slice();
  var BY = {};
  LIST.forEach(function (p) { BY[p.id] = p; });
  if (window.MICRON_PRODUCT && !BY[window.MICRON_PRODUCT.id]) { BY[window.MICRON_PRODUCT.id] = window.MICRON_PRODUCT; LIST.push(window.MICRON_PRODUCT); }

  // ---------------------------------------------------------------- helpers
  var toEn = function (s) { return String(s || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }); };
  var money = function (n) { return fa(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬")); };
  var saleOn = function (p) { return p.sale > 0 && p.price > 0 && (!p.saleUntil || Date.parse(p.saleUntil) > NOW); };
  var unit = function (p) { return saleOn(p) ? p.sale : (p.price || 0); };
  var off = function (p) { return saleOn(p) ? Math.round((1 - p.sale / p.price) * 100) : 0; };
  var catName = function (id) { var c = CATS.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ""; };
  var kidsOf = function (id) { return CATS.filter(function (x) { return x.parent === id; }).map(function (x) { return x.id; }); };
  var inCat = function (p, id) { return !id || p.cat === id || kidsOf(id).indexOf(p.cat) >= 0; };
  var link = function (p) { return "/micron-demo/p/" + encodeURIComponent(p.slug); };
  var pic = function (p, cls) {
    var src = (p.images || [])[0];
    return src ? R.img(src, p.title, cls || "") : '<span class="noimg">' + icon("grid") + "</span>";
  };
  var store = function (k, v) {
    if (v === undefined) { try { return JSON.parse(localStorage.getItem("micron-" + k)) || []; } catch (_) { return []; } }
    try { localStorage.setItem("micron-" + k, JSON.stringify(v)); } catch (_) {}
    counts();
  };
  var api = function (method, path, body) {
    return fetch("/micron-demo/api/" + path, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Micron": "1" },
      body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  };
  var ERR = { demo: "این نسخه‌ی نمایشی سایت است؛ ثبت سفارش، ورود و پیگیری بعد از راه‌اندازی روی سرور فعال می‌شود.", phone: "شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.", "too many": "تعداد درخواست‌ها زیاد بود؛ کمی بعد دوباره امتحان کنید.",
    wrong: "موبایل یا رمز درست نیست.", exists: "با این موبایل قبلاً حساب ساخته شده؛ وارد شوید.", "password too short": "رمز دست‌کم ۸ نویسه باشد.",
    "cart empty": "کالاهای سبد دیگر در فروشگاه نیستند.", postcode: "کد پستی ده رقم است.",
    "name is required": "نام را بنویسید.", "city is required": "شهر را بنویسید.", "address is required": "نشانی را بنویسید." };
  var errText = function (j) { return ERR[j.error] || "انجام نشد. دوباره امتحان کنید یا تماس بگیرید."; };

  function toast(html) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 3200);
  }

  // ---------------------------------------------------------------- counts in the header and bottom bar
  function counts() {
    var n = { cart: store("cart").reduce(function (a, x) { return a + (BY[x.id] ? x.qty : 0); }, 0), wish: store("wish").length, cmp: store("cmp").length };
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var v = n[el.getAttribute("data-count")] || 0;
      el.textContent = fa(v); el.hidden = !v;
    });
  }

  // ---------------------------------------------------------------- product card
  function priceHtml(p, big) {
    if (!unit(p)) return '<p class="pprice ask' + (big ? " big" : "") + '">استعلام قیمت</p>';
    return '<p class="pprice' + (big ? " big" : "") + '">' + (saleOn(p) ? "<del>" + money(p.price) + "</del>" : "") +
      "<b>" + money(unit(p)) + "</b><small>تومان</small></p>";
  }
  function availHtml(p) {
    var t = p.avail === "in" ? SHOP.inLabel : p.avail === "out" ? SHOP.outLabel : SHOP.madeLabel;
    return '<span class="avail av-' + esc(p.avail || "order") + '">' + esc(t || "") + "</span>";
  }
  function card(p) {
    var wish = store("wish").indexOf(p.id) >= 0, cmp = store("cmp").indexOf(p.id) >= 0, o = off(p);
    return '<article class="pcard tilt" data-id="' + esc(p.id) + '">' +
      '<a class="pc-img" href="' + link(p) + '" tabindex="-1" aria-hidden="true">' + pic(p) + "</a>" +
      (o ? '<span class="badge-off">' + fa(o) + "٪</span>" : "") +
      '<div class="pc-tools"><button type="button" class="icon-btn' + (wish ? " on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wish + '" aria-label="علاقه‌مندی">' + icon("heart") + "</button>" +
      '<button type="button" class="icon-btn' + (cmp ? " on" : "") + '" data-cmp="' + esc(p.id) + '" aria-pressed="' + cmp + '" aria-label="مقایسه">' + icon("scale") + "</button></div>" +
      '<div class="pc-body"><p class="pc-cat">' + esc(catName(p.cat)) + "</p>" +
      '<h3><a href="' + link(p) + '">' + esc(p.title) + "</a></h3>" + availHtml(p) + priceHtml(p) +
      (p.avail === "out" ? '<button class="btn btn-ghost btn-sm btn-block" type="button" disabled>ناموجود</button>' :
        '<button class="btn btn-sm btn-block' + (unit(p) ? "" : " btn-ghost") + '" type="button" data-add="' + esc(p.id) + '">' + icon("cart") +
        (unit(p) ? "افزودن به سبد" : "افزودن برای استعلام") + "</button>") + "</div></article>";
  }

  // ---------------------------------------------------------------- cart / wish / compare actions
  function addToCart(id, qty) {
    var p = BY[id]; if (!p) return;
    var cart = store("cart"), line = cart.filter(function (x) { return x.id === id; })[0];
    if (line) line.qty = Math.min(1000, line.qty + (qty || 1)); else cart.push({ id: id, qty: qty || 1 });
    store("cart", cart);
    toast(icon("cart") + "<span>«" + esc(p.title) + "» به سبد اضافه شد.</span><a href=\"/micron-demo/cart/\">دیدن سبد</a>");
  }
  function toggle(key, id, label) {
    var list = store(key), i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      if (key === "cmp" && list.length >= 4) { toast("حداکثر ۴ کالا را می‌شود مقایسه کرد."); return; }
      list.push(id);
    }
    store(key, list);
    document.querySelectorAll("[data-" + key + '="' + id + '"]').forEach(function (b) { b.classList.toggle("on", i < 0); b.setAttribute("aria-pressed", String(i < 0)); });
    if (i < 0) toast(label + (key === "cmp" ? '<a href="/micron-demo/compare/">دیدن مقایسه</a>' : '<a href="/micron-demo/wishlist/">دیدن فهرست</a>'));
    if (page === "wishlist" || page === "compare") draw();
  }
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-add]"))) {
      var q = document.querySelector("[data-qty]");
      addToCart(t.getAttribute("data-add"), t.hasAttribute("data-main") && q ? Math.max(1, +toEn(q.value) || 1) : 1);
    } else if ((t = e.target.closest("[data-wish]"))) toggle("wish", t.getAttribute("data-wish"), "به علاقه‌مندی‌ها اضافه شد.");
    else if ((t = e.target.closest("[data-cmp]"))) toggle("cmp", t.getAttribute("data-cmp"), "به مقایسه اضافه شد.");
    else if ((t = e.target.closest("[data-step]"))) {
      var cart = store("cart"), id = t.getAttribute("data-line"), d = +t.getAttribute("data-step");
      cart.forEach(function (x) { if (x.id === id) x.qty = Math.max(1, Math.min(1000, x.qty + d)); });
      store("cart", cart); draw();
    } else if ((t = e.target.closest("[data-rmline]"))) {
      store("cart", store("cart").filter(function (x) { return x.id !== t.getAttribute("data-rmline"); })); draw();
    } else if ((t = e.target.closest("[data-qstep]"))) {
      var inp = document.querySelector("[data-qty]");
      inp.value = fa(Math.max(1, Math.min(1000, (+toEn(inp.value) || 1) + +t.getAttribute("data-qstep"))));
    } else if ((t = e.target.closest("[data-thumb]"))) {
      var main = document.querySelector(".gal-main img");
      if (main) { main.src = t.getAttribute("data-thumb"); main.removeAttribute("srcset"); }
      document.querySelectorAll("[data-thumb]").forEach(function (b) { b.classList.toggle("on", b === t); });
    } else if ((t = e.target.closest("[data-filters]"))) {
      document.body.classList.toggle("filters-open");
    } else if (e.target.closest("[data-filters-close]") || e.target.classList.contains("filters-scrim")) {
      document.body.classList.remove("filters-open");
    } else if (e.target.closest("[data-search-open]")) {
      var qi = document.getElementById("q-top"); qi.closest(".search").classList.add("open"); qi.focus();
    } else if ((t = e.target.closest("[data-tab]"))) {
      document.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b === t)); });
      document.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== t.getAttribute("data-tab"); });
    } else if (e.target.closest("[data-logout]")) {
      api("POST", "account/logout", {}).then(function () { draw(); });
    }
  });

  // ---------------------------------------------------------------- search suggestions in the header
  var norm = function (s) { return toEn(String(s || "")).toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " "); };
  var match = function (p, q) {
    if (!q) return true;
    var hay = norm([p.title, p.sku, p.brand, catName(p.cat), p.summary, (p.tags || []).join(" ")].join(" "));
    return norm(q).split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  };
  document.addEventListener("input", function (e) {
    if (e.target.id !== "q-top") return;
    var box = e.target.form.querySelector(".sugg"), q = e.target.value.trim();
    if (q.length < 2) { box.hidden = true; return; }
    var hits = LIST.filter(function (p) { return match(p, q); }).slice(0, 6);
    box.innerHTML = hits.length ? hits.map(function (p) {
      return '<a href="' + link(p) + '">' + pic(p, "sg-img") + "<span><b>" + esc(p.title) + "</b><small>" + esc(catName(p.cat)) + "</small></span></a>";
    }).join("") + '<a class="sg-all" href="/micron-demo/shop/?q=' + encodeURIComponent(q) + '">همه‌ی نتیجه‌ها</a>' : '<p class="sg-none">چیزی پیدا نشد؛ برای ساخت سفارشی <a href="/micron-demo/#order">فرم سفارش</a> را پر کنید.</p>';
    box.hidden = false;
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search")) document.querySelectorAll(".sugg").forEach(function (b) { b.hidden = true; });
  });

  // ---------------------------------------------------------------- home
  function home() {
    document.querySelectorAll("[data-catcount]").forEach(function (el) {
      var n = LIST.filter(function (p) { return inCat(p, el.getAttribute("data-catcount")); }).length;
      el.textContent = n ? fa(n) + " کالا" : "ساخت سفارشی";
    });
    var deals = LIST.filter(saleOn);
    fill("deals", deals);
    var fp = LIST.filter(function (p) { return p.featured; }), fpn = fp.length < 4 ? fp.length : Math.min(8, fp.length - fp.length % 4);
    fill("picks", fp.slice(0, fpn));  // whole rows of four only
    marquee(LIST.slice(0, 12));
    if (deals.length) {
      var end = Math.min.apply(null, deals.map(function (p) { return p.saleUntil ? Date.parse(p.saleUntil) : Infinity; }));
      if (isFinite(end)) countdown(document.querySelector("[data-countdown] .cd"), end);
      else document.querySelector("[data-countdown]").hidden = true;
    }
    slider();
    sides();
  }
  function fill(slot, list) {
    var el = document.querySelector('[data-slot="' + slot + '"]');
    if (!el || !list.length) return;
    el.innerHTML = list.map(card).join("");
    el.closest("[data-needs]").hidden = false;
  }
  // Latest products drift to the right in an endless loop; a second copy (inert) closes the gap.
  // Pointer or keyboard focus on the strip stops it (CSS), so a card can be read and clicked.
  function marquee(list) {
    var track = document.querySelector('[data-slot="latest"]');
    if (!track || !list.length) return;
    var cards = list.map(card).join("");
    track.innerHTML = '<div class="mq-set">' + cards + '</div><div class="mq-set" aria-hidden="true" inert>' + cards + "</div>";
    track.style.setProperty("--mq-time", list.length * 4.5 + "s");
    track.closest("[data-needs]").hidden = false;
  }
  // Banner slider: auto-advance every 6 s, stops while hovered or focused, swipe on touch.
  function slider() {
    var box = document.querySelector("[data-slider]");
    if (!box) return;
    var slides = box.querySelectorAll("[data-slide]"), dots = box.querySelectorAll("[data-sl-to]"), cur = 0, timer, hold = false;
    if (slides.length < 2) return;
    var show = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("on", k === cur); s.setAttribute("aria-hidden", String(k !== cur));
        s.querySelectorAll("a").forEach(function (a) { if (k === cur) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1"); });
      });
      dots.forEach(function (d, k) { if (k === cur) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    };
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var run = function () { clearInterval(timer); if (!still) timer = setInterval(function () { if (!hold && !document.hidden) show(cur + 1); }, 6000); };
    box.addEventListener("click", function (e) {
      var t = e.target.closest("[data-sl],[data-sl-to]"); if (!t) return;
      // RTL: the "next" arrow sits on the left
      show(t.hasAttribute("data-sl-to") ? +t.getAttribute("data-sl-to") : cur + +t.getAttribute("data-sl")); run();
    });
    box.addEventListener("pointerenter", function () { hold = true; });
    box.addEventListener("pointerleave", function () { hold = false; });
    box.addEventListener("focusin", function () { hold = true; });
    box.addEventListener("focusout", function () { hold = false; });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { show(cur + (dx > 0 ? 1 : -1)); run(); }  // RTL: swipe right = next
    });
    run();
  }
  // Side banner pairs: fade to the next pair every 5 s, out of step with the slider; hover or focus holds it.
  function sides() {
    var box = document.querySelector("[data-sides]");
    if (!box) return;
    var sets = box.querySelectorAll(".side-set"), cur = 0, hold = false;
    if (sets.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setInterval(function () {
      if (hold || document.hidden) return;
      cur = (cur + 1) % sets.length;
      sets.forEach(function (s, k) {
        s.classList.toggle("on", k === cur); s.setAttribute("aria-hidden", String(k !== cur));
        s.querySelectorAll("a").forEach(function (a) { if (k === cur) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1"); });
      });
    }, 5000);
    box.addEventListener("pointerenter", function () { hold = true; });
    box.addEventListener("pointerleave", function () { hold = false; });
    box.addEventListener("focusin", function () { hold = true; });
    box.addEventListener("focusout", function () { hold = false; });
  }
  function countdown(el, end) {
    var tick = function () {
      var s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      var parts = [[Math.floor(s / 86400), "روز"], [Math.floor(s % 86400 / 3600), "ساعت"], [Math.floor(s % 3600 / 60), "دقیقه"], [s % 60, "ثانیه"]];
      el.innerHTML = parts.map(function (x) { return "<span><b>" + fa(String(x[0]).padStart(2, "0")) + "</b><small>" + x[1] + "</small></span>"; }).join("");
      if (s) setTimeout(tick, 1000);
    };
    tick();
  }

  // ---------------------------------------------------------------- shop page: filters, sort, search
  // ---------------------------------------------------------------- shop: Digikala-style filters
  // State lives in the URL (?cat= ?sale=1 are used by banners), so a filtered list can be shared.
  // Spec facets are built from spec names that 3+ products share (جنس, قطر, پوشش ...): no setup in the panel.
  var blank = function () { return { q: "", cat: "", brand: "", avail: "", sale: false, priced: false, min: "", max: "", sort: "new", sp: {} }; };
  var F = blank();
  var OPEN = { cat: true, price: true }, FQ = {};          // which filter groups are open, text typed in a group's search
  var SORTS = [["new", "جدیدترین"], ["cheap", "ارزان‌ترین"], ["dear", "گران‌ترین"], ["off", "بیشترین تخفیف"]];
  var specOf = function (p, k) { var r = (p.specs || []).filter(function (x) { return x[0] === k; })[0]; return r ? String(r[1]).trim() : ""; };
  var num = function (s) { var m = toEn(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : NaN; };
  var FACETS = (function () {
    var seen = {};
    LIST.forEach(function (p) { (p.specs || []).forEach(function (r) { if (r[0] && r[1]) (seen[r[0]] = seen[r[0]] || {})[p.id] = 1; }); });
    return Object.keys(seen).filter(function (k) { return Object.keys(seen[k]).length >= 3; });
  })();
  var PMAX = (function () {
    var m = Math.max.apply(null, LIST.map(unit).concat([0]));
    var step = m > 10000000 ? 1000000 : 100000;
    return Math.ceil(m / step) * step;
  })();
  function readUrl() {
    var u = new URLSearchParams(location.search);
    Object.keys(F).forEach(function (k) {
      if (k === "sp" || !u.has(k)) return;
      F[k] = (k === "sale" || k === "priced") ? u.get(k) === "1" : u.get(k);
    });
    u.forEach(function (v, k) { if (k.indexOf("f.") === 0 && FACETS.indexOf(k.slice(2)) >= 0) F.sp[k.slice(2)] = v.split("|").filter(Boolean); });
    if (SORTS.every(function (s) { return s[0] !== F.sort; })) F.sort = "new";
    var qi = document.getElementById("q-top"); if (qi && F.q) qi.value = F.q;
  }
  function writeUrl() {
    var u = new URLSearchParams();
    Object.keys(F).forEach(function (k) { if (k !== "sp" && F[k] && !(k === "sort" && F[k] === "new")) u.set(k, F[k] === true ? "1" : F[k]); });
    Object.keys(F.sp).forEach(function (k) { if (F.sp[k].length) u.set("f." + k, F.sp[k].join("|")); });
    history.replaceState(null, "", location.pathname + (String(u) ? "?" + u : ""));
  }
  // passes every filter except the one named in `skip` (so a group's counts show what picking it would give)
  function pass(p, skip) {
    var min = +toEn(F.min) || 0, max = +toEn(F.max) || 0, u = unit(p);
    if (skip !== "q" && !match(p, F.q)) return false;
    if (skip !== "cat" && !inCat(p, F.cat)) return false;
    if (F.brand && p.brand !== F.brand) return false;
    if (skip !== "avail" && F.avail && p.avail !== F.avail) return false;
    if (skip !== "sale" && F.sale && !saleOn(p)) return false;
    if (skip !== "priced" && F.priced && !u) return false;
    if (skip !== "price" && ((min && u < min) || (max && !(u && u <= max)))) return false;
    return Object.keys(F.sp).every(function (k) {
      return k === skip || !F.sp[k].length || F.sp[k].indexOf(specOf(p, k)) >= 0;
    });
  }
  function group(key, title, body, count) {
    var open = OPEN[key] !== undefined ? OPEN[key] : count > 0;
    return '<details class="fgrp" data-k="' + esc(key) + '"' + (open ? " open" : "") + "><summary>" + esc(title) +
      (count ? '<span class="fdot">' + fa(count) + "</span>" : "") + icon("chev") + "</summary><div class=\"fgrp-in\">" + body + "</div></details>";
  }
  function toggleRow(name, label, n) {
    return '<label class="ftog"><span>' + esc(label) + "<small>" + fa(n) + ' کالا</small></span><input type="checkbox" role="switch" name="' + name + '"' +
      (F[name] ? " checked" : "") + "></label>";
  }
  function filtersHtml() {
    var n = function (skip, fn) { return LIST.filter(function (p) { return pass(p, skip) && fn(p); }).length; };
    var tops = CATS.filter(function (x) { return !x.parent; });
    var curTop = F.cat && (CATS.filter(function (x) { return x.id === F.cat; })[0] || {}).parent || F.cat;
    var catBtn = function (id, label, count, sub) {
      return '<button type="button" class="fcat' + (sub ? " sub" : "") + (F.cat === id ? " on" : "") + '" data-fcat="' + esc(id) + '"' +
        (F.cat === id ? ' aria-current="true"' : "") + "><span>" + esc(label) + "</span><small>" + fa(count) + "</small></button>";
    };
    var cats = catBtn("", "همه‌ی کالاها", n("cat", function () { return true; })) + tops.map(function (t) {
      var c = n("cat", function (p) { return inCat(p, t.id); });
      return catBtn(t.id, t.name, c) + (t.id === curTop ? kidsOf(t.id).map(function (k) {
        return catBtn(k, catName(k), n("cat", function (p) { return p.cat === k; }), true);
      }).join("") : "");
    }).join("");
    var lo = +toEn(F.min) || 0, hi = +toEn(F.max) || PMAX;
    var price = PMAX ? '<div class="frange2" style="--lo:' + (lo / PMAX * 100) + "%;--hi:" + (hi / PMAX * 100) + '%"><div class="fr-track"></div>' +
      '<input type="range" name="min" min="0" max="' + PMAX + '" step="' + (PMAX / 100) + '" value="' + lo + '" aria-label="کمترین قیمت">' +
      '<input type="range" name="max" min="0" max="' + PMAX + '" step="' + (PMAX / 100) + '" value="' + hi + '" aria-label="بیشترین قیمت"></div>' +
      '<div class="frange"><label><small>از</small><input class="fin" name="min" inputmode="numeric" value="' + esc(lo ? money(lo) : "") + '" placeholder="۰"></label>' +
      '<label><small>تا</small><input class="fin" name="max" inputmode="numeric" value="' + esc(F.max ? money(hi) : "") + '" placeholder="' + money(PMAX) + '"></label></div>' +
      '<p class="fnote">قیمت‌ها به تومان. کالاهای «استعلام قیمت» با این فیلتر کنار می‌روند.</p>' : "";
    var facets = FACETS.map(function (k, i) {
      var vals = {};
      LIST.forEach(function (p) { var v = specOf(p, k); if (v) vals[v] = vals[v] || 0; });
      LIST.forEach(function (p) { var v = specOf(p, k); if (v && pass(p, k)) vals[v]++; });
      var keys = Object.keys(vals), numeric = keys.every(function (v) { return !isNaN(num(v)); });
      keys.sort(numeric ? function (a, b) { return num(a) - num(b); } : function (a, b) { return vals[b] - vals[a] || a.localeCompare(b, "fa"); });
      var on = F.sp[k] || [];
      var search = keys.length > 6 ? '<input class="fin fsearch" type="search" data-fsearch placeholder="جست‌وجو در ' + esc(k) + '" value="' + esc(FQ[k] || "") + '">' : "";
      var rows = keys.map(function (v) {
        var hide = FQ[k] && norm(v).indexOf(norm(FQ[k])) < 0;
        return '<label class="fopt' + (vals[v] || on.indexOf(v) >= 0 ? "" : " zero") + '"' + (hide ? " hidden" : "") + '><input type="checkbox" data-spec="' + esc(k) + '" value="' + esc(v) +
          '"' + (on.indexOf(v) >= 0 ? " checked" : "") + "><span>" + esc(v) + "</span><small>" + fa(vals[v]) + "</small></label>";
      }).join("");
      if (OPEN[k] === undefined && i < 2) OPEN[k] = true;
      return group(k, k, search + '<div class="fopts">' + rows + "</div>", on.length);
    }).join("");
    return '<div class="f-head"><b>فیلترها</b><button class="icon-btn" type="button" data-filters-close aria-label="بستن">' + icon("x") + "</button></div>" +
      '<form class="fbox" data-filter-form onsubmit="return false">' +
      '<div class="fsrch">' + icon("search") + '<input class="fin" name="q" type="search" value="' + esc(F.q) + '" placeholder="جست‌وجو در نتایج" maxlength="60" aria-label="جست‌وجو در نتایج"></div>' +
      group("cat", "دسته‌بندی", '<div class="fcats">' + cats + "</div>", F.cat ? 1 : 0) +
      '<div class="ftogs">' + toggleRow("avail", "فقط کالاهای موجود", n("avail", function (p) { return p.avail === "in"; })) +
      toggleRow("sale", "فقط کالاهای تخفیف‌دار", n("sale", saleOn)) + toggleRow("priced", "فقط کالاهای قیمت‌دار", n("priced", function (p) { return unit(p) > 0; })) + "</div>" +
      group("price", "محدوده‌ی قیمت", price, F.min || F.max ? 1 : 0) + facets + "</form>";
  }
  function chips() {
    var c = [];
    var chip = function (label, key) { c.push('<button type="button" class="chip" data-unf="' + esc(key) + '">' + esc(label) + icon("x") + "</button>"); };
    if (F.q) chip("«" + F.q + "»", "q");
    if (F.cat) chip(catName(F.cat), "cat");
    if (F.avail) chip("فقط موجود", "avail");
    if (F.sale) chip("تخفیف‌دار", "sale");
    if (F.priced) chip("قیمت‌دار", "priced");
    if (F.min || F.max) chip((F.min ? "از " + money(+F.min) : "") + (F.min && F.max ? " " : "") + (F.max ? "تا " + money(+F.max) : "") + " تومان", "price");
    Object.keys(F.sp).forEach(function (k) { F.sp[k].forEach(function (v) { chip(k + ": " + v, "sp\u0001" + k + "\u0001" + v); }); });
    return c.length ? c.join("") + '<button type="button" class="chip-clear" data-unf="all">حذف همه</button>' : "";
  }
  function railHtml() {
    var cur = CATS.filter(function (x) { return x.id === F.cat; })[0];
    var base = !cur ? CATS.filter(function (x) { return !x.parent; }) :
      kidsOf(cur.id).length ? CATS.filter(function (x) { return x.parent === cur.id; }) :
      cur.parent ? CATS.filter(function (x) { return x.parent === cur.parent; }) : [];
    if (!base.length) return "";
    return base.map(function (x) {
      return '<button type="button" class="rail-cat' + (x.id === F.cat ? " on" : "") + '" data-fcat="' + esc(x.id) + '">' +
        '<span class="cat-img">' + R.img(x.image, "", "") + "</span><b>" + esc(x.name) + "</b></button>";
    }).join("");
  }
  function shop() {
    var aside = document.getElementById("filters");
    var sc = aside.scrollTop, act = document.activeElement, actName = act && aside.contains(act) ? (act.name || "") + (act.getAttribute("data-fsearch") !== null ? "fs" : "") : "";
    aside.innerHTML = filtersHtml();
    aside.scrollTop = sc;
    if (!document.querySelector(".filters-scrim")) { var scr = document.createElement("div"); scr.className = "filters-scrim"; document.body.appendChild(scr); }
    var list = LIST.filter(function (p) { return pass(p, ""); });
    var by = { cheap: function (a, b) { return (unit(a) || 9e15) - (unit(b) || 9e15); }, dear: function (a, b) { return unit(b) - unit(a); },
      off: function (a, b) { return off(b) - off(a); } }[F.sort];
    if (by) list.sort(by);
    document.querySelectorAll("[data-sortv]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sortv") === F.sort)); });
    document.querySelector(".shop-count").textContent = fa(list.length) + " کالا";
    var nf = (F.cat ? 1 : 0) + (F.avail ? 1 : 0) + (F.sale ? 1 : 0) + (F.priced ? 1 : 0) + (F.min || F.max ? 1 : 0) + (F.q ? 1 : 0) +
      Object.keys(F.sp).reduce(function (a, k) { return a + F.sp[k].length; }, 0);
    document.querySelectorAll("[data-fcount]").forEach(function (el) { el.textContent = nf ? fa(nf) : ""; el.hidden = !nf; });
    var ch = document.querySelector("[data-chips]"); ch.innerHTML = chips(); ch.hidden = !ch.innerHTML;
    var rail = document.querySelector("[data-rail]"); rail.innerHTML = railHtml(); rail.hidden = !rail.innerHTML;
    var h1 = document.getElementById("pg-t"); if (h1) h1.textContent = F.cat ? catName(F.cat) : SHOP.title;
    document.querySelector('[data-slot="shop"]').innerHTML = list.length ? list.map(card).join("") :
      '<div class="empty">' + icon("search") + "<p>با این فیلترها کالایی پیدا نشد.</p><button type=\"button\" class=\"btn btn-sm\" data-unf=\"all\">حذف فیلترها</button>" +
      "<p>ابزار مورد نظر را برایتان می‌سازیم: <a href=\"/micron-demo/#order\">فرم سفارش ساخت</a></p></div>";
    if (actName) {
      var el = actName.slice(-2) === "fs" ? null : aside.querySelector('[name="' + actName + '"]');
      if (el && el.type !== "range") { el.focus(); if (el.setSelectionRange && el.type === "search") el.setSelectionRange(el.value.length, el.value.length); }
    }
  }
  var redraw = function () { writeUrl(); shop(); };
  document.addEventListener("toggle", function (e) {
    var d = e.target; if (d.classList && d.classList.contains("fgrp")) OPEN[d.getAttribute("data-k")] = d.open;
  }, true);
  document.addEventListener("click", function (e) {
    if (page !== "shop") return;
    var t;
    if ((t = e.target.closest("[data-fcat]"))) {
      var id = t.getAttribute("data-fcat");
      F.cat = F.cat === id && t.classList.contains("rail-cat") ? ((CATS.filter(function (x) { return x.id === id; })[0] || {}).parent || "") : id;
      redraw();
    } else if ((t = e.target.closest("[data-sortv]"))) { F.sort = t.getAttribute("data-sortv"); redraw(); }
    else if ((t = e.target.closest("[data-unf]"))) {
      var k = t.getAttribute("data-unf");
      if (k === "all") { var s = F.sort; F = blank(); F.sort = s; FQ = {}; }
      else if (k === "price") { F.min = ""; F.max = ""; }
      else if (k.indexOf("sp\u0001") === 0) { var a = k.split("\u0001"); F.sp[a[1]] = (F.sp[a[1]] || []).filter(function (v) { return v !== a[2]; }); }
      else F[k] = typeof F[k] === "boolean" ? false : "";
      redraw();
    }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t.closest("[data-filter-form]") || t.name === "q" || t.hasAttribute("data-fsearch")) return;
    if (t.hasAttribute("data-spec")) {
      var k = t.getAttribute("data-spec"), cur = F.sp[k] || [];
      F.sp[k] = t.checked ? cur.concat([t.value]) : cur.filter(function (v) { return v !== t.value; });
    } else if (t.name === "avail") F.avail = t.checked ? "in" : "";
    else if (t.name === "sale" || t.name === "priced") F[t.name] = t.checked;
    else if (t.name === "min" || t.name === "max") {
      var v = +toEn(t.value).replace(/\D/g, "") || 0;
      if (t.type === "range" && ((t.name === "min" && v <= 0) || (t.name === "max" && v >= PMAX))) v = 0;
      F[t.name] = v ? String(v) : "";
      if (F.min && F.max && +F.min > +F.max) { var x = F.min; F.min = F.max; F.max = x; }
    } else return;
    redraw();
  });
  document.addEventListener("input", function (e) {
    var t = e.target, form = t.closest("[data-filter-form]");
    if (!form) return;
    if (t.type === "range") {             // live numbers and track while dragging; the list updates on release
      var box = t.parentNode, lo = box.querySelector('[name="min"]'), hi = box.querySelector('[name="max"]');
      if (+lo.value > +hi.value) { if (t === lo) lo.value = hi.value; else hi.value = lo.value; }
      box.style.setProperty("--lo", (lo.value / PMAX * 100) + "%"); box.style.setProperty("--hi", (hi.value / PMAX * 100) + "%");
      var ins = form.querySelectorAll('.frange [name="min"], .frange [name="max"]');
      ins[0].value = +lo.value ? money(+lo.value) : ""; ins[1].value = +hi.value < PMAX ? money(+hi.value) : "";
    } else if (t.hasAttribute("data-fsearch")) {
      var k = t.closest(".fgrp").getAttribute("data-k"); FQ[k] = t.value;
      t.parentNode.querySelectorAll(".fopt").forEach(function (l) { l.hidden = !!t.value && norm(l.textContent).indexOf(norm(t.value)) < 0; });
    } else if (t.name === "q") {
      clearTimeout(shop.t); var v = t.value;
      shop.t = setTimeout(function () { F.q = v.trim(); redraw(); }, 300);
    }
  });

  // ---------------------------------------------------------------- product page
  function product() {
    var slot = document.querySelector('[data-slot="product"]');
    var slug = decodeURIComponent(location.pathname.replace(/^\/micron-demo\/p\//, "").replace(/\/$/, ""));
    var p = window.MICRON_PRODUCT || LIST.filter(function (x) { return x.slug === slug; })[0];
    if (!p) {
      slot.innerHTML = R.crumbs([["فروشگاه", "/micron-demo/shop/"], ["پیدا نشد", ""]]) + '<div class="empty">' + icon("search") + '<p>این محصول پیدا نشد یا دیگر فروخته نمی‌شود.</p><a class="btn" href="/micron-demo/shop/">بازگشت به فروشگاه</a></div>';
      return;
    }
    p = BY[p.id] || p;
    var imgs = (p.images || []).length ? p.images : [""];
    var thumbs = imgs.length > 1 ? '<div class="gal-thumbs">' + imgs.map(function (src, i) {
      var s = R.url(src); if (/^(img|uploads)\//.test(s)) s = "/micron-demo/" + s;
      return '<button type="button" class="' + (i ? "" : "on") + '" data-thumb="' + esc(s) + '" aria-label="تصویر ' + fa(i + 1) + '">' + R.img(src, "", "") + "</button>";
    }).join("") + "</div>" : "";
    var wish = store("wish").indexOf(p.id) >= 0, cmp = store("cmp").indexOf(p.id) >= 0;
    var specs = (p.specs || []).length ? '<table class="specs"><tbody>' + p.specs.map(function (r) {
      return '<tr><th scope="row">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>";
    }).join("") + "</tbody></table>" : "";
    var related = LIST.filter(function (x) { return x.id !== p.id && x.cat === p.cat; }).slice(0, 8);
    var buy = p.avail === "out" ? '<button class="btn btn-block" type="button" disabled>ناموجود</button>' :
      '<div class="buy"><div class="qty" role="group" aria-label="تعداد"><button type="button" class="icon-btn" data-qstep="1" aria-label="بیشتر">+</button>' +
      '<input data-qty inputmode="numeric" value="۱" aria-label="تعداد" maxlength="4"><button type="button" class="icon-btn" data-qstep="-1" aria-label="کمتر">−</button></div>' +
      '<button class="btn" type="button" data-add="' + esc(p.id) + '" data-main>' + icon("cart") + (unit(p) ? "افزودن به سبد خرید" : "افزودن برای استعلام قیمت") + "</button></div>";
    document.title = p.title + " | " + ((C.brand && C.brand.name) || "");
    slot.innerHTML = R.crumbs([["فروشگاه", "/micron-demo/shop/"], [catName(p.cat), p.cat ? "/micron-demo/shop/?cat=" + encodeURIComponent(p.cat) : ""], [p.title, ""]].filter(function (x) { return x[0]; })) +
      '<div class="pdp-grid"><div class="gallery-3d"><figure class="gal-main tilt">' + pic(p, "") + (off(p) ? '<span class="badge-off">' + fa(off(p)) + "٪</span>" : "") + "</figure>" + thumbs + "</div>" +
      '<div class="pdp-info"><p class="pc-cat">' + esc(catName(p.cat)) + (p.sku ? ' · <span dir="ltr">' + esc(p.sku) + "</span>" : "") + "</p>" +
      "<h1>" + esc(p.title) + "</h1>" + (p.summary ? '<p class="lead">' + esc(p.summary) + "</p>" : "") +
      '<div class="pdp-box">' + availHtml(p) + priceHtml(p, true) +
      (saleOn(p) && p.saleUntil ? '<p class="sale-end">' + icon("clock") + 'پایان تخفیف: <span class="cd cd-sm" dir="ltr"></span></p>' : "") +
      (unit(p) ? "" : '<p class="note">' + esc(SHOP.askNote) + "</p>") + buy +
      '<div class="pdp-tools"><button type="button" class="btn btn-ghost btn-sm' + (wish ? " on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wish + '">' + icon("heart") + "علاقه‌مندی</button>" +
      '<button type="button" class="btn btn-ghost btn-sm' + (cmp ? " on" : "") + '" data-cmp="' + esc(p.id) + '" aria-pressed="' + cmp + '">' + icon("scale") + "مقایسه</button></div></div>" +
      '<ul class="pdp-trust"><li>' + icon("file") + "ساخت طبق نقشه یا نمونه</li><li>" + icon("truck") + "پیگیری با کد سفارش</li><li>" + icon("chat") +
      '<a href="https://wa.me/' + esc(toEn(C.contact.whatsapp).replace(/\D/g, "")) + '" target="_blank" rel="noopener">پرسش در واتس‌اپ</a></li></ul></div></div>' +
      '<div class="pdp-more">' + (specs ? '<section aria-labelledby="sp-t"><h2 id="sp-t">مشخصات</h2>' + specs + "</section>" : "") +
      (p.desc ? '<section aria-labelledby="ds-t"><h2 id="ds-t">توضیحات</h2>' + String(p.desc).split(/\n+/).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") + "</section>" : "") + "</div>" +
      (related.length ? '<section class="related" aria-labelledby="rl-t"><h2 id="rl-t">محصولات مرتبط</h2><div class="prow">' + related.map(card).join("") + "</div></section>" : "") +
      '<div class="buybar">' + priceHtml(p) + (p.avail === "out" ? "" : '<button class="btn btn-sm" type="button" data-add="' + esc(p.id) + '">' + icon("cart") + (unit(p) ? "افزودن به سبد" : "استعلام") + "</button>") + "</div>";
    var cd = slot.querySelector(".cd-sm"); if (cd) countdown(cd, Date.parse(p.saleUntil));
  }

  // ---------------------------------------------------------------- cart and checkout
  function cart() {
    var slot = document.querySelector('[data-slot="cart"]');
    var lines = store("cart").filter(function (x) { return BY[x.id]; });
    if (!lines.length) {
      slot.innerHTML = '<div class="empty">' + icon("cart") + "<p>" + esc(SHOP.empty) + '</p><a class="btn" href="/micron-demo/shop/">رفتن به فروشگاه</a></div>';
      return;
    }
    var total = 0, ask = 0;
    var rows = lines.map(function (x) {
      var p = BY[x.id], u = unit(p); total += u * x.qty; if (!u) ask++;
      return '<li class="cline"><a class="cl-img" href="' + link(p) + '">' + pic(p) + '</a><div class="cl-info"><a href="' + link(p) + '"><b>' + esc(p.title) + "</b></a>" +
        "<small>" + esc(catName(p.cat)) + (p.sku ? ' · <span dir="ltr">' + esc(p.sku) + "</span>" : "") + "</small>" + priceHtml(p) + "</div>" +
        '<div class="qty" role="group" aria-label="تعداد"><button type="button" class="icon-btn" data-step="1" data-line="' + esc(p.id) + '" aria-label="بیشتر">+</button><span>' + fa(x.qty) +
        '</span><button type="button" class="icon-btn" data-step="-1" data-line="' + esc(p.id) + '" aria-label="کمتر">−</button></div>' +
        '<button type="button" class="icon-btn rm" data-rmline="' + esc(p.id) + '" aria-label="حذف">' + icon("x") + "</button></li>";
    }).join("");
    var ship = (SHOP.shipping || []).map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("");
    slot.innerHTML = '<div class="cart-grid"><div><ul class="clist">' + rows + "</ul></div>" +
      '<aside class="sum"><div class="sum-box"><p class="sum-row"><span>جمع کالاهای قیمت‌دار</span><b>' + (total ? money(total) + " تومان" : "—") + "</b></p>" +
      (ask ? '<p class="sum-row"><span>اقلام استعلامی</span><b>' + fa(ask) + " قلم</b></p>" : "") +
      '<p class="sum-row muted"><span>هزینه‌ی ارسال</span><span>در پیش‌فاکتور</span></p>' +
      '<p class="note">' + esc(SHOP.payNote) + "</p></div>" +
      '<form class="form" id="checkout" novalidate><h2>مشخصات تحویل</h2><div class="fgrid">' +
      '<label class="f"><span>نام و نام خانوادگی</span><input name="name" required maxlength="60" autocomplete="name"></label>' +
      '<label class="f"><span>موبایل</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="14" placeholder="09xxxxxxxxx" autocomplete="tel"></label>' +
      '<label class="f"><span>شهر</span><input name="city" required maxlength="40" autocomplete="address-level2"></label>' +
      '<label class="f"><span>کد پستی (اختیاری)</span><input name="postcode" inputmode="numeric" dir="ltr" maxlength="12" autocomplete="postal-code"></label>' +
      '<label class="f f-wide"><span>نشانی</span><textarea name="address" required rows="2" maxlength="300" autocomplete="street-address"></textarea></label>' +
      '<label class="f"><span>روش ارسال</span><select name="ship">' + ship + "</select></label>" +
      '<label class="f"><span>شرکت یا کارگاه</span><input name="company" maxlength="80" autocomplete="organization"></label>' +
      '<label class="f f-wide"><span>توضیح</span><textarea name="note" rows="2" maxlength="1000" placeholder="اندازه، جنس قطعه‌کار یا هر نکته‌ی دیگر"></textarea></label>' +
      '<label class="hp" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="form-msg" role="status" aria-live="polite"></p><button class="btn btn-block" type="submit">ثبت سفارش و دریافت پیش‌فاکتور</button></form></aside></div>';
    api("GET", "account/me").then(function (me) {
      if (me._status !== 200) return;
      var f = document.getElementById("checkout"); if (!f) return;
      [["name", me.name], ["phone", me.phone], ["city", me.city], ["address", me.address], ["postcode", me.postcode], ["company", me.company]].forEach(function (x) {
        if (x[1] && !f.elements[x[0]].value) f.elements[x[0]].value = x[1];
      });
    });
  }
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.id === "checkout") {
      e.preventDefault();
      var msg = f.querySelector(".form-msg"), btn = f.querySelector("[type=submit]"), v = function (n) { return f.elements[n].value.trim(); };
      msg.className = "form-msg"; msg.textContent = "";
      if (!v("name")) { msg.textContent = "نام را بنویسید."; return f.elements.name.focus(); }
      if (!/^09\d{9}$/.test(toEn(v("phone")).replace(/\D/g, "").replace(/^98/, "0"))) { msg.textContent = ERR.phone; return f.elements.phone.focus(); }
      if (!v("city")) { msg.textContent = "شهر را بنویسید."; return f.elements.city.focus(); }
      if (!v("address")) { msg.textContent = "نشانی را بنویسید."; return f.elements.address.focus(); }
      btn.disabled = true; msg.className = "form-msg ok"; msg.textContent = "در حال ثبت…";
      api("POST", "checkout", { items: store("cart"), name: v("name"), phone: v("phone"), city: v("city"), postcode: v("postcode"), address: v("address"),
        ship: v("ship"), company: v("company"), note: v("note"), website: v("website") }).then(function (j) {
        btn.disabled = false;
        if (j._status !== 200) { msg.className = "form-msg"; msg.textContent = errText(j); return; }
        store("cart", []);
        try { localStorage.setItem("micron-last-code", j.code); } catch (_) {}
        document.querySelector('[data-slot="cart"]').innerHTML = '<div class="done-box"><div class="done-ic">' + icon("cart") + "</div><h2>سفارش ثبت شد</h2>" +
          '<p>کد پیگیری: <b class="code" dir="ltr">' + fa(j.code) + "</b></p><p class=\"note\">" + esc(SHOP.payNote) + "</p>" +
          '<div class="hero-cta"><a class="btn" href="/micron-demo/track/">پیگیری سفارش</a><a class="btn btn-ghost" href="/micron-demo/shop/">ادامه‌ی خرید</a></div></div>';
        scrollTo({ top: 0, behavior: "smooth" });
      }, function () { btn.disabled = false; msg.className = "form-msg"; msg.textContent = "ارتباط برقرار نشد. اینترنت را بررسی کنید."; });
    } else if (f.id === "acc-login" || f.id === "acc-reg" || f.id === "acc-edit") {
      e.preventDefault();
      var m = f.querySelector(".form-msg"), b = f.querySelector("[type=submit]"), data = {};
      Array.prototype.forEach.call(f.elements, function (el) { if (el.name) data[el.name] = el.value.trim(); });
      var path = f.id === "acc-login" ? "account/login" : f.id === "acc-reg" ? "account/register" : "account/me";
      b.disabled = true; m.className = "form-msg"; m.textContent = "";
      api(f.id === "acc-edit" ? "PATCH" : "POST", path, data).then(function (j) {
        b.disabled = false;
        if (j._status !== 200) { m.textContent = errText(j); return; }
        if (f.id === "acc-edit") { m.className = "form-msg ok"; m.textContent = "ذخیره شد."; f.elements.old.value = ""; f.elements["new"].value = ""; }
        else draw();
      }, function () { b.disabled = false; m.textContent = "ارتباط برقرار نشد."; });
    }
  });

  // ---------------------------------------------------------------- compare and wishlist
  function compare() {
    var slot = document.querySelector('[data-slot="compare"]');
    var items = store("cmp").map(function (id) { return BY[id]; }).filter(Boolean);
    if (!items.length) { slot.innerHTML = '<div class="empty">' + icon("scale") + '<p>هنوز کالایی برای مقایسه انتخاب نکرده‌اید.</p><a class="btn" href="/micron-demo/shop/">رفتن به فروشگاه</a></div>'; return; }
    var keys = [];
    items.forEach(function (p) { (p.specs || []).forEach(function (r) { if (keys.indexOf(r[0]) < 0) keys.push(r[0]); }); });
    var row = function (label, fn) { return '<tr><th scope="row">' + esc(label) + "</th>" + items.map(function (p) { return "<td>" + fn(p) + "</td>"; }).join("") + "</tr>"; };
    slot.innerHTML = '<div class="table-wrap cmp-wrap"><table class="cmp"><thead><tr><td></td>' + items.map(function (p) {
      return '<th scope="col"><a class="cmp-img" href="' + link(p) + '">' + pic(p) + '</a><a href="' + link(p) + '">' + esc(p.title) + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-cmp="' + esc(p.id) + '">حذف</button></th>';
    }).join("") + "</tr></thead><tbody>" +
      row("قیمت", function (p) { return priceHtml(p); }) + row("وضعیت", availHtml) + row("دسته", function (p) { return esc(catName(p.cat)); }) +
      row("برند", function (p) { return esc(p.brand || "—"); }) + row("کد", function (p) { return '<span dir="ltr">' + esc(p.sku || "—") + "</span>"; }) +
      keys.map(function (k) { return row(k, function (p) { var r = (p.specs || []).filter(function (x) { return x[0] === k; })[0]; return r ? esc(r[1]) : "—"; }); }).join("") +
      row("", function (p) { return p.avail === "out" ? "" : '<button class="btn btn-sm" type="button" data-add="' + esc(p.id) + '">' + icon("cart") + "سبد</button>"; }) +
      "</tbody></table></div>";
  }
  function wishlist() {
    var slot = document.querySelector('[data-slot="wishlist"]');
    var items = store("wish").map(function (id) { return BY[id]; }).filter(Boolean);
    slot.innerHTML = items.length ? '<div class="pgrid">' + items.map(card).join("") + "</div>" :
      '<div class="empty">' + icon("heart") + '<p>فهرست علاقه‌مندی‌ها خالی است.</p><a class="btn" href="/micron-demo/shop/">رفتن به فروشگاه</a></div>';
  }

  // ---------------------------------------------------------------- account
  function account() {
    var slot = document.querySelector('[data-slot="account"]');
    var names = (C.track && C.track.statuses) || {};
    api("GET", "account/me").then(function (me) {
      if (me._status !== 200) {
        slot.innerHTML = '<div class="acc-auth form"><div class="tabs" role="tablist"><button type="button" role="tab" data-tab="in" aria-selected="true">ورود</button>' +
          '<button type="button" role="tab" data-tab="up" aria-selected="false">ساخت حساب</button></div>' +
          '<form id="acc-login" data-pane="in" novalidate><div class="fgrid one"><label class="f"><span>موبایل</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="14" autocomplete="tel"></label>' +
          '<label class="f"><span>رمز</span><input name="pass" type="password" required autocomplete="current-password"></label></div><p class="form-msg" role="status"></p>' +
          '<button class="btn btn-block" type="submit">ورود</button><p class="note">رمز را فراموش کرده‌اید؟ با کارگاه تماس بگیرید تا رمز تازه بدهیم.</p></form>' +
          '<form id="acc-reg" data-pane="up" hidden novalidate><div class="fgrid one"><label class="f"><span>نام و نام خانوادگی</span><input name="name" required maxlength="60" autocomplete="name"></label>' +
          '<label class="f"><span>موبایل</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="14" autocomplete="tel"></label>' +
          '<label class="f"><span>رمز (دست‌کم ۸ نویسه)</span><input name="pass" type="password" required minlength="8" autocomplete="new-password"></label></div>' +
          '<p class="form-msg" role="status"></p><button class="btn btn-block" type="submit">ساخت حساب</button></form>' +
          '<p class="note">بدون حساب هم می‌شود خرید کرد؛ با حساب، سفارش‌ها و نشانی شما یک‌جا می‌ماند.</p></div>';
        return;
      }
      var orders = (me.orders || []).map(function (o) {
        return '<li class="acc-order"><div><b>سفارش <span dir="ltr">' + fa(o.id) + "</span></b><small>" + new Date(o.at).toLocaleDateString("fa-IR") + "</small></div>" +
          "<p>" + esc(o.tool) + "</p><span class=\"st st-" + esc(o.status) + "\">" + esc(names[o.status] || o.status) + "</span>" +
          (o.total ? "<b>" + money(o.total) + " تومان</b>" : "<span></span>") + (o.public ? '<p class="msg-box">' + esc(o.public) + "</p>" : "") + "</li>";
      }).join("");
      slot.innerHTML = '<div class="acc-grid"><aside class="acc-side form"><div class="acc-me">' + icon("user") + "<div><b>" + esc(me.name) + '</b><small dir="ltr">' + esc(fa(me.phone)) + "</small></div></div>" +
        '<nav class="acc-nav" role="tablist"><button type="button" role="tab" data-tab="orders" aria-selected="true">سفارش‌ها</button>' +
        '<button type="button" role="tab" data-tab="profile" aria-selected="false">مشخصات و نشانی</button>' +
        '<a href="/micron-demo/wishlist/">علاقه‌مندی‌ها</a><button type="button" data-logout>خروج</button></nav></aside>' +
        '<div><section data-pane="orders">' + (orders ? '<ul class="acc-orders">' + orders + "</ul>" :
          '<div class="empty">' + icon("cart") + '<p>هنوز سفارشی با این حساب ثبت نشده.</p><a class="btn" href="/micron-demo/shop/">رفتن به فروشگاه</a></div>') + "</section>" +
        '<form id="acc-edit" class="form" data-pane="profile" hidden novalidate><div class="fgrid">' +
        '<label class="f"><span>نام</span><input name="name" maxlength="60" value="' + esc(me.name) + '"></label>' +
        '<label class="f"><span>شرکت یا کارگاه</span><input name="company" maxlength="80" value="' + esc(me.company) + '"></label>' +
        '<label class="f"><span>شهر</span><input name="city" maxlength="40" value="' + esc(me.city) + '"></label>' +
        '<label class="f"><span>کد پستی</span><input name="postcode" dir="ltr" maxlength="12" value="' + esc(me.postcode) + '"></label>' +
        '<label class="f f-wide"><span>نشانی</span><textarea name="address" rows="2" maxlength="300">' + esc(me.address) + "</textarea></label>" +
        '<label class="f"><span>رمز فعلی (برای تغییر رمز)</span><input name="old" type="password" autocomplete="current-password"></label>' +
        '<label class="f"><span>رمز تازه</span><input name="new" type="password" autocomplete="new-password"></label></div>' +
        '<p class="form-msg" role="status"></p><button class="btn" type="submit">ذخیره</button></form></div></div>';
    });
  }

  // ---------------------------------------------------------------- 3D tilt on cards and figures
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine) {
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest(".tilt");
      document.querySelectorAll(".tilt.tilting").forEach(function (x) { if (x !== el) { x.classList.remove("tilting"); x.style.transform = ""; } });
      if (!el) return;
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add("tilting");
      el.style.transform = "perspective(900px) rotateY(" + (x * 8).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg) translateZ(0)";
      el.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%"); el.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  // ---------------------------------------------------------------- start
  function draw() {
    if (page === "home") home();
    else if (page === "shop") shop();
    else if (page === "product") product();
    else if (page === "cart") cart();
    else if (page === "compare") compare();
    else if (page === "wishlist") wishlist();
    else if (page === "account") account();
    counts();
  }
  if (page === "shop") readUrl();
  draw();
  addEventListener("storage", function (e) { if (/^micron-(cart|wish|cmp)$/.test(e.key || "")) draw(); });  // another tab changed it
})();
