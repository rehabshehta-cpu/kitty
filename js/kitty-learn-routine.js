/**
 * Kitty Learn — الروتين اليومي (عربي / إنجليزي) + tick-off
 */
(function () {
  "use strict";

  var lang = "ar";
  var doneSet = {};

  var steps = [
    { key: "wake", emoji: "☀️", ar: "الاستيقاظ", en: "Wake up" },
    { key: "teeth", emoji: "🪥", ar: "تنظيف الأسنان", en: "Brush teeth" },
    { key: "wash", emoji: "🚿", ar: "غسل الوجه", en: "Wash face" },
    { key: "breakfast", emoji: "🍳", ar: "الإفطار", en: "Breakfast" },
    { key: "school", emoji: "🎒", ar: "المدرسة", en: "School" },
    { key: "lunch", emoji: "🥗", ar: "الغداء", en: "Lunch" },
    { key: "play", emoji: "🎈", ar: "اللعب", en: "Play time" },
    { key: "sleep", emoji: "🌙", ar: "وقت النوم", en: "Sleep" },
  ];

  function nameOf(s) {
    return lang === "en" ? s.en : s.ar;
  }

  function speakStep(s) {
    var url = "data/audio/routine/" + lang + "/" + s.key + ".wav";
    function fallback() {
      if (!window.KittyLearn) return;
      if (lang === "en") KittyLearn.speakKids(s.en);
      else KittyLearn.speakArabic(s.ar);
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function updateProgress() {
    var n = Object.keys(doneSet).length;
    var bar = document.getElementById("routine-progress-bar");
    var label = document.getElementById("routine-progress-label");
    var pct = Math.round((n / steps.length) * 100);
    if (bar) bar.style.width = pct + "%";
    if (label) {
      label.dir = lang === "ar" ? "rtl" : "ltr";
      label.textContent =
        lang === "ar"
          ? "أنجزت " + n + " من " + steps.length + " خطوات"
          : n + " of " + steps.length + " steps done";
    }
    if (n === steps.length && window.KittyLearn) {
      KittyLearn.playSound("win");
      KittyLearn.mascotSay(lang === "ar" ? "يوم رائع! أنجزت كل خطواتك! 🌟" : "Amazing day! All steps done! 🌟");
    }
  }

  function buildList() {
    var list = document.getElementById("routine-list");
    if (!list) return;
    list.innerHTML = "";
    steps.forEach(function (s, i) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "routine-step";
      if (doneSet[s.key]) row.classList.add("done");
      row.setAttribute("data-key", s.key);
      row.innerHTML =
        '<span class="routine-check" aria-hidden="true">' +
        (doneSet[s.key] ? "✅" : "⬜") +
        '</span><span class="routine-emoji">' +
        s.emoji +
        '</span><span class="routine-label" dir="' +
        (lang === "ar" ? "rtl" : "ltr") +
        '">' +
        nameOf(s) +
        "</span>";
      row.setAttribute("aria-label", nameOf(s));
      row.addEventListener("click", function () {
        speakStep(s);
        if (!doneSet[s.key]) {
          doneSet[s.key] = true;
          row.classList.add("done");
          row.querySelector(".routine-check").textContent = "✅";
          if (window.KittyLearn) KittyLearn.playSound("ok");
        } else {
          if (window.KittyLearn) KittyLearn.playSound("tap");
        }
        updateProgress();
      });
      list.appendChild(row);
    });
    updateProgress();
  }

  function setupLangTabs() {
    var tabEn = document.getElementById("routine-tab-en");
    var tabAr = document.getElementById("routine-tab-ar");
    var hint = document.getElementById("routine-hint");
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
            ? "اضغط على كل خطوة عندما تنجزها — ستظهر علامة ✅"
            : "Tap each step when you finish it — get a ✅ tick!";
      }
      buildList();
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
    if (!document.getElementById("routine-list")) return;
    setupLangTabs();
    var reset = document.getElementById("routine-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        doneSet = {};
        buildList();
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    }
    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        if (KittyLearn.getProgress().badges.indexOf("routine") !== -1) {
          KittyLearn.mascotSay(lang === "ar" ? "خذتي شارة الروتين قبل كده! 🏅" : "You already have the Routine badge! 🏅");
          KittyLearn.playSound("tap");
          return;
        }
        KittyLearn.claimLessonReward("routine", 2, lang === "ar" ? "روتين رائع!" : "Great routine!");
        KittyLearn.unlockBadge("routine", lang === "ar" ? "نجم الروتين" : "Routine Star");
      });
    }
  });
})();
