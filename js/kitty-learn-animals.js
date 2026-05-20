/**
 * Kitty Learn — حيوانات (عربي / إنجليزي منفصل) + حركات ملحوظة + صوت تركيبي + تلوين SVG
 */
(function () {
  "use strict";

  var ANIMALS = [
    { key: "cat", emoji: "🐱", ar: "قطة", en: "Cat", motion: "hop" },
    { key: "dog", emoji: "🐕", ar: "كلب", en: "Dog", motion: "run" },
    { key: "bird", emoji: "🐦", ar: "طائر", en: "Bird", motion: "flap" },
    { key: "fish", emoji: "🐟", ar: "سمكة", en: "Fish", motion: "swim" },
    { key: "rabbit", emoji: "🐰", ar: "أرنب", en: "Rabbit", motion: "hop" },
    { key: "elephant", emoji: "🐘", ar: "فيل", en: "Elephant", motion: "stomp" },
    { key: "lion", emoji: "🦁", ar: "أسد", en: "Lion", motion: "pounce" },
    { key: "penguin", emoji: "🐧", ar: "بطريق", en: "Penguin", motion: "waddle" },
    { key: "butterfly", emoji: "🦋", ar: "فراشة", en: "Butterfly", motion: "flutter" },
  ];

  var MOTION_SUFFIXES = ["run", "hop", "flap", "swim", "stomp", "pounce", "waddle", "flutter"];

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

  var selectedHex = "#ff8fab";
  var currentLang = "ar";
  var currentIndex = 0;

  var svgs = {
    cat:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" aria-hidden="true">' +
      '<ellipse class="color-region" cx="110" cy="118" rx="54" ry="42" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M62 72 L88 118 L48 118 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M158 72 L132 118 L172 118 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="90" cy="108" r="12" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="130" cy="108" r="12" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<ellipse class="color-region" cx="110" cy="138" rx="10" ry="6" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<path class="color-region" d="M82 125 Q110 118 138 125" fill="none" stroke="#334155" stroke-width="2.5"/>' +
      "</svg>",
    dog:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200">' +
      '<ellipse class="color-region" cx="110" cy="118" rx="56" ry="44" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="72" cy="88" rx="18" ry="38" transform="rotate(-25 72 88)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="148" cy="88" rx="18" ry="38" transform="rotate(25 148 88)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="92" cy="108" r="11" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="128" cy="108" r="11" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<ellipse class="color-region" cx="110" cy="138" rx="14" ry="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      "</svg>",
    bird:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200">' +
      '<ellipse class="color-region" cx="110" cy="110" rx="48" ry="36" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M158 100 Q210 70 195 125 Q175 115 158 118 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M138 96 L175 88 L165 108 Z" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="78" cy="102" r="12" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<path class="color-region" d="M62 130 Q110 155 158 130" fill="none" stroke="#334155" stroke-width="3"/>' +
      "</svg>",
    fish:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">' +
      '<ellipse class="color-region" cx="115" cy="80" rx="72" ry="40" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M187 80 L232 48 L232 112 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="155" cy="72" r="14" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle cx="159" cy="72" r="5" fill="#334155"/>' +
      '<path class="color-region" d="M58 58 Q88 40 118 58" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      "</svg>",
    rabbit:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">' +
      '<ellipse class="color-region" cx="78" cy="62" rx="22" ry="48" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="142" cy="62" rx="22" ry="48" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="110" cy="135" rx="52" ry="42" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="92" cy="125" r="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="128" cy="125" r="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<ellipse class="color-region" cx="110" cy="155" rx="8" ry="5" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      "</svg>",
    elephant:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200">' +
      '<ellipse class="color-region" cx="130" cy="118" rx="78" ry="52" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M85 125 Q72 175 95 188 Q105 160 102 140 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="58" cy="105" rx="28" ry="48" transform="rotate(-15 58 105)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="202" cy="105" rx="28" ry="48" transform="rotate(15 202 105)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="175" cy="105" r="14" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      "</svg>",
    lion:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220">' +
      '<circle class="color-region" cx="120" cy="118" r="72" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="120" cy="118" r="46" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<circle class="color-region" cx="98" cy="105" r="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="142" cy="105" r="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<ellipse class="color-region" cx="120" cy="135" rx="16" ry="10" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<path class="color-region" d="M120 48 L132 85 L108 85 Z" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      "</svg>",
    penguin:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220">' +
      '<ellipse class="color-region" cx="90" cy="118" rx="48" ry="72" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="90" cy="125" rx="28" ry="48" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="90" cy="78" r="28" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<path class="color-region" d="M108 72 L132 78 L108 85 Z" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<circle class="color-region" cx="82" cy="72" r="5" fill="#ffffff" stroke="#334155" stroke-width="1"/>' +
      '<circle class="color-region" cx="98" cy="72" r="5" fill="#ffffff" stroke="#334155" stroke-width="1"/>' +
      "</svg>",
    butterfly:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200">' +
      '<ellipse class="color-region" cx="120" cy="100" rx="8" ry="65" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="72" cy="88" rx="42" ry="52" transform="rotate(-25 72 88)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="168" cy="88" rx="42" ry="52" transform="rotate(25 168 88)" fill="#ffffff" stroke="#334155" stroke-width="3"/>' +
      '<ellipse class="color-region" cx="62" cy="125" rx="32" ry="38" transform="rotate(15 62 125)" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      '<ellipse class="color-region" cx="178" cy="125" rx="32" ry="38" transform="rotate(-15 178 125)" fill="#ffffff" stroke="#334155" stroke-width="2"/>' +
      "</svg>",
  };

  var audioCtx = null;
  function getCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function envBurst(ctx, osc, g, t0, dur, peak) {
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playAnimalSynth(key) {
    var ctx = getCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime + 0.02;
    function oscNote(freq, start, dur, type, vol) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      envBurst(ctx, osc, g, start, dur, vol || 0.1);
    }

    switch (key) {
      case "cat":
        oscNote(520, t0, 0.06, "triangle", 0.09);
        oscNote(980, t0 + 0.08, 0.12, "triangle", 0.08);
        oscNote(420, t0 + 0.22, 0.28, "triangle", 0.07);
        break;
      case "dog":
        oscNote(155, t0, 0.09, "square", 0.06);
        oscNote(135, t0 + 0.16, 0.1, "square", 0.055);
        break;
      case "bird":
        oscNote(1320, t0, 0.05, "sine", 0.06);
        oscNote(1580, t0 + 0.07, 0.06, "sine", 0.055);
        oscNote(1200, t0 + 0.16, 0.07, "sine", 0.05);
        break;
      case "fish":
        oscNote(320, t0, 0.15, "sine", 0.07);
        oscNote(480, t0 + 0.12, 0.18, "triangle", 0.06);
        break;
      case "rabbit":
        oscNote(880, t0, 0.04, "sine", 0.07);
        oscNote(920, t0 + 0.06, 0.05, "sine", 0.06);
        oscNote(760, t0 + 0.14, 0.08, "sine", 0.055);
        break;
      case "elephant":
        oscNote(135, t0, 0.35, "triangle", 0.09);
        oscNote(118, t0 + 0.32, 0.28, "triangle", 0.075);
        break;
      case "lion":
        oscNote(98, t0, 0.45, "sawtooth", 0.045);
        oscNote(72, t0 + 0.28, 0.38, "triangle", 0.055);
        break;
      case "penguin":
        oscNote(540, t0, 0.07, "square", 0.055);
        oscNote(620, t0 + 0.1, 0.09, "square", 0.045);
        break;
      case "butterfly":
        oscNote(1100, t0, 0.03, "sine", 0.05);
        oscNote(1400, t0 + 0.05, 0.035, "sine", 0.045);
        oscNote(1250, t0 + 0.12, 0.04, "sine", 0.04);
        break;
      default:
        oscNote(440, t0, 0.12, "sine", 0.06);
    }
  }

  function animalDisplayName(d) {
    return currentLang === "en" ? d.en : d.ar;
  }

  function colorLabel(p) {
    return currentLang === "en" ? p.en : p.ar;
  }

  function speakAnimalName(d) {
    var url = "data/audio/animals/" + currentLang + "/" + d.key + ".wav";
    function fallback() {
      if (currentLang === "en") {
        if (window.KittyLearn && KittyLearn.speakKids) KittyLearn.speakKids(d.en);
      } else if (window.KittyLearn && KittyLearn.speakArabic) {
        KittyLearn.speakArabic(d.ar);
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function speakPaletteColor(p) {
    var cleanHex = p.hex.replace("#", "");
    var url = "data/audio/colors/" + currentLang + "/" + cleanHex + ".wav";
    function fallback() {
      if (currentLang === "en") {
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

  function refreshPaletteHint() {
    var el = document.getElementById("animal-palette-hint");
    if (!el) return;
    el.dir = currentLang === "ar" ? "rtl" : "ltr";
    el.textContent =
      currentLang === "ar"
        ? "🎨 اختاري لوناً ثم المسّي جزءاً من الرسم لتلوينه"
        : "🎨 Pick a color, then tap part of the drawing to paint!";
  }

  function bindColorRegions(root) {
    if (!root) return;
    root.querySelectorAll(".color-region").forEach(function (path) {
      path.style.cursor = "pointer";
      path.addEventListener("click", function () {
        path.setAttribute("fill", selectedHex);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });
  }

  function initPalette() {
    var row = document.getElementById("animal-palette-row");
    if (!row) return;
    row.innerHTML = "";
    palette.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "color-palette-swatch animal-palette-swatch";
      b.style.background = p.hex;
      b.title = colorLabel(p);
      b.setAttribute("aria-label", colorLabel(p));
      if (p.hex === "#ffffff") b.classList.add("swatch-light");
      if (p.hex === "#171717") b.classList.add("swatch-dark");
      b.addEventListener("click", function () {
        selectedHex = p.hex;
        speakPaletteColor(p);
        row.querySelectorAll(".animal-palette-swatch").forEach(function (x) {
          x.classList.remove("picked");
        });
        b.classList.add("picked");
        if (window.KittyLearn) KittyLearn.playSound("ok");
      });
      row.appendChild(b);
    });
    row.querySelector(".animal-palette-swatch").classList.add("picked");
  }

  function clearShowcaseMotion(showcase) {
    if (!showcase) return;
    showcase.classList.remove("animal-motion");
    MOTION_SUFFIXES.forEach(function (s) {
      showcase.classList.remove("animal-motion--" + s);
    });
  }

  function triggerShowcaseMotion(showcase, motion) {
    if (!showcase) return;
    clearShowcaseMotion(showcase);
    void showcase.offsetWidth;
    showcase.classList.add("animal-motion");
    if (motion && MOTION_SUFFIXES.indexOf(motion) !== -1) {
      showcase.classList.add("animal-motion--" + motion);
    }
    clearTimeout(triggerShowcaseMotion._t);
    triggerShowcaseMotion._t = setTimeout(function () {
      clearShowcaseMotion(showcase);
    }, 1250);
  }

  function renderAnimal(index, opts) {
    opts = opts || {};
    var d = ANIMALS[index];
    var slot = document.getElementById("animal-svg-slot");
    var labelMain = document.getElementById("animal-label-main");
    var emojiBig = document.getElementById("animal-emoji-big");
    var showcase = document.getElementById("animal-showcase");
    if (!slot || !d) return;

    if (!opts.skipSvg) {
      slot.innerHTML = svgs[d.key] || "";
      bindColorRegions(slot.querySelector("svg"));
    }

    if (labelMain) {
      labelMain.textContent = animalDisplayName(d);
      labelMain.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
    }
    if (emojiBig) emojiBig.textContent = d.emoji;

    document.querySelectorAll(".animal-pick-btn").forEach(function (b, i) {
      b.classList.toggle("active", i === index);
    });

    if (opts.silent) return;

    triggerShowcaseMotion(showcase, d.motion);

    if (window.KittyLearn) KittyLearn.playSound("tap");
    playAnimalSynth(d.key);
    speakAnimalName(d);

    if (window.KittyLearn && KittyLearn.mascotSay) {
      KittyLearn.mascotSay(
        currentLang === "ar" ? "انظري كيف يتحرك " + d.ar + "!" : "Watch the " + d.en + " go!"
      );
    }
  }

  function rebuildToolbar() {
    var toolbar = document.getElementById("animal-toolbar");
    if (!toolbar) return;
    toolbar.innerHTML = "";
    toolbar.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
    ANIMALS.forEach(function (d, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "animal-pick-btn";
      btn.dataset.index = String(i);
      btn.setAttribute("aria-label", animalDisplayName(d));
      btn.innerHTML =
        '<span class="animal-pick-emoji">' +
        d.emoji +
        '</span><span class="animal-pick-name">' +
        animalDisplayName(d) +
        "</span>";
      btn.addEventListener("click", function () {
        currentIndex = i;
        renderAnimal(i);
      });
      toolbar.appendChild(btn);
    });
  }

  function setLang(lang) {
    currentLang = lang;
    var tabAr = document.getElementById("animal-tab-ar");
    var tabEn = document.getElementById("animal-tab-en");
    if (tabAr && tabEn) {
      tabAr.classList.toggle("active", lang === "ar");
      tabEn.classList.toggle("active", lang === "en");
      tabAr.setAttribute("aria-selected", lang === "ar" ? "true" : "false");
      tabEn.setAttribute("aria-selected", lang === "en" ? "true" : "false");
    }
    refreshPaletteHint();
    initPalette();
    rebuildToolbar();
    renderAnimal(currentIndex, { silent: true, skipSvg: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("animal-toolbar")) return;

    refreshPaletteHint();
    initPalette();

    var tabAr = document.getElementById("animal-tab-ar");
    var tabEn = document.getElementById("animal-tab-en");
    if (tabAr) tabAr.addEventListener("click", function () { setLang("ar"); });
    if (tabEn) tabEn.addEventListener("click", function () { setLang("en"); });

    document.getElementById("animal-hear-again") &&
      document.getElementById("animal-hear-again").addEventListener("click", function () {
        var d = ANIMALS[currentIndex];
        var showcase = document.getElementById("animal-showcase");
        if (d) triggerShowcaseMotion(showcase, d.motion);
        if (d) speakAnimalName(d);
        if (d) playAnimalSynth(d.key);
        if (window.KittyLearn) KittyLearn.playSound("ok");
      });

    currentLang = "ar";
    if (tabAr && tabEn) {
      tabAr.classList.add("active");
      tabEn.classList.remove("active");
      tabAr.setAttribute("aria-selected", "true");
      tabEn.setAttribute("aria-selected", "false");
    }
    rebuildToolbar();
    renderAnimal(0);

    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        KittyLearn.claimLessonReward("animals", 2, "تعرّفتِ على الحيوانات!");
      });
    }
  });
})();
