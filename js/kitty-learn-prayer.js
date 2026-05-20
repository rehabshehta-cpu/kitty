/**
 * Kitty Learn — صفحة الصلاة والآداب: عربي / إنجليزي + خطوات وضوء (نص فقط)
 */
(function () {
  "use strict";

  var lang = "ar";

  var TEXT = {
    ar: {
      pageTitle: "الصلاة والقلوب اللطيفة 🕌",
      intro:
        "تعلّم أركان الوضوء والصلاة بنقاط بسيطة. اقرأي مع كبير في العائلة. بدّلي اللغة من الأزرار.",
      wuduH: "كيف نوضأ؟ الخطوات",
      wuduNote:
        "«بسم الله» — نبدأ أعمالنا الطيبة بذكر الله. طفلي العزيز: عدِّ المرات مع ماما أو بابا ليصح الوضوء.",
      prayerH: "خطوات الصلاة (باختصار للصغار)",
      duasH: "أدعية نحفظها معاً",
      duaBeforeEatT: "قبل الأكل",
      duaBeforeEatB: "«بسم الله» — نبدأ الأكل بحمد الله.",
      duaAfterEatT: "بعد الأكل",
      duaAfterEatB: "«الحمد لله» — نشكر الله على الطعام الطيب.",
      duaSleepT: "قبل النوم",
      duaSleepB: "دعاء بسيط وذكر رفيق مع العائلة قبل النوم.",
      mannersH: "نادي الأداب الحسنة 💝",
      mannersBtn: "تدرّبتُ على اللطف اليوم!",
      mascotKindAgain: "أخذتِ الشارة من قبل — أحسنتِ!",
      mascotKindStar: "قلب لطيف!",
      backHome: "← الرئيسية",
    },
    en: {
      pageTitle: "Prayer & gentle hearts 🕌",
      intro:
        "Learn wudu and prayer in simple steps. Read with a grown-up. Switch language with the tabs.",
      wuduH: "How do we make wudu? The steps",
      wuduNote:
        "«Bismillah» — we start good deeds with Allah’s name. Little one: count each wash with a parent so wudu is correct.",
      prayerH: "Prayer steps (kid-sized)",
      duasH: "Simple duas to remember",
      duaBeforeEatT: "Before eating",
      duaBeforeEatB: "«Bismillah» — begin food with gratitude.",
      duaAfterEatT: "After eating",
      duaAfterEatB: "«Alhamdulillah» — thank Allah for good food.",
      duaSleepT: "Before sleeping",
      duaSleepB: "Gentle dhikr with family before bed.",
      mannersH: "Good manners club 💝",
      mannersBtn: "I practiced kindness today!",
      mascotKindAgain: "You already earned Kind Friend!",
      mascotKindStar: "Kind heart sparkle!",
      backHome: "← Back home",
    },
  };

  var WUDU_STEPS = [
    {
      ar: {
        t: "١ · نبدأ",
        d: "قل «بسم الله» في قلبك قبل أن تغسل يديك.",
      },
      en: {
        t: "1 · Start",
        d: "Say «Bismillah» in your heart before you wash.",
      },
    },
    {
      ar: { t: "٢ · اليدان", d: "اغسل يديك إلى المعصم ثلاث مرات (يميناً ثم يساراً)." },
      en: { t: "2 · Hands", d: "Wash your hands to the wrists three times (right, then left)." },
    },
    {
      ar: { t: "٣ · الفم والأنف", d: "تمضمض واستنثر بلطف — ثلاث مرات لكلٍّ منهما." },
      en: { t: "3 · Mouth & nose", d: "Rinse mouth and nose gently — three times each." },
    },
    {
      ar: { t: "٤ · الوجه", d: "اغسل وجهك من فوق جبينك إلى أسفل الذقن ومن الأذن إلى الأذن — ثلاث مرات." },
      en: { t: "4 · Face", d: "Wash your face from hairline to chin and ear to ear — three times." },
    },
    {
      ar: { t: "٥ · الذراعان", d: "اغسل الذراع اليمنى ثم اليسرى إلى المرفقين — ثلاث مرات لكل ذراع." },
      en: { t: "5 · Arms", d: "Wash right arm, then left, up to the elbows — three times each." },
    },
    {
      ar: { t: "٦ · الرأس", d: "بلّل يديك ثم امسح على رأسك مرة واحدة." },
      en: { t: "6 · Head", d: "Wet your hands and wipe over your head once." },
    },
    {
      ar: { t: "٧ · القدمان", d: "اغسل القدم اليمنى ثم اليسرى إلى الكعبين — ثلاث مرات لكل قدم." },
      en: { t: "7 · Feet", d: "Wash right foot, then left, up to the ankles — three times each." },
    },
  ];

  var PRAYER_STEPS = [
    {
      ar: { t: "١ · استقبال القبلة", d: "قف بهدوء، قلبك مطمئن." },
      en: { t: "1 · Face the qiblah", d: "Stand calmly with a peaceful heart." },
    },
    {
      ar: { t: "٢ · النية والتكبير", d: "نوِ الصلاة في قلبك وكبّر قائلاً: «الله أكبر»." },
      en: { t: "2 · Niyyah & takbir", d: "Make intention and say «Allahu Akbar» raising hands." },
    },
    {
      ar: { t: "٣ · الفاتحة", d: "اقرأ سورة الفاتحة — كبير يساعدك حرفاً حرفاً." },
      en: { t: "3 · Al-Fatihah", d: "Recite slowly — grown-ups help with each line." },
    },
    {
      ar: { t: "٤ · الركوع", d: "انحنِ وقل: «سبحان ربي العظيم»." },
      en: { t: "4 · Ruku", d: "Bow and say «Subhana Rabbiyal Adheem»." },
    },
    {
      ar: { t: "٥ · السجود", d: "جبهة وأنف ويدان وركبتان وأطراف القدمين على الأرض." },
      en: { t: "5 · Sujood", d: "Forehead, nose, hands, knees, and toes touch the ground." },
    },
    {
      ar: { t: "٦ · التشهد والسلام", d: "اجلس بوقار، ثم سلّم يميناً ويساراً." },
      en: { t: "6 · Tashahhud & salam", d: "Sit nicely, then say salam to each side." },
    },
  ];

  var MANNERS = [
    {
      ar: { t: "احترام", d: "كلمة طيبة مع الوالدين والمعلّمين والأصدقاء." },
      en: { t: "Respect", d: "Gentle words with parents, teachers, and friends." },
    },
    {
      ar: { t: "لطف", d: "شارك ابتسامة، ساعد بيد صغيرة." },
      en: { t: "Kindness", d: "Share smiles and helping hands." },
    },
    {
      ar: { t: "صدق", d: "الصدق جميل — الخطأ يُصلَح مع من تحب." },
      en: { t: "Honesty", d: "Tell the truth softly — mistakes can be fixed together." },
    },
    {
      ar: { t: "شكر", d: "قل شكراً للناس، وحمداً لله على النعم." },
      en: { t: "Gratitude", d: "Thank people and thank Allah for blessings." },
    },
  ];

  function t(key) {
    return TEXT[lang][key] || "";
  }

  function speakPhrase(url, text) {
    function fallback() {
      if (lang === "en") {
        if (window.KittyLearn && KittyLearn.speakKids) KittyLearn.speakKids(text);
      } else if (window.KittyLearn && KittyLearn.speakArabic) {
        KittyLearn.speakArabic(text);
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function renderWudu() {
    var grid = document.getElementById("wudu-grid");
    if (!grid) return;
    grid.innerHTML = "";
    WUDU_STEPS.forEach(function (step) {
      var L = lang === "ar" ? step.ar : step.en;
      var card = document.createElement("article");
      card.className = "wudu-step-card";
      card.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      card.style.cursor = "pointer";
      card.innerHTML =
        '<h3 class="wudu-step-title">' +
        escapeHtml(L.t) +
        '</h3><p class="wudu-step-desc">' +
        escapeHtml(L.d) +
        "</p>";
      card.addEventListener("click", function () {
        var url = "data/audio/prayer/" + lang + "/wudu_" + WUDU_STEPS.indexOf(step) + ".wav";
        speakPhrase(url, L.t + "، " + L.d);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      grid.appendChild(card);
    });
  }

  function renderPrayerSteps() {
    var container = document.getElementById("prayer-steps-list");
    if (!container) return;
    container.innerHTML = "";
    PRAYER_STEPS.forEach(function (st) {
      var L = lang === "ar" ? st.ar : st.en;
      var art = document.createElement("article");
      art.className = "step-card";
      art.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      art.style.cursor = "pointer";
      art.innerHTML =
        "<h3>" + escapeHtml(L.t) + "</h3><p>" + escapeHtml(L.d) + "</p>";
      art.addEventListener("click", function () {
        var url = "data/audio/prayer/" + lang + "/prayer_" + PRAYER_STEPS.indexOf(st) + ".wav";
        speakPhrase(url, L.t + "، " + L.d);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      container.appendChild(art);
    });
  }

  function renderManners() {
    var container = document.getElementById("manners-list");
    if (!container) return;
    container.innerHTML = "";
    MANNERS.forEach(function (m) {
      var L = lang === "ar" ? m.ar : m.en;
      var art = document.createElement("article");
      art.className = "step-card";
      art.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      art.style.cursor = "pointer";
      art.innerHTML =
        "<h3>" + escapeHtml(L.t) + "</h3><p>" + escapeHtml(L.d) + "</p>";
      art.addEventListener("click", function () {
        var url = "data/audio/prayer/" + lang + "/manner_" + MANNERS.indexOf(m) + ".wav";
        speakPhrase(url, L.t + "، " + L.d);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
      container.appendChild(art);
    });
  }

  function applyStaticText() {
    var h = document.getElementById("prayer-page-title");
    if (h) {
      h.textContent = t("pageTitle");
      h.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var intro = document.getElementById("prayer-intro");
    if (intro) {
      intro.textContent = t("intro");
      intro.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var wh = document.getElementById("wudu-heading");
    if (wh) {
      wh.textContent = t("wuduH");
      wh.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var wn = document.getElementById("wudu-note");
    if (wn) {
      wn.textContent = t("wuduNote");
      wn.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var ph = document.getElementById("prayer-heading");
    if (ph) {
      ph.textContent = t("prayerH");
      ph.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var dh = document.getElementById("duas-heading");
    if (dh) {
      dh.textContent = t("duasH");
      dh.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    document.getElementById("dua-before-t") &&
      (document.getElementById("dua-before-t").textContent = t("duaBeforeEatT"));
    document.getElementById("dua-before-b") &&
      (document.getElementById("dua-before-b").textContent = t("duaBeforeEatB"));
    document.getElementById("dua-after-t") &&
      (document.getElementById("dua-after-t").textContent = t("duaAfterEatT"));
    document.getElementById("dua-after-b") &&
      (document.getElementById("dua-after-b").textContent = t("duaAfterEatB"));
    document.getElementById("dua-sleep-t") &&
      (document.getElementById("dua-sleep-t").textContent = t("duaSleepT"));
    document.getElementById("dua-sleep-b") &&
      (document.getElementById("dua-sleep-b").textContent = t("duaSleepB"));

    ["dua-before-t", "dua-before-b", "dua-after-t", "dua-after-b", "dua-sleep-t", "dua-sleep-b"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    });

    var mh = document.getElementById("manners-heading");
    if (mh) {
      mh.textContent = t("mannersH");
      mh.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    var btn = document.getElementById("manners-star");
    if (btn) {
      btn.textContent = t("mannersBtn");
    }
    document.querySelectorAll(".prayer-dua-card").forEach(function (el) {
      el.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    });
    var fh = document.getElementById("footer-home");
    if (fh) fh.textContent = t("backHome");
  }

  function setLang(newLang) {
    lang = newLang;
    var tabAr = document.getElementById("prayer-tab-ar");
    var tabEn = document.getElementById("prayer-tab-en");
    if (tabAr && tabEn) {
      tabAr.classList.toggle("active", lang === "ar");
      tabEn.classList.toggle("active", lang === "en");
      tabAr.setAttribute("aria-selected", lang === "ar" ? "true" : "false");
      tabEn.setAttribute("aria-selected", lang === "en" ? "true" : "false");
    }
    document.documentElement.setAttribute("lang", lang === "ar" ? "ar" : "en");
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    var main = document.getElementById("prayer-main");
    if (main) main.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    applyStaticText();
    renderWudu();
    renderPrayerSteps();
    renderManners();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("wudu-grid")) return;

    document.getElementById("prayer-tab-ar") &&
      document.getElementById("prayer-tab-ar").addEventListener("click", function () {
        setLang("ar");
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    document.getElementById("prayer-tab-en") &&
      document.getElementById("prayer-tab-en").addEventListener("click", function () {
        setLang("en");
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });

    lang = "ar";
    var tabAr = document.getElementById("prayer-tab-ar");
    var tabEn = document.getElementById("prayer-tab-en");
    if (tabAr && tabEn) {
      tabAr.classList.add("active");
      tabEn.classList.remove("active");
      tabAr.setAttribute("aria-selected", "true");
      tabEn.setAttribute("aria-selected", "false");
    }
    document.documentElement.setAttribute("lang", "ar");
    document.documentElement.setAttribute("dir", "rtl");
    var main = document.getElementById("prayer-main");
    if (main) main.setAttribute("dir", "rtl");
    applyStaticText();
    renderWudu();
    renderPrayerSteps();
    renderManners();
    var duaCards = document.querySelectorAll(".prayer-dua-card");
    duaCards.forEach(function (card, index) {
      card.style.cursor = "pointer";
      card.addEventListener("click", function () {
        var url = "data/audio/prayer/" + lang + "/dua_" + index + ".wav";
        var text = "";
        if (index === 0) {
          text = t("duaBeforeEatT") + "، " + t("duaBeforeEatB");
        } else if (index === 1) {
          text = t("duaAfterEatT") + "، " + t("duaAfterEatB");
        } else if (index === 2) {
          text = t("duaSleepT") + "، " + t("duaSleepB");
        }
        speakPhrase(url, text);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });

    var btn = document.getElementById("manners-star");
    if (btn) {
      btn.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        var p = KittyLearn.getProgress();
        if (p.badges.indexOf("manners") !== -1) {
          KittyLearn.mascotSay(t("mascotKindAgain"));
          KittyLearn.playSound("tap");
          return;
        }
        KittyLearn.addStars(2, t("mascotKindStar"));
        KittyLearn.unlockBadge("manners", "Kind Friend");
      });
    }
  });
})();
