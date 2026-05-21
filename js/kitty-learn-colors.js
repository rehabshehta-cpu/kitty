/**
 * Kitty Learn — ألوان وأشكال (عربي / إنجليزي) + تلوين SVG + لعبة أشكال (نجمة)
 */
(function () {
  "use strict";

  var selectedHex = "#ff6b6b";
  var colorsLang = "ar";
  var shapesLang = "ar";

  var palette = [
    { hex: "#ef4444", ar: "أحمر", en: "Red" },
    { hex: "#3b82f6", ar: "أزرق", en: "Blue" },
    { hex: "#eab308", ar: "أصفر", en: "Yellow" },
    { hex: "#22c55e", ar: "أخضر", en: "Green" },
    { hex: "#a855f7", ar: "بنفسجي", en: "Purple" },
    { hex: "#f97316", ar: "برتقالي", en: "Orange" },
    { hex: "#ec4899", ar: "وردي", en: "Pink" },
    { hex: "#92400e", ar: "بني", en: "Brown" },
    { hex: "#ffffff", ar: "أبيض", en: "White" },
    { hex: "#171717", ar: "أسود", en: "Black" },
  ];

  var pictureLabels = {
    house: { ar: "🏠 بيت", en: "🏠 House" },
    flower: { ar: "🌸 وردة", en: "🌸 Flower" },
    fish: { ar: "🐟 سمكة", en: "🐟 Fish" },
  };

  var shapesData = [
    { emoji: "⭕", ar: "دائرة", en: "Circle" },
    { emoji: "◼️", ar: "مربع", en: "Square" },
    { emoji: "🔺", ar: "مثلث", en: "Triangle" },
    { emoji: "💟", ar: "قلب", en: "Heart" },
    { emoji: "⭐", ar: "نجمة", en: "Star" },
    { emoji: "▭", ar: "مستطيل", en: "Rectangle" },
  ];

  function colorDisplayName(p) {
    return colorsLang === "en" ? p.en : p.ar;
  }

  function shapeDisplayName(s) {
    return shapesLang === "en" ? s.en : s.ar;
  }

  function speakColor(p) {
    var cleanHex = p.hex.replace("#", "");
    var url = "data/audio/colors/" + colorsLang + "/" + cleanHex + ".wav";
    function fallback() {
      if (colorsLang === "en") {
        if (window.KittyLearn && KittyLearn.speakKids) KittyLearn.speakKids(p.en);
      } else if (window.KittyLearn && KittyLearn.speakArabic) {
        KittyLearn.speakArabic(p.ar);
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function speakShape(s) {
    var shapeKey = String(s.en).toLowerCase();
    var url = "data/audio/shapes/" + shapesLang + "/" + shapeKey + ".wav";
    function fallback() {
      if (shapesLang === "en") {
        if (window.KittyLearn && KittyLearn.speakKids) KittyLearn.speakKids(s.en);
      } else if (window.KittyLearn && KittyLearn.speakArabic) {
        KittyLearn.speakArabic(s.ar);
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function refreshColorHint() {
    var hint = document.getElementById("color-palette-hint");
    if (!hint) return;
    hint.dir = colorsLang === "ar" ? "rtl" : "ltr";
    hint.textContent =
      colorsLang === "ar"
        ? "اضغطي اللون لتسمعي اسمه بالعربي، ثم استخدميه للتلوين."
        : "Tap a color to hear its name in English, then use it to paint!";
  }

  function refreshPictureTabs() {
    document.querySelectorAll(".color-picture-tabs .color-pic-tab").forEach(function (btn) {
      var key = btn.getAttribute("data-picture");
      var labels = pictureLabels[key];
      if (labels) {
        btn.textContent = colorsLang === "en" ? labels.en : labels.ar;
        btn.setAttribute(
          "aria-label",
          colorsLang === "en" ? labels.en.replace(/^[^\s]+\s/, "") : labels.ar.replace(/^[^\s]+\s/, "")
        );
      }
    });
  }

  function initPalette() {
    var row = document.getElementById("color-palette-row");
    if (!row) return;
    row.innerHTML = "";
    var prev = selectedHex;
    var picked = false;
    palette.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "color-palette-item";
      var chip = document.createElement("span");
      chip.className = "color-palette-chip";
      chip.style.background = p.hex;
      if (p.hex === "#ffffff") chip.classList.add("swatch-light");
      if (p.hex === "#171717") chip.classList.add("swatch-dark");
      var nm = document.createElement("span");
      nm.className = "color-palette-name";
      nm.textContent = colorDisplayName(p);
      nm.dir = colorsLang === "ar" ? "rtl" : "ltr";
      b.appendChild(chip);
      b.appendChild(nm);
      b.setAttribute("aria-label", colorDisplayName(p));
      if (p.hex === prev) {
        b.classList.add("picked");
        picked = true;
      }
      b.addEventListener("click", function () {
        selectedHex = p.hex;
        speakColor(p);
        row.querySelectorAll(".color-palette-item").forEach(function (x) {
          x.classList.remove("picked");
        });
        b.classList.add("picked");
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      row.appendChild(b);
    });
    if (!picked) {
      var first = row.querySelector(".color-palette-item");
      if (first) {
        first.classList.add("picked");
        selectedHex = palette[0].hex;
      }
    }
  }

  function setupColorsLangTabs() {
    var tabEn = document.getElementById("colors-tab-en");
    var tabAr = document.getElementById("colors-tab-ar");
    if (!tabEn || !tabAr) return;

    function sync() {
      tabEn.classList.toggle("active", colorsLang === "en");
      tabAr.classList.toggle("active", colorsLang === "ar");
      tabEn.setAttribute("aria-selected", colorsLang === "en" ? "true" : "false");
      tabAr.setAttribute("aria-selected", colorsLang === "ar" ? "true" : "false");
      refreshColorHint();
      initPalette();
      refreshPictureTabs();
    }

    tabEn.addEventListener("click", function () {
      colorsLang = "en";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    tabAr.addEventListener("click", function () {
      colorsLang = "ar";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    sync();
  }

  function bindRegions(root) {
    if (!root) return;
    root.querySelectorAll(".color-region").forEach(function (path) {
      path.style.cursor = "pointer";
      path.addEventListener("click", function () {
        path.setAttribute("fill", selectedHex);
        if (window.KittyLearn) KittyLearn.playSound("ok");
      });
    });
  }

  function buildShapesGrid() {
    var grid = document.getElementById("shapes-explore-grid");
    if (!grid) return;
    grid.innerHTML = "";
    shapesData.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile shape-tile" + (shapesLang === "ar" ? " shape-tile-ar" : " shape-tile-en");
      var big = document.createElement("span");
      big.className = "big";
      big.textContent = s.emoji;
      var lab = document.createElement("span");
      lab.className = "label";
      lab.textContent = shapeDisplayName(s);
      lab.dir = shapesLang === "ar" ? "rtl" : "ltr";
      btn.appendChild(big);
      btn.appendChild(lab);
      btn.setAttribute("aria-label", shapeDisplayName(s));
      btn.addEventListener("click", function () {
        speakShape(s);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      grid.appendChild(btn);
    });
  }

  function setupShapesLangTabs() {
    var tabEn = document.getElementById("shapes-tab-en");
    var tabAr = document.getElementById("shapes-tab-ar");
    if (!tabEn || !tabAr) return;

    function sync() {
      tabEn.classList.toggle("active", shapesLang === "en");
      tabAr.classList.toggle("active", shapesLang === "ar");
      tabEn.setAttribute("aria-selected", shapesLang === "en" ? "true" : "false");
      tabAr.setAttribute("aria-selected", shapesLang === "ar" ? "true" : "false");
      buildShapesGrid();
      refreshShapesGameHint();
      nextShapesQuestion();
    }

    tabEn.addEventListener("click", function () {
      shapesLang = "en";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    tabAr.addEventListener("click", function () {
      shapesLang = "ar";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    sync();
  }

  function refreshShapesGameHint() {
    var el = document.getElementById("shapes-game-hint");
    if (!el) return;
    el.dir = shapesLang === "ar" ? "rtl" : "ltr";
    el.textContent =
      shapesLang === "ar"
        ? "اخترِ الاسم الصحيح للشكل. إجابة صحيحة = نجمة! ⭐"
        : "Pick the right name for the shape. Correct answer = a star! ⭐";
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function nextShapesQuestion() {
    var emojiEl = document.getElementById("shapes-game-emoji");
    var qEl = document.getElementById("shapes-game-q");
    var chEl = document.getElementById("shapes-game-choices");
    var fb = document.getElementById("shapes-game-feedback");
    if (!emojiEl || !qEl || !chEl) return;
    if (fb) fb.textContent = "";

    var idx = (Math.random() * shapesData.length) | 0;
    var correct = shapesData[idx];
    emojiEl.textContent = correct.emoji;
    qEl.dir = shapesLang === "ar" ? "rtl" : "ltr";
    qEl.textContent =
      shapesLang === "ar" ? "أي اسم يناسب هذا الشكل؟" : "Which name matches this shape?";

    var wrong = [];
    var pool = shapesData.filter(function (_, i) {
      return i !== idx;
    });
    pool = shuffle(pool);
    for (var w = 0; w < 3 && w < pool.length; w++) wrong.push(pool[w]);

    var options = shuffle([correct].concat(wrong));
    var solved = false;

    chEl.innerHTML = "";
    options.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-secondary shapes-game-choice";
      b.textContent = shapeDisplayName(opt);
      b.dir = shapesLang === "ar" ? "rtl" : "ltr";
      b.addEventListener("click", function () {
        var ok = opt === correct;
        if (ok) {
          if (!solved) {
            solved = true;
            if (fb) fb.textContent = shapesLang === "ar" ? "أحسنت! ⭐ نجمة!" : "Great! ⭐ You got a star!";
            if (window.KittyLearn) {
              KittyLearn.answerFeedback(true);
              KittyLearn.addStars(1, shapesLang === "ar" ? "شكل صحيح!" : "Correct shape!");
            }
          }
        } else {
          if (fb)
            fb.textContent = shapesLang === "ar" ? "جرّبي تاني 💪" : "Try again 💪";
          if (window.KittyLearn) KittyLearn.answerFeedback(false);
        }
      });
      chEl.appendChild(b);
    });
  }

  function tabPictures() {
    var tabs = document.querySelectorAll(".color-picture-tabs button");
    var pics = document.querySelectorAll(".coloring-svg-wrap");
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-picture");
        tabs.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        pics.forEach(function (wrap) {
          wrap.hidden = wrap.id !== "picture-" + id;
        });
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("color-palette-row")) return;
    setupColorsLangTabs();
    document.querySelectorAll(".coloring-svg-wrap svg").forEach(function (svg) {
      bindRegions(svg);
    });
    setupShapesLangTabs();
    tabPictures();

    var gameNew = document.getElementById("shapes-game-new");
    if (gameNew) gameNew.addEventListener("click", nextShapesQuestion);

    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        KittyLearn.claimLessonReward("colors", 2, "ألوان جميلة!");
      });
    }
  });
})();