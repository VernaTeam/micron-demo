/* Micron site behaviour. Every listener is delegated from document, so re-rendering the page with
   newer content from the panel never needs (or doubles) any wiring. */
(function () {
  "use strict";
  var R = window.MicronRender, page = document.body.getAttribute("data-page") || "home";
  var root = document.getElementById("app");
  var C = window.MICRON_DEFAULTS;

  // Content saved in the panel after the last build replaces the static page.
  if (window.MICRON_CONTENT && R && root) {
    C = window.MICRON_CONTENT;
    root.innerHTML = R.render(C, page);
  }

  // ---- light / dark
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    var mode = document.documentElement.getAttribute("data-mode") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", mode);
    try { localStorage.setItem("micron-mode", mode); } catch (_) {}
  });

  // ---- mobile menu
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-menu]"), nav = document.getElementById("nav");
    if (!nav) return;
    if (btn) {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    } else if (e.target.closest("#nav a")) {
      nav.classList.remove("open");
      var b = document.querySelector("[data-menu]");
      if (b) b.setAttribute("aria-expanded", "false");
    }
  });

  // ---- portfolio filter
  document.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-filter]");
    if (!chip) return;
    var k = chip.getAttribute("data-filter");
    document.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("on", c === chip); });
    document.querySelectorAll(".shot").forEach(function (s) { s.hidden = !!k && s.getAttribute("data-kind") !== k; });
  });

  // ---- category menu in the header
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cats]"), drop = document.querySelector(".cat-drop");
    if (!drop) return;
    if (btn) { drop.hidden = !drop.hidden; btn.setAttribute("aria-expanded", String(!drop.hidden)); }
    else if (!e.target.closest(".cat-drop")) { drop.hidden = true; var b = document.querySelector("[data-cats]"); if (b) b.setAttribute("aria-expanded", "false"); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var drop = document.querySelector(".cat-drop"); if (drop) drop.hidden = true;
    document.body.classList.remove("filters-open");
  });

  // ---- "inquiry" links on the made-to-order list fill the order form's tool field
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-ask]"), f = document.getElementById("order-form") || document.querySelector("form [name=tool]");
    if (!a || !f) return;
    var tool = (f.elements ? f.elements.tool : f);
    if (tool && !tool.value) tool.value = a.getAttribute("data-ask");
  });

  // ---- helpers
  var toEn = function (s) { return String(s || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }); };
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var phoneOk = function (v) { var p = toEn(v).replace(/\D/g, ""); if (/^98\d{10}$/.test(p)) p = "0" + p.slice(2); return /^09\d{9}$/.test(p) ? p : ""; };
  var api = function (path, body) {
    return fetch("/micron-demo/api/" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Micron": "1" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  };
  var size = function (n) { return n > 1048576 ? fa((n / 1048576).toFixed(1)) + " مگابایت" : fa(Math.max(1, Math.round(n / 1024))) + " کیلوبایت"; };
  var ERR = { demo: "این نسخه‌ی نمایشی سایت است؛ ثبت سفارش، ورود و پیگیری بعد از راه‌اندازی روی سرور فعال می‌شود.",
    phone: "شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.",
    "too many": "تعداد درخواست‌ها زیاد بود. کمی بعد دوباره امتحان کنید یا تماس بگیرید.",
    "file too large": "یکی از فایل‌ها بیشتر از ۸ مگابایت است.",
    "file type": "فقط عکس یا PDF می‌شود فرستاد.",
    "too large": "حجم فایل‌ها زیاد است.",
    "not found": "سفارشی با این کد و شماره پیدا نشد."
  };
  var MAX = 8 * 1024 * 1024, files = [];

  // ---- order form: files
  function drawFiles(form) {
    var ul = form.querySelector(".flist");
    ul.innerHTML = "";
    files.forEach(function (f, i) {
      var li = document.createElement("li"), name = document.createElement("span"), x = document.createElement("button");
      name.textContent = f.name + " · " + size(f.size);
      x.type = "button"; x.textContent = "حذف"; x.setAttribute("data-rm", i);
      li.appendChild(name); li.appendChild(x); ul.appendChild(li);
    });
  }
  document.addEventListener("change", function (e) {
    if (e.target.name !== "files") return;
    var form = e.target.form, msg = form.querySelector(".form-msg");
    msg.textContent = ""; msg.className = "form-msg";
    Array.prototype.forEach.call(e.target.files, function (f) {
      if (files.length >= 3) { msg.textContent = "حداکثر ۳ فایل."; return; }
      if (f.size > MAX) { msg.textContent = "«" + f.name + "» بیشتر از ۸ مگابایت است."; return; }
      if (!/^image\//.test(f.type) && f.type !== "application/pdf" && !/\.(heic|heif)$/i.test(f.name)) { msg.textContent = "«" + f.name + "» عکس یا PDF نیست."; return; }
      files.push(f);
    });
    e.target.value = "";
    drawFiles(form);
  });
  document.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rm]");
    if (!rm) return;
    files.splice(+rm.getAttribute("data-rm"), 1);
    drawFiles(rm.closest("form"));
  });
  var readFile = function (f) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () { ok({ name: f.name, data: r.result }); };
      r.onerror = fail;
      r.readAsDataURL(f);
    });
  };

  // ---- order form: submit
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (form.id !== "order-form" && form.id !== "track-form") return;
    e.preventDefault();
    var msg = form.querySelector(".form-msg"), btn = form.querySelector("[type=submit]");
    var v = function (n) { return form.elements[n] ? form.elements[n].value.trim() : ""; };
    form.querySelectorAll(".bad").forEach(function (x) { x.classList.remove("bad"); });
    var bad = function (n, t) { form.elements[n].classList.add("bad"); form.elements[n].focus(); msg.className = "form-msg"; msg.textContent = t; };
    msg.className = "form-msg"; msg.textContent = "";

    if (form.id === "track-form") {
      if (!/^\d{6}$/.test(toEn(v("code")).replace(/\D/g, ""))) return bad("code", "کد پیگیری شش رقم است.");
      if (!phoneOk(v("phone"))) return bad("phone", ERR.phone);
      btn.disabled = true;
      return api("track", { code: toEn(v("code")), phone: v("phone") }).then(function (j) {
        btn.disabled = false;
        if (j._status !== 200) { msg.textContent = ERR[j.error] || "پیدا نشد. کد و شماره را دوباره ببینید."; return; }
        showTrack(j);
      }, function () { btn.disabled = false; msg.textContent = "ارتباط برقرار نشد. اینترنت را بررسی کنید."; });
    }

    if (!v("tool")) return bad("tool", "نام یا نوع ابزار را بنویسید.");
    if (!v("name")) return bad("name", "نام خود را بنویسید.");
    if (!phoneOk(v("phone"))) return bad("phone", ERR.phone);
    btn.disabled = true; msg.className = "form-msg ok";
    msg.textContent = files.length ? "در حال ارسال فایل‌ها…" : "در حال ثبت…";
    Promise.all(files.map(readFile)).then(function (list) {
      return api("orders", { kind: v("kind"), material: v("material"), tool: v("tool"), qty: toEn(v("qty")) || "1", city: v("city"),
        desc: v("desc"), name: v("name"), company: v("company"), phone: v("phone"), website: v("website"), files: list });
    }).then(function (j) {
      btn.disabled = false;
      if (j._status !== 200 || !j.code) { msg.className = "form-msg"; msg.textContent = ERR[j.error] || "ثبت نشد. دوباره امتحان کنید یا تماس بگیرید."; return; }
      files = [];
      Array.prototype.forEach.call(form.querySelectorAll(".fgrid, .form-msg, [type=submit]"), function (x) { x.hidden = true; });
      var done = form.querySelector(".done");
      done.querySelector(".code").textContent = fa(j.code);
      done.hidden = false;
      form.scrollIntoView({ block: "start" });
      try { localStorage.setItem("micron-last-code", j.code); } catch (_) {}
    }, function () { btn.disabled = false; msg.className = "form-msg"; msg.textContent = "ارتباط برقرار نشد. اینترنت را بررسی کنید."; });
  });

  // ---- tracking result
  var SEP = " ‏·‏ ";  // RLM on both sides keeps Persian digits beside "·" in reading order
  function showTrack(j) {
    var out = document.querySelector(".track-out"), names = (C && C.track && C.track.statuses) || {};
    var date = function (iso) { try { return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }); } catch (_) { return ""; } };
    out.innerHTML = "";
    var box = document.createElement("div"); box.className = "form";
    var h = function (tag, cls, txt) { var el = document.createElement(tag); if (cls) el.className = cls; el.textContent = txt; return el; };
    box.appendChild(h("p", "kicker", "سفارش " + fa(j.code) + SEP + date(j.at)));
    box.appendChild(h("p", "status-big", names[j.status] || j.status));
    box.appendChild(h("p", "lead", j.tool + SEP + fa(j.qty) + " عدد" + (j.kind ? SEP + j.kind : "")));
    if (j.message) box.appendChild(h("p", "msg-box", j.message));
    var ol = document.createElement("ol"); ol.className = "tl";
    (j.log || []).forEach(function (x, i, a) {
      var li = document.createElement("li"); if (i === a.length - 1) li.className = "on";
      li.appendChild(h("span", "", names[x.status] || x.status));
      var t = h("time", "", date(x.at)); t.setAttribute("datetime", x.at); li.appendChild(t);
      ol.appendChild(li);
    });
    box.appendChild(ol);
    out.appendChild(box); out.hidden = false;
  }
  if (page === "track") {
    var f = document.getElementById("track-form"), last = "";
    try { last = localStorage.getItem("micron-last-code") || ""; } catch (_) {}
    if (f && last) f.elements.code.value = last;
  }
})();
