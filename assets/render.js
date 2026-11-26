/* Micron site renderer: one function turns the content JSON into the page's HTML.
   Used twice: by tools/build.mjs (static pages for visitors without script and for search engines)
   and in the browser (site.js), when the panel has saved content newer than the build. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MicronRender = factory();
})(this, function () {
  "use strict";

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  };
  var br = function (s) { return esc(s).replace(/\n/g, "<br>"); };
  var fa = function (s) { return String(s == null ? "" : s).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var en = function (s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }); };
  var tel = function (s) { return "tel:" + en(s).replace(/[^\d+]/g, ""); };
  // Only our own pages, uploads and plain web links reach an href or src.
  var url = function (s) {
    s = String(s || "").trim();
    return /^(https?:\/\/|\/|#|img\/|uploads\/|mailto:|tel:)/i.test(s) ? s : "";
  };

  function merge(defaults, saved) {
    var out = JSON.parse(JSON.stringify(defaults));
    if (!saved) return out;
    Object.keys(saved).forEach(function (k) {
      var v = saved[k];
      if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
        Object.keys(v).forEach(function (kk) { out[k][kk] = v[kk]; });
      } else out[k] = v;
    });
    return out;
  }

  // Line icons, 24px grid, drawn with the text colour.
  var ICON = {
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 10h6M9 14h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cart: '<path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    scale: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    home: '<path d="M4 11l8-7 8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    sort: '<path d="M4 7h12M4 12h8M4 17h4M18 5v14M15 16l3 3 3-3"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M15.5 13.5h2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
  };
  var icon = function (n) {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + "</svg>";
  };
  var img = function (src, alt, cls, eager) {
    src = url(src);
    if (!src) return "";
    if (/^(img|uploads)\//.test(src)) src = "/micron-demo/" + src;  // absolute: the same HTML serves /, /micron-demo/en/ and /track/
    var small = /^\/img\/.+\.webp$/.test(src) ? src.replace(/\.webp$/, "-s.webp") : "";
    return '<img class="' + (cls || "") + '" src="' + esc(small || src) + '"' +
      (small ? ' srcset="' + esc(small) + " 720w, " + esc(src) + ' 1376w" sizes="(max-width: 760px) 100vw, 50vw"' : "") +
      ' alt="' + esc(alt) + '" width="1376" height="768"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
  };
  var head = function (s, id) {
    return '<header class="sec-head">' + (s.kicker ? '<p class="kicker">' + esc(s.kicker) + "</p>" : "") +
      '<h2 id="' + id + '-t">' + br(s.title) + "</h2>" + (s.lead ? '<p class="lead">' + br(s.lead) + "</p>" : "") + "</header>";
  };
  var wa = function (c) { return "https://wa.me/" + en(c.contact.whatsapp).replace(/\D/g, ""); };
  var section = function (id, inner, cls) {
    return '<section id="' + id + '" class="sec ' + (cls || "") + '" aria-labelledby="' + id + '-t"><div class="wrap">' + inner + "</div></section>";
  };

  function brandMark(c) {
    return '<a class="brand" href="/micron-demo/" aria-label="' + esc(c.brand.name) + '"><img class="brand-logo" src="/micron-demo/img/logo-mark.svg" width="40" height="40" alt="">' +
      '<span class="brand-txt"><b>' + esc(c.brand.name) + "</b><small>" + esc(c.brand.alt) + "</small></span></a>";
  }

  function catTree(c) {
    var cats = (c.shop && c.shop.categories) || [];
    return cats.filter(function (x) { return !x.parent; }).map(function (top) {
      var kids = cats.filter(function (x) { return x.parent === top.id; });
      return '<li><a href="/micron-demo/shop/?cat=' + encodeURIComponent(top.id) + '">' + esc(top.name) + "</a>" + (kids.length ? "<ul>" + kids.map(function (k) {
        return '<li><a href="/micron-demo/shop/?cat=' + encodeURIComponent(k.id) + '">' + esc(k.name) + "</a></li>";
      }).join("") + "</ul>" : "") + "</li>";
    }).join("");
  }

  function header(c, page) {
    var nav = (c.nav || []).map(function (n) {
      return '<a href="' + esc(url(n.href)) + '">' + esc(n.label) + "</a>";
    }).join("");
    var k = c.contact, insta = "https://www.instagram.com/" + encodeURIComponent(k.instagram || "") + "/";
    var util = '<div class="util"><div class="wrap util-in">' +
      '<a href="' + esc(tel(k.phone)) + '">' + icon("phone") + '<span dir="ltr">' + esc(k.phone) + "</span></a>" +
      '<a class="u-wide" href="' + esc(wa(c)) + '" target="_blank" rel="noopener">' + icon("chat") + '<span dir="ltr">' + esc(k.mobile) + "</span></a>" +
      '<a class="u-wide" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + '<span dir="ltr">@' + esc(k.instagram) + "</span></a>" +
      '<a class="u-end" href="/micron-demo/track/">' + icon("truck") + "پیگیری سفارش</a></div></div>";
    var cnt = function (key, ic, href, label) {
      return '<a class="icon-btn has-count" href="' + href + '" aria-label="' + label + '">' + icon(ic) + '<span class="count" data-count="' + key + '" hidden></span></a>';
    };
    return util + '<header class="top" id="top"><div class="wrap top-in">' + brandMark(c) +
      '<form class="search" action="/micron-demo/shop/" role="search"><label class="sr" for="q-top">جست‌وجو</label>' +
      '<input id="q-top" name="q" type="search" placeholder="جست‌وجوی ابزار، کد یا جنس…" autocomplete="off" maxlength="60">' +
      '<button type="submit" aria-label="جست‌وجو">' + icon("search") + '</button><div class="sugg" hidden></div></form>' +
      '<div class="top-act"><button class="icon-btn" type="button" data-theme-toggle aria-label="تغییر حالت روشن و تیره">' + icon("moon") + icon("sun") + "</button>" +
      '<a class="icon-btn" href="/micron-demo/account/" aria-label="حساب کاربری">' + icon("user") + "</a>" +
      cnt("wish", "heart", "/micron-demo/wishlist/", "علاقه‌مندی‌ها") + cnt("cmp", "scale", "/micron-demo/compare/", "مقایسه") +
      '<a class="cart-btn has-count" href="/micron-demo/cart/" aria-label="سبد خرید">' + icon("cart") + '<span class="cart-lbl">سبد خرید</span><span class="count" data-count="cart" hidden></span></a>' +
      '<button class="icon-btn menu-btn" type="button" data-menu aria-controls="nav" aria-expanded="false" aria-label="منو">' + icon("menu") + "</button></div></div>" +
      '<div class="nav-row"><div class="wrap nav-in"><div class="catmenu"><button class="cat-btn" type="button" data-cats aria-expanded="false">' + icon("grid") +
      'دسته‌بندی محصولات</button><div class="cat-drop" hidden><ul class="cat-tree">' + catTree(c) + '</ul><a class="cat-all" href="/micron-demo/shop/">همه‌ی محصولات</a></div></div>' +
      '<nav class="nav" id="nav" aria-label="منوی اصلی">' + nav + '<a class="nav-m" href="/micron-demo/track/">پیگیری سفارش</a></nav></div></div></header>' +
      '<nav class="bnav" aria-label="منوی پایین">' +
      '<a href="/micron-demo/"' + (page === "home" ? ' aria-current="page"' : "") + ">" + icon("home") + "<span>خانه</span></a>" +
      '<a href="/micron-demo/shop/"' + (page === "shop" ? ' aria-current="page"' : "") + ">" + icon("grid") + "<span>فروشگاه</span></a>" +
      '<button type="button" data-search-open>' + icon("search") + "<span>جست‌وجو</span></button>" +
      '<a class="has-count" href="/micron-demo/cart/"' + (page === "cart" ? ' aria-current="page"' : "") + ">" + icon("cart") + '<span>سبد</span><span class="count" data-count="cart" hidden></span></a>' +
      '<a href="/micron-demo/account/"' + (page === "account" ? ' aria-current="page"' : "") + ">" + icon("user") + "<span>حساب</span></a></nav>";
  }

  // Banner slider (Digikala-style) with two side banners. Slides, texts, links and photos come from the panel.
  function hero(c) {
    var h = c.hero, slides = (h.slides || []).filter(function (x) { return x && x.title; });
    var go = function (x) { return x.href === "whatsapp" ? wa(c) : url(x.href) || "/micron-demo/shop/"; };
    var sl = slides.map(function (x, i) {
      var tag = i ? "h2" : "h1";
      return '<article class="slide' + (i ? "" : " on") + '" data-slide="' + i + '"' + (i ? ' aria-hidden="true"' : "") + ">" + img(x.image, "", "slide-img", !i) +
        '<div class="slide-txt"><' + tag + (i ? "" : ' id="hero-t"') + ">" + esc(x.title) + "</" + tag + ">" + (x.text ? "<p>" + esc(x.text) + "</p>" : "") +
        '<a class="btn" href="' + esc(go(x)) + '"' + (i ? ' tabindex="-1"' : "") + ">" + esc(x.cta || "بیشتر") + "</a></div></article>";
    }).join("");
    var dots = slides.length > 1 ? '<div class="sl-ctl"><button type="button" class="sl-arr" data-sl="-1" aria-label="قبلی">' + icon("arrow") + '</button><div class="sl-dots">' +
      slides.map(function (x, i) { return '<button type="button" data-sl-to="' + i + '" aria-label="اسلاید ' + fa(i + 1) + '"' + (i ? "" : ' aria-current="true"') + "></button>"; }).join("") +
      '</div><button type="button" class="sl-arr" data-sl="1" aria-label="بعدی">' + icon("arrow") + "</button></div>" : "";
    // Side banners come in pairs; with more than one pair, shop.js fades from pair to pair.
    var sideList = (h.side || []).filter(function (x) { return x && x.title; }), sets = [];
    for (var k = 0; k < sideList.length; k += 2) sets.push(sideList.slice(k, k + 2));
    var side = sets.map(function (set, i) {
      return '<div class="side-set' + (i ? "" : " on") + '"' + (i ? ' aria-hidden="true"' : "") + ">" + set.map(function (x) {
        return '<a class="side-ban" href="' + esc(go(x)) + '"' + (i ? ' tabindex="-1"' : "") + ">" + img(x.image, "", "") + "<span><b>" + esc(x.title) + "</b>" + (x.text ? "<small>" + esc(x.text) + "</small>" : "") + "</span></a>";
      }).join("") + "</div>";
    }).join("");
    return '<section class="hero-shop" aria-labelledby="hero-t"><div class="wrap hs-in"><div class="slider" data-slider aria-roledescription="carousel">' + sl + dots + "</div>" +
      (side ? '<div class="side-bans" data-sides>' + side + "</div>" : "") + "</div></section>" + features(c);
  }

  // Short promises under the hero; each one only names something the site or the shop really does.
  function features(c) {
    var f = c.features || {};
    var items = (f.items || []).filter(function (it) { return it && it.title; });
    if (!items.length) return "";
    var link = function (h) { return h === "whatsapp" ? wa(c) : url(h); };
    return '<section class="feats" aria-label="' + esc(f.label || "") + '"><div class="wrap"><ul class="feat-list">' + items.map(function (it) {
      var h = link(it.href), ext = /^https?:/.test(h);
      var inner = icon(ICON[it.icon] ? it.icon : "file") + "<span><b>" + esc(it.title) + "</b><small>" + esc(it.text) + "</small></span>";
      return "<li>" + (h ? '<a href="' + esc(h) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + inner + "</a>" : "<div>" + inner + "</div>") + "</li>";
    }).join("") + "</ul></div></section>";
  }

  var SECTIONS = {
    cats: function (c) {
      var s = c.cats, cats = ((c.shop && c.shop.categories) || []).filter(function (x) { return !x.parent; });
      if (!cats.length) return "";
      return section("cats", '<div class="row-head">' + head(s, "cats") + '<a class="more-link" href="/micron-demo/shop/">همه‌ی محصولات' + icon("arrow") + "</a></div>" +
        '<div class="cat-rail">' + cats.map(function (x) {
        return '<a class="cat-dot" href="/micron-demo/shop/?cat=' + encodeURIComponent(x.id) + '"><span class="cat-img">' + img(x.image, "", "") + "</span>" +
          "<b>" + esc(x.name) + '</b><small data-catcount="' + esc(x.id) + '"></small></a>';
      }).join("") + "</div>");
    },
    deals: function (c) {
      var s = c.deals;
      return '<section id="deals" class="sec sec-deals" aria-labelledby="deals-t" data-needs="deals" hidden><div class="wrap"><div class="deal-band">' +
        '<div class="deal-intro"><h2 id="deals-t">' + esc(s.title) + "</h2>" + (s.lead ? "<p>" + esc(s.lead) + "</p>" : "") +
        '<div class="countdown" data-countdown><span>' + esc(s.endLabel) + '</span><div class="cd" dir="ltr"></div></div>' +
        '<a class="btn btn-sm" href="/micron-demo/shop/?sale=1">همه‌ی تخفیف‌ها</a></div>' +
        '<div class="prow" data-slot="deals"></div></div></div></section>';
    },
    promos: function (c) {
      var items = ((c.promos && c.promos.items) || []).filter(function (x) { return x && x.title; });
      if (!items.length) return "";
      return '<section class="sec sec-promos" aria-label="خدمات کارگاه"><div class="wrap promo-grid">' + items.map(function (x) {
        return '<a class="promo" href="' + esc(url(x.href) || "#order") + '">' + img(x.image, "", "") + '<span class="promo-txt"><b>' + esc(x.title) + "</b>" +
          (x.text ? "<small>" + esc(x.text) + "</small>" : "") + '<span class="btn btn-sm">' + esc(x.cta || "بیشتر") + "</span></span></a>";
      }).join("") + "</div></section>";
    },
    latest: function (c) {
      var s = c.latest;
      return '<section id="latest" class="sec" aria-labelledby="latest-t" data-needs="latest" hidden><div class="wrap">' +
        '<div class="row-head">' + head(s, "latest") + '<a class="more-link" href="/micron-demo/shop/">همه‌ی محصولات' + icon("arrow") + "</a></div>" +
        '<div class="marquee" data-marquee><div class="mq-track" data-slot="latest"></div></div></div></section>';
    },
    picks: function (c) {
      var s = c.picks || {};
      return '<section id="picks" class="sec sec-alt" aria-labelledby="picks-t" data-needs="picks" hidden><div class="wrap">' +
        '<div class="row-head">' + head(s, "picks") + '<a class="more-link" href="/micron-demo/shop/">فروشگاه' + icon("arrow") + "</a></div>" +
        '<div class="pgrid picks-grid" data-slot="picks"></div></div></section>';
    },
    services: function (c) {
      var s = c.services;
      return section("services", head(s, "services") + '<div class="grid g3">' + (s.items || []).map(function (it) {
        return '<article class="card svc">' + img(it.image, it.title, "card-img") + '<div class="card-body"><h3>' + esc(it.title) + "</h3><p>" + br(it.text) + "</p></div></article>";
      }).join("") + "</div>");
    },
    products: function (c) {
      var s = c.products;
      var pics = (s.images || []).map(function (src, i) { return '<figure class="pf pf' + i + '">' + img(src, "") + "</figure>"; }).join("");
      return section("products", '<div class="split">' + '<div class="split-txt">' + head(s, "products") +
        '<ul class="plist">' + (s.items || []).map(function (it) {
          return "<li><h3>" + esc(it.title) + "</h3><p>" + br(it.text) + "</p>" +
            '<a class="ask" href="#order" data-ask="' + esc(it.title) + '">' + esc(s.ask || "استعلام قیمت") + icon("arrow") + "</a></li>";
        }).join("") + "</ul></div>" + (pics ? '<div class="pgallery" aria-hidden="true">' + pics + "</div>" : "") + "</div>", "sec-alt");
    },
    materials: function (c) {
      var s = c.materials;
      return section("materials", head(s, "materials") + '<div class="grid g4">' + (s.items || []).map(function (it) {
        return '<article class="mat"><span class="mat-code" dir="ltr">' + esc(it.code) + "</span><h3>" + esc(it.name) + "</h3><p>" + br(it.text) + "</p></article>";
      }).join("") + "</div>");
    },
    pricing: function (c) {
      var s = c.pricing, hd = s.head || [];
      var rows = (s.rows || []).map(function (r) {
        var price = String(r.price || "").trim();
        return "<tr><th scope=\"row\">" + esc(r.item) + "</th><td>" + esc(fa(r.size)) + "</td><td class=\"price" + (price ? "" : " ask") + "\">" +
          (price ? esc(fa(price)) : esc(s.empty)) + "</td></tr>";
      }).join("");
      return section("pricing", '<div class="split split-even"><div>' + head(s, "pricing") +
        '<p class="note">' + br(s.note) + '</p><a class="btn" href="#order">عکس ابزار را بفرستید</a></div>' +
        '<div class="table-wrap"><table class="ptable"><thead><tr><th scope="col">' + esc(hd[0]) + '</th><th scope="col">' + esc(hd[1]) +
        '</th><th scope="col">' + esc(hd[2]) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>", "sec-alt");
    },
    work: function (c) {
      var s = c.work, items = s.items || [];
      var insta = "https://www.instagram.com/" + encodeURIComponent(c.contact.instagram || "") + "/";
      if (!items.length) {
        return section("work", '<div class="band"><div>' + head(s, "work") + '<p class="band-txt">' + br(s.empty) + "</p></div>" +
          '<a class="btn btn-ghost" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + esc(s.emptyCta) + "</a></div>");
      }
      var filters = (s.filters || []).filter(function (f) { return items.some(function (it) { return it.kind === f; }); });
      var bar = filters.length > 1 ? '<div class="chips" role="group" aria-label="فیلتر نمونه‌کار"><button type="button" class="chip on" data-filter="">همه</button>' +
        filters.map(function (f) { return '<button type="button" class="chip" data-filter="' + esc(f) + '">' + esc(f) + "</button>"; }).join("") + "</div>" : "";
      return section("work", head(s, "work") + bar + '<div class="grid g3 gallery">' + items.map(function (it) {
        return '<figure class="shot" data-kind="' + esc(it.kind || "") + '">' + img(it.image, it.title, "") +
          (it.title ? "<figcaption>" + esc(it.title) + "</figcaption>" : "") + "</figure>";
      }).join("") + '</div><p class="more"><a href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + "نمونه‌کارهای بیشتر در اینستاگرام</a></p>");
    },
    process: function (c) {
      var s = c.process;
      return section("process", head(s, "process") + '<ol class="steps">' + (s.steps || []).map(function (st, i) {
        return '<li><span class="step-n">' + fa(i + 1) + "</span><h3>" + esc(st.title) + "</h3><p>" + br(st.text) + "</p></li>";
      }).join("") + "</ol>", "sec-dark");
    },
    order: function (c) {
      var s = c.order;
      var opts = function (list) { return (list || []).map(function (o) { return "<option>" + esc(o) + "</option>"; }).join(""); };
      return section("order", '<div class="split order-split"><div class="order-side">' + head(s, "order") +
        '<p class="note">' + esc(s.privacy) + '</p><div class="alt-contact"><a href="' + esc(wa(c)) + '" target="_blank" rel="noopener">' + icon("chat") + "ارسال عکس در واتس‌اپ</a>" +
        '<a href="' + esc(tel(c.contact.phone)) + '">' + icon("phone") + '<span dir="ltr">' + esc(c.contact.phone) + "</span></a></div></div>" +
        '<form class="form" id="order-form" novalidate>' +
        '<div class="fgrid">' +
        '<label class="f"><span>نوع کار</span><select name="kind" required>' + opts(s.kinds) + "</select></label>" +
        '<label class="f"><span>جنس ابزار</span><select name="material">' + opts(s.materials) + "</select></label>" +
        '<label class="f f-wide"><span>نام یا نوع ابزار</span><input name="tool" required maxlength="120" placeholder="مثلاً برقو قطر ۱۲ سرالماس"></label>' +
        '<label class="f"><span>تعداد</span><input name="qty" inputmode="numeric" value="۱" maxlength="6"></label>' +
        '<label class="f"><span>شهر</span><input name="city" maxlength="40" autocomplete="address-level2"></label>' +
        '<label class="f f-wide"><span>توضیح</span><textarea name="desc" rows="4" maxlength="1500" placeholder="جنس قطعه‌کار، ابعاد، تلرانس، زمان مورد نیاز…"></textarea></label>' +
        '<div class="f f-wide"><span>عکس یا نقشه</span><label class="drop">' + icon("file") + '<input type="file" name="files" accept="image/*,application/pdf" multiple>' +
        '<b>انتخاب فایل</b><small>' + esc(s.filesHint) + '</small></label><ul class="flist" aria-live="polite"></ul></div>' +
        '<label class="f"><span>نام و نام خانوادگی</span><input name="name" required maxlength="60" autocomplete="name"></label>' +
        '<label class="f"><span>شرکت یا کارگاه</span><input name="company" maxlength="80" autocomplete="organization"></label>' +
        '<label class="f f-wide"><span>موبایل</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="14" placeholder="09xxxxxxxxx" autocomplete="tel"></label>' +
        '<label class="hp" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '</div><p class="form-msg" role="status" aria-live="polite"></p>' +
        '<button class="btn btn-block" type="submit">ثبت سفارش</button>' +
        '<div class="done" hidden><p class="done-t">' + esc(s.success) + '</p><p class="code-wrap">کد پیگیری: <b class="code" dir="ltr"></b></p>' +
        '<a class="btn btn-ghost" href="/micron-demo/track/">صفحه‌ی پیگیری</a></div>' +
        "</form></div>");
    },
    faq: function (c) {
      var s = c.faq;
      return section("faq", '<div class="split split-even">' + head(s, "faq") + '<div class="faq">' + (s.items || []).map(function (it) {
        return "<details><summary>" + esc(it.q) + "</summary><p>" + br(it.a) + "</p></details>";
      }).join("") + "</div></div>", "sec-alt");
    },
    contact: function (c) {
      var s = c.contact;
      var insta = "https://www.instagram.com/" + encodeURIComponent(s.instagram || "") + "/";
      var maps = (url(s.neshan) ? '<a class="btn btn-ghost btn-sm" href="' + esc(url(s.neshan)) + '" target="_blank" rel="noopener">مسیریابی با نشان</a>' : "") +
        (url(s.balad) ? '<a class="btn btn-ghost btn-sm" href="' + esc(url(s.balad)) + '" target="_blank" rel="noopener">مسیریابی با بلد</a>' : "");
      return section("contact", head(s, "contact") + '<div class="grid g3 contact">' +
        '<a class="cc" href="' + esc(tel(s.phone)) + '">' + icon("phone") + '<span>تلفن کارگاه</span><b dir="ltr">' + esc(s.phone) + "</b></a>" +
        '<a class="cc" href="' + esc(wa(c)) + '" target="_blank" rel="noopener">' + icon("chat") + '<span>موبایل و واتس‌اپ</span><b dir="ltr">' + esc(s.mobile) + "</b></a>" +
        '<a class="cc" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + '<span>اینستاگرام</span><b dir="ltr">@' + esc(s.instagram) + "</b></a>" +
        "</div>" + '<div class="addr">' + icon("pin") + '<div><p>' + esc(s.address) + "</p>" +
        (s.hours ? '<p class="hours">' + icon("clock") + esc(s.hours) + "</p>" : "") + '<div class="maps">' + maps + "</div></div></div>");
    }
  };

  function footer(c) {
    var y = c.footer, k = c.contact, insta = "https://www.instagram.com/" + encodeURIComponent(k.instagram || "") + "/";
    var cats = ((c.shop && c.shop.categories) || []).filter(function (x) { return !x.parent; }).map(function (x) {
      return '<li><a href="/micron-demo/shop/?cat=' + encodeURIComponent(x.id) + '">' + esc(x.name) + "</a></li>";
    }).join("");
    return '<footer class="foot"><div class="wrap foot-in">' +
      '<div class="foot-col foot-brand">' + brandMark(c) + '<p class="foot-txt">' + esc(y.about || y.text) + "</p>" +
      '<div class="foot-social"><a class="icon-btn" href="' + esc(insta) + '" target="_blank" rel="noopener" aria-label="اینستاگرام">' + icon("insta") + "</a>" +
      '<a class="icon-btn" href="' + esc(wa(c)) + '" target="_blank" rel="noopener" aria-label="واتس‌اپ">' + icon("chat") + "</a>" +
      '<a class="icon-btn" href="' + esc(tel(k.phone)) + '" aria-label="تماس">' + icon("phone") + "</a></div></div>" +
      '<div class="foot-col"><h2>دسته‌بندی‌ها</h2><ul>' + cats + "</ul></div>" +
      '<div class="foot-col"><h2>دسترسی سریع</h2><ul><li><a href="/micron-demo/shop/">فروشگاه</a></li><li><a href="/micron-demo/#order">سفارش ساخت</a></li>' +
      '<li><a href="/micron-demo/track/">پیگیری سفارش</a></li><li><a href="/micron-demo/account/">حساب کاربری</a></li><li><a href="/micron-demo/about/">درباره‌ی ما</a></li>' +
      '<li><a href="/micron-demo/en/" lang="en">English</a></li></ul></div>' +
      '<div class="foot-col"><h2>تماس</h2><ul class="foot-contact"><li><a href="' + esc(tel(k.phone)) + '" dir="ltr">' + esc(k.phone) + "</a></li>" +
      '<li><a href="' + esc(wa(c)) + '" target="_blank" rel="noopener" dir="ltr">' + esc(k.mobile) + "</a></li><li>" + esc(k.address) + "</li></ul></div>" +
      '<p class="ai-note">' + esc(y.aiNote) + "</p></div></footer>";
  }

  // Shop pages: the shell is rendered here; shop.js fills it from the live catalogue.
  function crumbs(list) {
    return '<nav class="crumbs" aria-label="مسیر"><a href="/micron-demo/">خانه</a>' + list.map(function (x) {
      return '<span aria-hidden="true">‹</span>' + (x[1] ? '<a href="' + esc(x[1]) + '">' + esc(x[0]) + "</a>" : "<b>" + esc(x[0]) + "</b>");
    }).join("") + "</nav>";
  }
  function shopPage(c, page) {
    var s = c.shop || {};
    var title = { shop: s.title, cart: "سبد خرید", compare: "مقایسه‌ی محصولات", wishlist: "علاقه‌مندی‌ها", account: "حساب کاربری" }[page];
    if (page === "product") {
      return '<main id="main" class="pdp"><div class="wrap" data-slot="product"><!--PBODY--></div></main>';
    }
    var inner = page === "shop" ?
      '<header class="shop-head"><h1 id="pg-t">' + esc(title) + '</h1><p class="lead">' + esc(s.lead) + "</p></header>" +
      '<div class="shop-rail" data-rail hidden></div>' +
      '<div class="shop-grid"><aside class="filters" id="filters" aria-label="فیلترها"></aside><div class="shop-main">' +
      '<div class="shop-bar"><button class="btn btn-ghost btn-sm filter-btn" type="button" data-filters>' + icon("filter") + 'فیلترها<span class="fdot" data-fcount hidden></span></button>' +
      '<div class="sort-tabs" role="group" aria-label="مرتب‌سازی">' + icon("sort") + '<span class="st-label">مرتب‌سازی:</span>' +
      [["new", "جدیدترین"], ["cheap", "ارزان‌ترین"], ["dear", "گران‌ترین"], ["off", "بیشترین تخفیف"], ["sold", "پرفروش‌ترین"]].map(function (x) {
        return '<button type="button" data-sortv="' + x[0] + '" aria-pressed="false">' + x[1] + "</button>";
      }).join("") + '</div><p class="shop-count" role="status"></p></div>' +
      '<div class="chips" data-chips hidden></div><div class="pgrid" data-slot="shop"></div></div></div>' :
      '<header class="shop-head"><h1 id="pg-t">' + esc(title) + "</h1></header>" + '<div data-slot="' + page + '"></div>';
    return '<main id="main" class="shop-pg pg-' + page + '"><div class="wrap">' + crumbs([[title, ""]]) + inner + "</div></main>";
  }
  function aboutPage(c) {
    var a = c.about || {};
    return '<main id="main" class="about"><section class="sec" aria-labelledby="ab-t"><div class="wrap">' + crumbs([[a.kicker, ""]]) +
      '<div class="split"><div><header class="sec-head"><p class="kicker">' + esc(a.kicker) + '</p><h1 id="ab-t">' + esc(a.title) + '</h1><p class="lead">' + esc(a.lead) + "</p></header>" +
      String(a.body || "").split(/\n+/).map(function (p) { return '<p class="ab-p">' + esc(p) + "</p>"; }).join("") +
      '<div class="hero-cta"><a class="btn" href="/micron-demo/shop/">فروشگاه</a><a class="btn btn-ghost" href="/micron-demo/#order">سفارش ساخت</a></div></div>' +
      '<figure class="ab-fig tilt">' + img(a.image, "", "") + "</figure></div></div></section>" + SECTIONS.contact(c) + "</main>";
  }

  function trackPage(c) {
    var t = c.track;
    return '<main id="main" class="track"><section class="sec" aria-labelledby="track-t"><div class="wrap narrow">' +
      '<header class="sec-head"><p class="kicker">کد پیگیری</p><h1 id="track-t">' + esc(t.title) + '</h1><p class="lead">' + esc(t.lead) + "</p></header>" +
      '<form class="form" id="track-form" novalidate><div class="fgrid">' +
      '<label class="f"><span>کد پیگیری</span><input name="code" required inputmode="numeric" dir="ltr" maxlength="8"></label>' +
      '<label class="f"><span>موبایل</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="14" placeholder="09xxxxxxxxx"></label>' +
      '</div><p class="form-msg" role="status" aria-live="polite"></p><button class="btn btn-block" type="submit">نمایش وضعیت</button></form>' +
      '<div class="track-out" hidden></div></div></section></main>';
  }

  function enPage(c) {
    var e = c.en, s = c.contact;
    return '<main id="main" class="en" lang="en" dir="ltr"><section class="hero hero-en" aria-labelledby="en-t"><div class="hero-media">' + img(c.hero.image, "", "hero-img", true) + "</div>" +
      '<div class="wrap hero-in"><p class="kicker">' + esc(c.brand.nameEn) + '</p><h1 id="en-t">' + esc(e.title) + '</h1><p class="hero-lead">' + esc(e.lead) + "</p>" +
      '<div class="hero-cta"><a class="btn" href="' + esc(wa(c)) + '" target="_blank" rel="noopener">WhatsApp</a><a class="btn btn-ghost" href="' + esc(tel(s.phone)) + '">' + esc(en(s.phone)) + "</a></div></div></section>" +
      '<section class="sec" aria-labelledby="en-s"><div class="wrap split split-even"><header class="sec-head"><p class="kicker">Services</p><h2 id="en-s">What we do</h2><p class="lead">' + esc(e.contact) + "</p></header>" +
      '<ul class="en-list">' + (e.services || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></section>" +
      '<section class="sec sec-alt" aria-labelledby="en-c"><div class="wrap"><header class="sec-head"><p class="kicker">Contact</p><h2 id="en-c">Visit the workshop</h2></header>' +
      '<div class="grid g3 contact"><a class="cc" href="' + esc(tel(s.phone)) + '">' + icon("phone") + "<span>Phone</span><b>" + esc(en(s.phone)) + "</b></a>" +
      '<a class="cc" href="' + esc(wa(c)) + '" target="_blank" rel="noopener">' + icon("chat") + "<span>Mobile and WhatsApp</span><b>" + esc(en(s.mobile)) + "</b></a>" +
      '<div class="cc">' + icon("pin") + "<span>Address</span><b class=\"small\">" + esc(e.address) + "</b></div></div>" +
      '<p class="more"><a href="/micron-demo/" lang="fa" dir="rtl">' + esc(e.back) + "</a></p></div></section></main>";
  }

  function render(c, page) {
    page = page || "home";
    var body;
    if (page === "track") body = trackPage(c);
    else if (page === "en") body = enPage(c);
    else if (page === "about") body = aboutPage(c);
    else if (/^(shop|product|cart|compare|wishlist|account)$/.test(page)) body = shopPage(c, page);
    else {
      var hidden = (c.layout && c.layout.hidden) || [];
      body = '<main id="main">' + hero(c) + ((c.layout && c.layout.order) || Object.keys(SECTIONS)).filter(function (k) {
        return SECTIONS[k] && hidden.indexOf(k) < 0;
      }).map(function (k) { return SECTIONS[k](c); }).join("") + "</main>";
    }
    return '<a class="skip" href="#main">رفتن به محتوا</a>' + header(c, page) + body + footer(c);
  }

  return { render: render, merge: merge, esc: esc, fa: fa, en: en, url: url, img: img, icon: icon, crumbs: crumbs, sections: Object.keys(SECTIONS) };
});
