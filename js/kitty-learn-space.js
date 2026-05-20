/**
 * Kitty Learn — الكون والفضاء (عربي / إنجليزي)
 */
(function () {
  "use strict";

  var lang = "ar";

  var bodies = [
    { key: "sun", emoji: "☀️", ar: "الشمس", en: "Sun", factAr: "الشمس نجمنا المضيء — تعطينا ضوءاً ودفئاً.", factEn: "The Sun is our bright star — it gives light and warmth." },
    { key: "moon", emoji: "🌙", ar: "القمر", en: "Moon", factAr: "القمر يدور حول الأرض ونراه ليلاً.", factEn: "The Moon goes around Earth — we see it at night." },
    { key: "mercury", emoji: "☿️", ar: "عطارد", en: "Mercury", factAr: "أصغر كوكب وأقرب للشمس.", factEn: "The smallest planet and closest to the Sun." },
    { key: "venus", emoji: "♀️", ar: "الزهرة", en: "Venus", factAr: "كوكب لامع جداً في السماء.", factEn: "A very bright planet in the sky." },
    { key: "earth", emoji: "🌍", ar: "الأرض", en: "Earth", factAr: "بيتنا — فيها ماء وهواء وحياة!", factEn: "Our home — water, air, and life!" },
    { key: "mars", emoji: "♂️", ar: "المريخ", en: "Mars", factAr: "الكوكب الأحمر — يشبه الصحراء.", factEn: "The red planet — like a big desert." },
    { key: "jupiter", emoji: "🪐", ar: "المشتري", en: "Jupiter", factAr: "أكبر كوكب — له حلقة جميلة.", factEn: "The biggest planet — it has a big stripe look." },
    { key: "saturn", emoji: "🪐", ar: "زحل", en: "Saturn", factAr: "له حلقات رائعة حوله!", factEn: "Famous for its beautiful rings!" },
    { key: "uranus", emoji: "🔵", ar: "أورانوس", en: "Uranus", factAr: "كوكب أزرق بارد بعيد.", factEn: "A cold blue planet far away." },
    { key: "neptune", emoji: "🔷", ar: "نبتون", en: "Neptune", factAr: "أبعد كوكب — لونه أزرق عميق.", factEn: "The farthest planet — deep blue color." },
  ];

  function nameOf(b) {
    return lang === "en" ? b.en : b.ar;
  }

  function factOf(b) {
    return lang === "en" ? b.factEn : b.factAr;
  }

  function speakBody(b) {
    var url = "data/audio/space/" + lang + "/" + b.key + ".wav";
    function fallback() {
      if (!window.KittyLearn) return;
      if (lang === "en") KittyLearn.speakKids(b.en);
      else KittyLearn.speakArabic(b.ar);
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function buildGrid() {
    var grid = document.getElementById("space-grid");
    var factEl = document.getElementById("space-fact");
    if (!grid) return;
    grid.innerHTML = "";
    bodies.forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "space-card";
      btn.innerHTML =
        '<span class="space-emoji">' +
        b.emoji +
        '</span><span class="space-name" dir="' +
        (lang === "ar" ? "rtl" : "ltr") +
        '">' +
        nameOf(b) +
        "</span>";
      btn.setAttribute("aria-label", nameOf(b));
      btn.addEventListener("click", function () {
        speakBody(b);
        if (factEl) {
          factEl.dir = lang === "ar" ? "rtl" : "ltr";
          factEl.textContent = factOf(b);
        }
        grid.querySelectorAll(".space-card").forEach(function (c) {
          c.classList.remove("picked");
        });
        btn.classList.add("picked");
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      grid.appendChild(btn);
    });
  }

  function initStars() {
    var layer = document.querySelector(".space-sky");
    if (!layer) return;
    for (var i = 0; i < 60; i++) {
      var s = document.createElement("span");
      s.className = "space-star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = -Math.random() * 4 + "s";
      s.style.opacity = 0.4 + Math.random() * 0.6;
      layer.appendChild(s);
    }
  }

  function setupLangTabs() {
    var tabEn = document.getElementById("space-tab-en");
    var tabAr = document.getElementById("space-tab-ar");
    var hint = document.getElementById("space-hint");
    if (!tabEn || !tabAr) return;

    function sync() {
      tabEn.classList.toggle("active", lang === "en");
      tabAr.classList.toggle("active", lang === "ar");
      tabEn.setAttribute("aria-selected", lang === "en" ? "true" : "false");
      tabAr.setAttribute("aria-selected", lang === "ar" ? "true" : "false");
      if (hint) {
        hint.dir = lang === "ar" ? "rtl" : "ltr";
        hint.textContent =
          lang === "ar"
            ? "اضغط على كوكب أو الشمس أو القمر لتسمع اسمه!"
            : "Tap a planet, the Sun, or the Moon to hear its name!";
      }
      buildGrid();
      var factEl = document.getElementById("space-fact");
      if (factEl) factEl.textContent = "";
    }

    tabEn.addEventListener("click", function () {
      lang = "en";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    tabAr.addEventListener("click", function () {
      lang = "ar";
      sync();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    sync();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("space-grid")) return;
    initStars();
    setupLangTabs();
    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (window.KittyLearn) KittyLearn.claimLessonReward("space", 2, lang === "ar" ? "مستكشف فضاء!" : "Space explorer!");
      });
    }
  });
})();
