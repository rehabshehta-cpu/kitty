/**
 * Kitty Learn — bilingual alphabet + TracePad hookup
 * Optional per-entry clips (paths relative to this HTML page): audioEn, audioAr → mp3/ogg/wav.
 */
(function () {
  "use strict";

  var englishData = [
    { letter: "A", word: "Apple", emoji: "🍎" },
    { letter: "B", word: "Ball", emoji: "⚽" },
    { letter: "C", word: "Cat", emoji: "🐱" },
    { letter: "D", word: "Dog", emoji: "🐕" },
    { letter: "E", word: "Egg", emoji: "🥚" },
    { letter: "F", word: "Fish", emoji: "🐟" },
    { letter: "G", word: "Gift", emoji: "🎁" },
    { letter: "H", word: "Heart", emoji: "❤️" },
    { letter: "I", word: "Ice cream", emoji: "🍦" },
    { letter: "J", word: "Juice", emoji: "🧃" },
    { letter: "K", word: "Kite", emoji: "🪁" },
    { letter: "L", word: "Lion", emoji: "🦁" },
    { letter: "M", word: "Moon", emoji: "🌙" },
    { letter: "N", word: "Nest", emoji: "🪺" },
    { letter: "O", word: "Orange", emoji: "🍊" },
    { letter: "P", word: "Penguin", emoji: "🐧" },
    { letter: "Q", word: "Queen", emoji: "👑" },
    { letter: "R", word: "Rainbow", emoji: "🌈" },
    { letter: "S", word: "Sun", emoji: "☀️" },
    { letter: "T", word: "Tree", emoji: "🌳" },
    { letter: "U", word: "Umbrella", emoji: "☂️" },
    { letter: "V", word: "Violin", emoji: "🎻" },
    { letter: "W", word: "Water", emoji: "💧" },
    { letter: "X", word: "X-ray fish", emoji: "🐠" },
    { letter: "Y", word: "Yo-yo", emoji: "🪀" },
    { letter: "Z", word: "Zebra", emoji: "🦓" },
  ];

  /** 28 حرفًا أساسيًا مع اسم الحرف وكلمة قريبة للأطفال */
  var arabicData = [
    { letter: "ا", name: "ألف", word: "أسد", emoji: "🦁" },
    { letter: "ب", name: "باء", word: "بطة", emoji: "🦆" },
    { letter: "ت", name: "تاء", word: "تفاحة", emoji: "🍎" },
    { letter: "ث", name: "ثاء", word: "ثعلب", emoji: "🦊" },
    { letter: "ج", name: "جيم", word: "جمل", emoji: "🐪" },
    { letter: "ح", name: "حاء", word: "حصان", emoji: "🐴" },
    { letter: "خ", name: "خاء", word: "خروف", emoji: "🐑" },
    { letter: "د", name: "دال", word: "ديك", emoji: "🐓" },
    { letter: "ذ", name: "ذال", word: "ذهب", emoji: "⭐" },
    { letter: "ر", name: "راء", word: "أرنب", emoji: "🐰" },
    { letter: "ز", name: "زاي", word: "زهرة", emoji: "🌸" },
    { letter: "س", name: "سين", word: "سمكة", emoji: "🐟" },
    { letter: "ش", name: "شين", word: "شمس", emoji: "☀️" },
    { letter: "ص", name: "صاد", word: "صقر", emoji: "🦅" },
    { letter: "ض", name: "ضاد", word: "ضفدع", emoji: "🐸" },
    { letter: "ط", name: "طاء", word: "طائرة", emoji: "✈️" },
    { letter: "ظ", name: "ظاء", word: "ظبي", emoji: "🦌" },
    { letter: "ع", name: "عين", word: "عنب", emoji: "🍇" },
    { letter: "غ", name: "غين", word: "غيمة", emoji: "☁️" },
    { letter: "ف", name: "فاء", word: "فراشة", emoji: "🦋" },
    { letter: "ق", name: "قاف", word: "قمر", emoji: "🌙" },
    { letter: "ك", name: "كاف", word: "كتاب", emoji: "📚" },
    { letter: "ل", name: "لام", word: "ليمون", emoji: "🍋" },
    { letter: "م", name: "ميم", word: "موز", emoji: "🍌" },
    { letter: "ن", name: "نون", word: "نجمة", emoji: "⭐" },
    { letter: "ه", name: "هاء", word: "هلال", emoji: "🌙" },
    { letter: "و", name: "واو", word: "وردة", emoji: "🌹" },
    { letter: "ي", name: "ياء", word: "يد", emoji: "✋" },
  ];

  var currentLang = "en";
  var currentIndex = 0;

  function getData() {
    return currentLang === "ar" ? arabicData : englishData;
  }

  function speakEnglish(text) {
    if (window.KittyLearn && KittyLearn.speakKids) {
      KittyLearn.speakKids(text);
      return;
    }
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.79;
    u.pitch = 1.42;
    speechSynthesis.speak(u);
  }

  function speakArabicPhrase(text) {
    if (window.KittyLearn && KittyLearn.speakArabic) {
      KittyLearn.speakArabic(text);
      return;
    }
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    speechSynthesis.speak(u);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var toolbar = document.getElementById("alphabet-toolbar");
    var display = document.getElementById("letter-display");
    var tabEn = document.getElementById("tab-en");
    var tabAr = document.getElementById("tab-ar");
    if (!toolbar || !display) return;

    var big = document.getElementById("big-letter");
    var emojiEl = document.getElementById("letter-emoji");
    var wordEl = document.getElementById("example-word");
    var speakBtn = document.getElementById("speak-btn");

    function setLangTabs() {
      if (tabEn && tabAr) {
        tabEn.classList.toggle("active", currentLang === "en");
        tabAr.classList.toggle("active", currentLang === "ar");
        tabEn.setAttribute("aria-selected", currentLang === "en" ? "true" : "false");
        tabAr.setAttribute("aria-selected", currentLang === "ar" ? "true" : "false");
      }
      toolbar.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
      display.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
      big.classList.toggle("kid-big-letter-ar", currentLang === "ar");
      wordEl.classList.toggle("kid-example-ar", currentLang === "ar");
    }

    function rebuildToolbar() {
      toolbar.innerHTML = "";
      var data = getData();
      data.forEach(function (d, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "letter-btn kid-letter-btn" + (currentLang === "ar" ? " letter-btn-ar" : "");
        btn.textContent = d.letter;
        btn.setAttribute(
          "aria-label",
          currentLang === "ar" ? "حرف " + d.letter : "Letter " + d.letter
        );
        btn.addEventListener("click", function () {
          showLetter(i);
        });
        toolbar.appendChild(btn);
      });
    }

    function speakCurrentLetter(opts) {
      opts = opts || {};
      var d = getData()[currentIndex];
      function chimeOk() {
        if (!opts.quietOk && window.KittyLearn) KittyLearn.playSound("ok");
      }
      function fallback() {
        if (currentLang === "ar") {
          speakArabicPhrase(d.name + "، " + d.word);
        } else {
          speakEnglish(d.letter + ". " + d.word);
        }
        chimeOk();
      }
      var url = currentLang === "ar"
        ? "data/audio/alphabet/ar/" + currentIndex + ".wav"
        : "data/audio/alphabet/en/" + currentIndex + ".wav";
      if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
        KittyLearn.tryPlaySpeech(url, fallback, { onEnded: chimeOk });
      } else {
        fallback();
      }
    }

    function showLetter(index, opts) {
      opts = opts || {};
      currentIndex = index;
      var data = getData();
      var d = data[index];
      big.textContent = d.letter;
      emojiEl.textContent = d.emoji;
      if (currentLang === "ar") {
        wordEl.textContent = d.name + " — " + d.word;
      } else {
        wordEl.textContent = d.word + "!";
      }

      document.querySelectorAll(".letter-btn").forEach(function (b, i) {
        b.classList.toggle("active", i === index);
      });

      display.style.animation = "none";
      void display.offsetWidth;
      display.style.animation = "";

      if (window.TracePad) TracePad.setLetter(d.letter, currentLang);

      if (window.KittyLearn) {
        KittyLearn.playSound("tap");
        if (currentLang === "ar") {
          KittyLearn.mascotSay("حرف " + d.name + "، كلمة: " + d.word + "!");
        } else {
          KittyLearn.mascotSay(d.letter + " is for " + d.word + "!");
        }
      }

      if (!opts.skipSpeak) {
        speakCurrentLetter({ quietOk: true });
      }
    }

    function switchLang(lang) {
      currentLang = lang;
      currentIndex = 0;
      setLangTabs();
      rebuildToolbar();
      showLetter(0, { skipSpeak: true });
    }

    if (tabEn)
      tabEn.addEventListener("click", function () {
        switchLang("en");
      });
    if (tabAr)
      tabAr.addEventListener("click", function () {
        switchLang("ar");
      });

    speakBtn.addEventListener("click", function () {
      speakCurrentLetter({ quietOk: false });
    });

    setLangTabs();
    rebuildToolbar();
    showLetter(0, { skipSpeak: true });

    var doneBtn = document.getElementById("alphabet-complete");
    if (doneBtn) {
      doneBtn.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        var p = KittyLearn.getProgress();
        if (p.badges.indexOf("alphabet") !== -1) {
          KittyLearn.mascotSay("خذتي الشارة قبل كده! 🏅");
          KittyLearn.playSound("tap");
          return;
        }
        KittyLearn.addStars(2, "استكشفتِ الحروف!");
        KittyLearn.unlockBadge("alphabet", "Alphabet Friend");
      });
    }
  });
})();
