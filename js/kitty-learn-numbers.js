/**
 * Kitty Learn — أرقام ١–١٠٠ (إنجليزي / عربي منفصل) + جمع وطرح وضرب وقسمة بسيطة للصغار
 */
(function () {
  "use strict";

  var numsLang = "en";

  function easternDigits(n) {
    var map = {
      0: "٠",
      1: "١",
      2: "٢",
      3: "٣",
      4: "٤",
      5: "٥",
      6: "٦",
      7: "٧",
      8: "٨",
      9: "٩",
    };
    return String(n).replace(/\d/g, function (d) {
      return map[d] || d;
    });
  }

  function arabicWords(n) {
    if (n === 0) return "صفر";
    if (n === 100) return "مئة";
    var onesNames = [
      "",
      "واحد",
      "اثنان",
      "ثلاثة",
      "أربعة",
      "خمسة",
      "ستة",
      "سبعة",
      "ثمانية",
      "تسعة",
    ];
    var tensNames = [
      "",
      "",
      "عشرون",
      "ثلاثون",
      "أربعون",
      "خمسون",
      "ستون",
      "سبعون",
      "ثمانون",
      "تسعون",
    ];
    if (n >= 1 && n <= 10) {
      var u10 = ["واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
      return u10[n - 1];
    }
    if (n >= 11 && n <= 19) {
      var teens = [
        "أحد عشر",
        "اثنا عشر",
        "ثلاثة عشر",
        "أربعة عشر",
        "خمسة عشر",
        "ستة عشر",
        "سبعة عشر",
        "ثمانية عشر",
        "تسعة عشر",
      ];
      return teens[n - 11];
    }
    var tensDigit = Math.floor(n / 10);
    var onesDigit = n % 10;
    if (onesDigit === 0) return tensNames[tensDigit];
    return onesNames[onesDigit] + " و" + tensNames[tensDigit];
  }

  function englishWords(n) {
    if (n === 0) return "zero";
    if (n === 100) return "one hundred";
    var low = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
      "nineteen",
    ];
    var tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    if (n < 20) return low[n - 1];
    var td = Math.floor(n / 10);
    var od = n % 10;
    if (od === 0) return tens[td];
    return tens[td] + " " + low[od - 1];
  }

  function speakNum(n, lang) {
    var url = "data/audio/numbers/" + lang + "/" + n + ".wav";
    function fallback() {
      if (lang === "en") {
        if (window.KittyLearn && KittyLearn.speakKids) {
          KittyLearn.speakKids(englishWords(n));
        }
        return;
      }
      if (window.KittyLearn && KittyLearn.speakArabic) {
        KittyLearn.speakArabic(arabicWords(n));
      } else if (window.KittyLearn && KittyLearn.speakKids) {
        KittyLearn.speakKids(String(n));
      }
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {
      KittyLearn.tryPlaySpeech(url, fallback);
    } else {
      fallback();
    }
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

  /** أخطاء شائعة قريبة من الإجابة — أنسب للأطفال */
  function pickWrongOptions(correct, minV, maxV, need) {
    var wrong = [];
    var deltas = [-2, -1, 1, 2, 3, -3, 4, -4];
    for (var d = 0; d < deltas.length && wrong.length < need; d++) {
      var guess = correct + deltas[d];
      if (guess !== correct && guess >= minV && guess <= maxV && wrong.indexOf(guess) === -1) wrong.push(guess);
    }
    var guard = 0;
    while (wrong.length < need && guard < 60) {
      guard++;
      var g = minV + ((Math.random() * (maxV - minV + 1)) | 0);
      if (g !== correct && wrong.indexOf(g) === -1) wrong.push(g);
    }
    return wrong.slice(0, need);
  }

  function tabInit(tabsSel, panelsPref) {
    var tabs = document.querySelectorAll(tabsSel + " button");
    var panels = panelsPref.map(function (id) {
      return document.getElementById(id);
    });
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-tab");
        tabs.forEach(function (b) {
          var on = b.getAttribute("data-tab") === target;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(function (p) {
          if (!p) return;
          p.classList.toggle("active", p.id === "panel-" + target);
          p.hidden = p.id !== "panel-" + target;
        });
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });
  }

  function buildNumberGrid(container) {
    if (!container) return;
    container.innerHTML = "";
    for (var n = 1; n <= 100; n++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "num-tile num-tile-lang-" + numsLang;
      if (numsLang === "en") {
        btn.setAttribute("dir", "ltr");
        btn.innerHTML =
          '<span class="num-big-solo num-west">' +
          n +
          '</span><span class="num-word-solo num-word-en">' +
          englishWords(n) +
          "</span>";
        btn.setAttribute("aria-label", "Number " + n + ", " + englishWords(n));
      } else {
        btn.setAttribute("dir", "rtl");
        btn.innerHTML =
          '<span class="num-big-solo num-east">' +
          easternDigits(n) +
          '</span><span class="num-word-solo">' +
          arabicWords(n) +
          "</span>";
        btn.setAttribute("aria-label", arabicWords(n));
      }
      (function (num) {
        btn.addEventListener("click", function () {
          speakNum(num, numsLang);
          if (window.KittyLearn) KittyLearn.playSound("tap");
        });
      })(n);
      container.appendChild(btn);
    }
  }

  function setupNumsLangTabs() {
    var tabEn = document.getElementById("nums-tab-en");
    var tabAr = document.getElementById("nums-tab-ar");
    var grid = document.getElementById("numbers-grid");
    if (!tabEn || !tabAr || !grid) return;

    function syncTabs() {
      tabEn.classList.toggle("active", numsLang === "en");
      tabAr.classList.toggle("active", numsLang === "ar");
      tabEn.setAttribute("aria-selected", numsLang === "en" ? "true" : "false");
      tabAr.setAttribute("aria-selected", numsLang === "ar" ? "true" : "false");
      buildNumberGrid(grid);
    }

    tabEn.addEventListener("click", function () {
      numsLang = "en";
      syncTabs();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    tabAr.addEventListener("click", function () {
      numsLang = "ar";
      syncTabs();
      if (window.KittyLearn) KittyLearn.playSound("tap");
    });
    syncTabs();
  }

  function choiceButtons(container, correct, options, onPick) {
    container.innerHTML = "";
    shuffle(options).forEach(function (val) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "math-choice-btn math-choice-kid";
      b.innerHTML =
        '<span class="math-choice-big" dir="ltr">' +
        val +
        '</span><span class="math-choice-sub" dir="rtl">' +
        easternDigits(val) +
        "</span>";
      b.addEventListener("click", function () {
        onPick(val === correct, val);
      });
      container.appendChild(b);
    });
  }

  function rewardCorrect(fb) {
    fb.textContent = "أحسنت! ⭐ أخذتِ نجمة!";
    if (window.KittyLearn) {
      KittyLearn.playSound("ok");
      KittyLearn.addStars(1, "إجابة صحيحة!");
    }
  }

  function rewardWrong(fb) {
    fb.textContent = "جرّبي تاني 💪";
    if (window.KittyLearn) KittyLearn.playSound("wrong");
  }

  function setupAdd() {
    var qEl = document.getElementById("quiz-add-q");
    var chEl = document.getElementById("quiz-add-choices");
    var fb = document.getElementById("quiz-add-feedback");
    var btn = document.getElementById("quiz-add-new");
    if (!qEl || !chEl) return;

    function next() {
      fb.textContent = "";
      var a;
      var b;
      var sum;
      do {
        a = 1 + ((Math.random() * 9) | 0);
        b = 1 + ((Math.random() * 9) | 0);
        sum = a + b;
      } while (sum > 10);
      qEl.innerHTML =
        '<span dir="rtl">' + easternDigits(a) + " ➕ " + easternDigits(b) + " = ؟</span>";
      var wrong = pickWrongOptions(sum, 0, 10, 3);
      var solved = false;
      choiceButtons(chEl, sum, [sum].concat(wrong), function (ok) {
        if (ok) {
          if (!solved) {
            solved = true;
            rewardCorrect(fb);
          }
        } else {
          rewardWrong(fb);
        }
      });
    }

    if (btn) btn.addEventListener("click", next);
    next();
  }

  function setupSub() {
    var qEl = document.getElementById("quiz-sub-q");
    var chEl = document.getElementById("quiz-sub-choices");
    var fb = document.getElementById("quiz-sub-feedback");
    var btn = document.getElementById("quiz-sub-new");
    if (!qEl || !chEl) return;

    function next() {
      fb.textContent = "";
      var a = 2 + ((Math.random() * 9) | 0);
      if (a > 10) a = 10;
      var b = 1 + ((Math.random() * (a - 1)) | 0);
      var diff = a - b;
      qEl.innerHTML =
        '<span dir="rtl">' + easternDigits(a) + " ➖ " + easternDigits(b) + " = ؟</span>";
      var wrong = pickWrongOptions(diff, 0, 10, 3);
      var solved = false;
      choiceButtons(chEl, diff, [diff].concat(wrong), function (ok) {
        if (ok) {
          if (!solved) {
            solved = true;
            rewardCorrect(fb);
          }
        } else {
          rewardWrong(fb);
        }
      });
    }
    if (btn) btn.addEventListener("click", next);
    next();
  }

  function setupMul() {
    var qEl = document.getElementById("quiz-mul-q");
    var chEl = document.getElementById("quiz-mul-choices");
    var fb = document.getElementById("quiz-mul-feedback");
    var btn = document.getElementById("quiz-mul-new");
    if (!qEl || !chEl) return;

    function next() {
      fb.textContent = "";
      var a;
      var b;
      var p;
      do {
        a = 1 + ((Math.random() * 5) | 0);
        b = 1 + ((Math.random() * 5) | 0);
        p = a * b;
      } while (p > 10);
      qEl.innerHTML =
        '<span dir="rtl">' + easternDigits(a) + " × " + easternDigits(b) + " = ؟</span>";
      var wrong = pickWrongOptions(p, 1, 10, 3);
      var solved = false;
      choiceButtons(chEl, p, [p].concat(wrong), function (ok) {
        if (ok) {
          if (!solved) {
            solved = true;
            rewardCorrect(fb);
          }
        } else {
          rewardWrong(fb);
        }
      });
    }
    if (btn) btn.addEventListener("click", next);
    next();
  }

  function setupDiv() {
    var qEl = document.getElementById("quiz-div-q");
    var chEl = document.getElementById("quiz-div-choices");
    var fb = document.getElementById("quiz-div-feedback");
    var btn = document.getElementById("quiz-div-new");
    if (!qEl || !chEl) return;

    function next() {
      fb.textContent = "";
      var divisor;
      var quotient;
      var dividend;
      do {
        divisor = 2 + ((Math.random() * 4) | 0);
        quotient = 1 + ((Math.random() * 5) | 0);
        dividend = divisor * quotient;
      } while (dividend > 10);
      qEl.innerHTML =
        '<span dir="rtl">' + easternDigits(dividend) + " ÷ " + easternDigits(divisor) + " = ؟</span>";
      var wrong = pickWrongOptions(quotient, 1, 9, 3);
      var solved = false;
      choiceButtons(chEl, quotient, [quotient].concat(wrong), function (ok) {
        if (ok) {
          if (!solved) {
            solved = true;
            rewardCorrect(fb);
          }
        } else {
          rewardWrong(fb);
        }
      });
    }
    if (btn) btn.addEventListener("click", next);
    next();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("numbers-grid")) return;

    setupNumsLangTabs();
    tabInit(".numbers-lang-tabs", ["panel-nums", "panel-add", "panel-sub", "panel-mul", "panel-div"]);

    setupAdd();
    setupSub();
    setupMul();
    setupDiv();

    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        if (!window.KittyLearn) return;
        KittyLearn.claimLessonReward("numbers", 2, "تعلّمتِ الأرقام!");
      });
    }
  });
})();
