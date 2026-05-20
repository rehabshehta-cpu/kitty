/**
 * Kitty Learn — المشاعر (عربي / إنجليزي)
 */
(function () {
  "use strict";

  var lang = "ar";

  var emotions = [
    { key: "happy", emoji: "😊", ar: "سعيد", en: "Happy", tipAr: "عندما تفرح، شارك ابتسامتك!", tipEn: "When you're happy, share your smile!" },
    { key: "sad", emoji: "😢", ar: "حزين", en: "Sad", tipAr: "عندما تحزن، احضن من تحب.", tipEn: "When you're sad, hug someone you love." },
    { key: "angry", emoji: "😠", ar: "أنا غاضب", en: "Angry", tipAr: "خذ نفساً عميقاً وعد للعب بهدوء.", tipEn: "Take a deep breath, then play calmly." },
    { key: "scared", emoji: "😨", ar: "خائف", en: "Scared", tipAr: "أخبر ماما أو بابا — هم يحمونك.", tipEn: "Tell a grown-up — they keep you safe." },
    { key: "excited", emoji: "🤩", ar: "متحمس", en: "Excited", tipAr: "حماس جميل! شارك فرحتك بلطف.", tipEn: "Excitement is fun! Share it kindly." },
    { key: "sleepy", emoji: "😴", ar: "نعسان", en: "Sleepy", tipAr: "وقت الراحة — نوم هادئ جميل.", tipEn: "Rest time — cozy sleep helps." },
    { key: "sick", emoji: "🤒", ar: "مريض", en: "Sick", tipAr: "اشرب ماءً واسترح حتى تشفى.", tipEn: "Drink water and rest until better." },
    { key: "proud", emoji: "😤", ar: "فخور", en: "Proud", tipAr: "أحسنت! فخرك يدفعك للتعلم أكثر.", tipEn: "Well done! Pride helps you keep learning." },
  ];

  function nameOf(e) {
    return lang === "en" ? e.en : e.ar;
  }

  function tipOf(e) {
    return lang === "en" ? e.tipEn : e.tipAr;
  }

  function speakEmotion(e) {
    var url = "data/audio/emotions/" + lang + "/" + e.key + ".wav";
    function fallback() {
      if (!window.KittyLearn) return;
      if (lang === "en") KittyLearn.speakKids(e.en);
      else KittyLearn.speakArabic(e.ar);
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function buildGrid() {
    var grid = document.getElementById("emotions-grid");
    var tipEl = document.getElementById("emotion-tip");
    if (!grid) return;
    grid.innerHTML = "";
    emotions.forEach(function (e) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "emotion-card";
      btn.innerHTML =
        '<span class="emotion-emoji">' +
        e.emoji +
        '</span><span class="emotion-name" dir="' +
        (lang === "ar" ? "rtl" : "ltr") +
        '">' +
        nameOf(e) +
        "</span>";
      btn.setAttribute("aria-label", nameOf(e));
      btn.addEventListener("click", function () {
        speakEmotion(e);
        if (tipEl) {
          tipEl.dir = lang === "ar" ? "rtl" : "ltr";
          tipEl.textContent = "💡 " + tipOf(e);
        }
        grid.querySelectorAll(".emotion-card").forEach(function (c) {
          c.classList.remove("picked");
        });
        btn.classList.add("picked");
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      grid.appendChild(btn);
    });
  }

  function setupLangTabs() {
    var tabEn = document.getElementById("emotions-tab-en");
    var tabAr = document.getElementById("emotions-tab-ar");
    var hint = document.getElementById("emotions-hint");
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
            ? "اضغط على شعور لتسمع اسمه ونصيحة لطيفة."
            : "Tap a feeling to hear its name and a kind tip.";
      }
      buildGrid();
      var tipEl = document.getElementById("emotion-tip");
      if (tipEl) tipEl.textContent = "";
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
    if (!document.getElementById("emotions-grid")) return;
    setupLangTabs();
    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        if (KittyLearn.getProgress().badges.indexOf("emotions") !== -1) {
          KittyLearn.mascotSay(lang === "ar" ? "خذتي شارة المشاعر قبل كده! 🏅" : "You already have the Feelings badge! 🏅");
          KittyLearn.playSound("tap");
          return;
        }
        KittyLearn.claimLessonReward("emotions", 2, lang === "ar" ? "مشاعر جميلة!" : "Great feelings!");
        KittyLearn.unlockBadge("emotions", lang === "ar" ? "صديق المشاعر" : "Feelings Friend");
      });
    }
  });
})();
