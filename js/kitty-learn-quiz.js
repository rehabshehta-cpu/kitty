/**
 * Kitty Learn — لعبة "أين الصوت؟" (حيوانات، ألوان، أرقام)
 */
(function () {
  "use strict";

  var lang = "ar";
  var roundIndex = 0;
  var score = 0;
  var currentRound = "animals";
  var currentCorrect = null;
  var rounds = ["animals", "colors", "numbers"];
  var roundLabels = {
    animals: { ar: "حيوانات 🦁", en: "Animals 🦁" },
    colors: { ar: "ألوان 🎨", en: "Colors 🎨" },
    numbers: { ar: "أرقام 🔢", en: "Numbers 🔢" },
  };

  var animalsPool = [
    { key: "cat", emoji: "🐱", ar: "قطة", en: "Cat" },
    { key: "dog", emoji: "🐕", ar: "كلب", en: "Dog" },
    { key: "bird", emoji: "🐦", ar: "طائر", en: "Bird" },
    { key: "fish", emoji: "🐟", ar: "سمكة", en: "Fish" },
    { key: "rabbit", emoji: "🐰", ar: "أرنب", en: "Rabbit" },
    { key: "lion", emoji: "🦁", ar: "أسد", en: "Lion" },
    { key: "elephant", emoji: "🐘", ar: "فيل", en: "Elephant" },
    { key: "penguin", emoji: "🐧", ar: "بطريق", en: "Penguin" },
  ];

  var colorsPool = [
    { hex: "ef4444", emoji: "🔴", ar: "أحمر", en: "Red" },
    { hex: "3b82f6", emoji: "🔵", ar: "أزرق", en: "Blue" },
    { hex: "eab308", emoji: "🟡", ar: "أصفر", en: "Yellow" },
    { hex: "22c55e", emoji: "🟢", ar: "أخضر", en: "Green" },
    { hex: "a855f7", emoji: "🟣", ar: "بنفسجي", en: "Purple" },
    { hex: "f97316", emoji: "🟠", ar: "برتقالي", en: "Orange" },
    { hex: "ec4899", emoji: "💗", ar: "وردي", en: "Pink" },
  ];

  var numbersPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

  function audioUrl(round, item) {
    if (round === "animals") {
      return "data/audio/animals/" + lang + "/" + item.key + ".wav";
    }
    if (round === "colors") {
      return "data/audio/colors/" + lang + "/" + item.hex + ".wav";
    }
    return "data/audio/numbers/" + lang + "/" + item + ".wav";
  }

  function speakItem(round, item) {
    var url = audioUrl(round, item);
    function fallback() {
      if (!window.KittyLearn) return;
      if (round === "numbers") {
        if (lang === "en") KittyLearn.speakKids(String(item));
        else KittyLearn.speakArabic(String(item));
      } else {
        if (lang === "en") KittyLearn.speakKids(item.en);
        else KittyLearn.speakArabic(item.ar);
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
  }

  function pickQuestion(round) {
    if (round === "animals") {
      var idx = (Math.random() * animalsPool.length) | 0;
      return { correct: animalsPool[idx], pool: animalsPool };
    }
    if (round === "colors") {
      var cidx = (Math.random() * colorsPool.length) | 0;
      return { correct: colorsPool[cidx], pool: colorsPool };
    }
    var nidx = (Math.random() * numbersPool.length) | 0;
    return { correct: numbersPool[nidx], pool: numbersPool };
  }

  function emojiFor(round, item) {
    if (round === "numbers") return String(item);
    return item.emoji;
  }

  function labelFor(round, item) {
    if (round === "numbers") return String(item);
    return lang === "en" ? item.en : item.ar;
  }

  function updateScoreUI() {
    var el = document.getElementById("quiz-score");
    if (el) {
      el.dir = lang === "ar" ? "rtl" : "ltr";
      el.textContent = lang === "ar" ? "النقاط: " + score : "Score: " + score;
    }
  }

  function updateRoundUI() {
    var el = document.getElementById("quiz-round-label");
    if (!el) return;
    var key = rounds[roundIndex];
    var labels = roundLabels[key];
    el.dir = lang === "ar" ? "rtl" : "ltr";
    el.textContent = lang === "ar" ? "الجولة: " + labels.ar : "Round: " + labels.en;
  }

  function nextQuestion() {
    var round = rounds[roundIndex];
    currentRound = round;
    var q = pickQuestion(round);
    var correct = q.correct;
    currentCorrect = correct;
    var wrong = shuffle(
      q.pool.filter(function (x) {
        if (round === "numbers") return x !== correct;
        return x !== correct;
      })
    ).slice(0, 2);
    var options = shuffle([correct].concat(wrong));
    var solved = false;

    var prompt = document.getElementById("quiz-prompt");
    var choices = document.getElementById("quiz-choices");
    var fb = document.getElementById("quiz-feedback");
    if (!choices) return;

    if (prompt) {
      prompt.dir = lang === "ar" ? "rtl" : "ltr";
      prompt.textContent =
        lang === "ar" ? "استمع… ثم اختر الصورة الصحيحة! 👂" : "Listen… then pick the right picture! 👂";
    }
    if (fb) fb.textContent = "";
    updateRoundUI();
    updateScoreUI();

    choices.innerHTML = "";
    options.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-choice";
      b.innerHTML = '<span class="quiz-choice-emoji">' + emojiFor(round, opt) + "</span>";
      b.setAttribute("aria-label", labelFor(round, opt));
      b.addEventListener("click", function () {
        var ok = opt === correct;
        if (ok) {
          if (!solved) {
            solved = true;
            score += 1;
            updateScoreUI();
            if (fb) {
              fb.dir = lang === "ar" ? "rtl" : "ltr";
              fb.textContent = lang === "ar" ? "أحسنت! ⭐" : "Great! ⭐";
            }
            if (window.KittyLearn) {
              KittyLearn.playSound("ok");
              KittyLearn.addStars(1, lang === "ar" ? "إجابة صحيحة!" : "Correct answer!");
            }
            if (roundIndex < rounds.length - 1) {
              setTimeout(function () {
                roundIndex += 1;
                nextQuestion();
              }, 1200);
            } else {
              if (fb) {
                fb.textContent =
                  lang === "ar"
                    ? "انتهت الجولات! أنت بطل! 🏆"
                    : "All rounds done! You're a champ! 🏆";
              }
              if (window.KittyLearn) KittyLearn.markGameDone("sound-quiz");
            }
          }
        } else {
          if (fb) {
            fb.dir = lang === "ar" ? "rtl" : "ltr";
            fb.textContent = lang === "ar" ? "جرّب مرة أخرى 💪" : "Try again 💪";
          }
          if (window.KittyLearn) KittyLearn.playSound("wrong");
        }
      });
      choices.appendChild(b);
    });

    setTimeout(function () {
      speakItem(round, correct);
    }, 350);
  }

  function setupLangTabs() {
    var tabEn = document.getElementById("quiz-tab-en");
    var tabAr = document.getElementById("quiz-tab-ar");
    if (!tabEn || !tabAr) return;

    function sync() {
      tabEn.classList.toggle("active", lang === "en");
      tabAr.classList.toggle("active", lang === "ar");
      tabEn.setAttribute("aria-selected", lang === "en" ? "true" : "false");
      tabAr.setAttribute("aria-selected", lang === "ar" ? "true" : "false");
      roundIndex = 0;
      score = 0;
      nextQuestion();
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
    if (!document.getElementById("quiz-choices")) return;
    setupLangTabs();
    var replay = document.getElementById("quiz-replay-sound");
    if (replay) {
      replay.addEventListener("click", function () {
        if (currentCorrect != null) speakItem(currentRound, currentCorrect);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    }
    var restart = document.getElementById("quiz-restart");
    if (restart) {
      restart.addEventListener("click", function () {
        roundIndex = 0;
        score = 0;
        nextQuestion();
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    }
  });
})();
