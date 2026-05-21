/**
 * Kitty Learn — Personalized Learning UI (parent setup + child mode)
 */
(function () {
  "use strict";

  var Store = window.KittyPersonalStore;
  var VERIFY_KEY = "kittyLearn_personalParentOk";

  var state = {
    screen: "pick",
    mode: "child",
    parentUnlocked: false,
    selectedChildId: null,
    selectedPackId: null,
    learnView: "card",
    learnWordIndex: 0,
    packSearch: "",
    editingWordId: null,
    writingActive: false,
    writingWordIndex: 0,
    writingMode: "trace",
    editingWritingWordId: null,
  };

  var FOCUS_OPTIONS = [
    { value: "", label: "— اختياري —" },
    { value: "words", label: "كلمات ومفردات" },
    { value: "letters", label: "حروف" },
    { value: "numbers", label: "أرقام" },
    { value: "mixed", label: "متنوع" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function playTap() {
    if (window.KittyLearn && KittyLearn.playSound) KittyLearn.playSound("tap");
  }

  function playOk() {
    if (window.KittyLearn && KittyLearn.playSound) KittyLearn.playSound("ok");
  }

  /** Same pattern as family-words / emotions: WAV first, then speakArabic TTS. */
  function ttsFallbackForWord(word) {
    if (!word || !word.text) return;
    if (word.useTts === false) return;
    if (!window.KittyLearn) return;
    if (/[\u0600-\u06FF]/.test(word.text) && KittyLearn.speakArabic) {
      KittyLearn.speakArabic(word.text);
    } else if (KittyLearn.speakKids) {
      KittyLearn.speakKids(word.text);
    }
  }

  function trySpeechUrls(urls, index, finalFallback) {
    if (!urls[index]) {
      if (index + 1 < urls.length) trySpeechUrls(urls, index + 1, finalFallback);
      else finalFallback();
      return;
    }
    if (window.KittyLearn && KittyLearn.tryPlaySpeech) {
      KittyLearn.tryPlaySpeech(urls[index], function () {
        trySpeechUrls(urls, index + 1, finalFallback);
      });
    } else {
      finalFallback();
    }
  }

  function speechUrlsForWord(word) {
    var urls = [];
    if (word.audioUrl) urls.push(word.audioUrl);
    if (word.audio && urls.indexOf(word.audio) === -1) urls.push(word.audio);
    if (!word.audio && word.id) urls.push("data/audio/personal/ar/" + word.id + ".wav");
    return urls;
  }

  function speakWord(word) {
    if (!word || !word.text) return;
    trySpeechUrls(speechUrlsForWord(word), 0, function () {
      ttsFallbackForWord(word);
    });
  }

  function interactWord(word, child, pack, playAudio) {
    if (!word) return;
    if (KittyLearn.mascotSay) KittyLearn.mascotSay(word.text);
    playTap();
    if (playAudio) {
      speakWord(word);
      if (child && pack) Store.recordWordPractice(child.id, pack.id, word.id);
    }
  }

  function mascotEncourage(name) {
    if (KittyLearn.mascotSay) {
      KittyLearn.mascotSay("يلا يا " + (name || "بطل") + "! 🌟");
    }
  }

  function normalizeWritingAnswer(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function writingAnswersMatch(expected, typed) {
    var a = normalizeWritingAnswer(expected);
    var b = normalizeWritingAnswer(typed);
    if (!a || !b) return false;
    if (a === b) return true;
    return a.toLowerCase() === b.toLowerCase();
  }

  /** English encouragement for name writing (Ali, Mama, etc.). */
  function writingAnswerFeedback(isCorrect) {
    if (!window.KittyLearn) return;
    if (isCorrect) {
      KittyLearn.playSound("ok");
      if (KittyLearn.mascotSay) KittyLearn.mascotSay("Great job! ⭐", { praise: true, duration: 5500 });
      if (KittyLearn.speakKids) KittyLearn.speakKids("Great job!");
      if (KittyLearn.celebrate) KittyLearn.celebrate(1);
    } else {
      KittyLearn.playSound("wrong");
      if (KittyLearn.mascotSay) KittyLearn.mascotSay("Try again 🙂", { praise: true, duration: 4500 });
      if (KittyLearn.speakKids) KittyLearn.speakKids("Try again");
    }
  }

  function getActiveWritingWords(child) {
    return Store.getActiveWritingWords(child.id);
  }

  function wordLang(text) {
    return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
  }

  function traceZoneHtml() {
    return (
      '<section class="trace-zone kid-panel personal-trace-zone" aria-labelledby="personal-trace-heading">' +
      '<h2 id="personal-trace-heading" class="trace-zone-title" dir="rtl">✏️ تمرين الكتابة على الخطوط</h2>' +
      '<p class="trace-zone-hint" dir="rtl">' +
      "الكلمة الرمادية الخفيفة «مرشد» — امشي فوقها بالقلم أو الإصبع من غير ما تطلع برّه الخطوط قدر الإمكان." +
      "</p>" +
      '<div class="trace-notebook" dir="ltr">' +
      '<div class="trace-lines-bg" aria-hidden="true"></div>' +
      '<div class="trace-stack" id="trace-stack">' +
      '<span class="trace-guide-letter" id="trace-guide" aria-hidden="true">A</span>' +
      '<canvas id="trace-canvas" aria-label="لوحة الكتابة"></canvas></div></div>' +
      '<div class="trace-actions">' +
      '<button type="button" class="btn btn-secondary btn-fat" id="trace-clear">🧹 امسحي وحاولي تاني</button>' +
      '<button type="button" class="btn btn-primary btn-fat" id="trace-done">⭐ خلّصت الكتابة!</button>' +
      "</div></section>"
    );
  }

  function typeZoneHtml(word) {
    return (
      '<div class="personal-writing-type-card">' +
      '<p class="personal-writing-prompt">Write: <strong>' +
      esc(word.text) +
      "</strong></p>" +
      '<div class="personal-field personal-writing-field">' +
      '<label for="personal-writing-input" class="visually-hidden">اكتبي الكلمة</label>' +
      '<input type="text" id="personal-writing-input" class="personal-writing-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type here..." maxlength="60">' +
      "</div>" +
      '<p class="personal-writing-msg" id="personal-writing-msg" role="status"></p>' +
      '<div class="personal-writing-actions">' +
      '<button type="button" class="btn btn-primary btn-fat" id="personal-writing-check">✓ Check</button>' +
      "</div></div>"
    );
  }

  function parentPinRequired() {
    try {
      var raw = localStorage.getItem("kittyLearn_parentLock_v1");
      if (!raw) return false;
      var s = JSON.parse(raw);
      return !!s.pinHash;
    } catch (e) {
      return false;
    }
  }

  function verifyParentPin(pin) {
    try {
      var raw = localStorage.getItem("kittyLearn_parentLock_v1");
      if (!raw) return true;
      var s = JSON.parse(raw);
      if (!s.pinHash) return true;
      var h = 5381;
      for (var i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
      return String(h >>> 0) === s.pinHash;
    } catch (e2) {
      return false;
    }
  }

  function resizeImageFile(file, maxW, cb) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = function () {
        cb("");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function readAudioFile(file, cb) {
    if (!file || file.size > 500000) {
      cb("");
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      cb(ev.target.result);
    };
    reader.onerror = function () {
      cb("");
    };
    reader.readAsDataURL(file);
  }

  /* =========================================================================
     Child picker (multi-profile login)
     ========================================================================= */

  function childAvatar(name, age) {
    var avatars = ["👶", "🧒", "👧", "👦", "🌟", "🐱"];
    var n = (name || "").charCodeAt(0) || 0;
    return avatars[(n + (age || 0)) % avatars.length];
  }

  function updateChromeVisibility() {
    var bar = document.querySelector(".personal-mode-bar");
    if (bar) bar.hidden = state.screen === "pick";
  }

  function enterChildDashboard(childId) {
    Store.setCurrentChildId(childId);
    state.screen = "app";
    state.mode = "child";
    state.selectedPackId = null;
    state.writingActive = false;
    state.writingWordIndex = 0;
    playTap();
    render();
    var child = Store.getChild(childId);
    if (child && KittyLearn.mascotSay) {
      KittyLearn.mascotSay("أهلاً " + child.name + "! 📚");
    }
  }

  function goToChildPicker() {
    state.screen = "pick";
    state.writingActive = false;
    state.selectedPackId = null;
    playTap();
    render();
  }

  function renderChildPicker(root) {
    var children = Store.listChildren();
    var html =
      '<div class="personal-picker">' +
      '<div class="personal-hero"><h1>👶 مين بيتعلّم النهارده؟</h1>' +
      "<p>اختاري ملف الطفل أو أضيفي واحد جديد</p></div>";

    if (children.length) {
      html += '<div class="personal-picker-grid">';
      children.forEach(function (c, i) {
        var prog = Store.getProgress(c.id);
        html +=
          '<button type="button" class="personal-picker-card" data-pick-child="' +
          esc(c.id) +
          '" style="animation-delay:' +
          i * 0.06 +
          's">' +
          '<span class="personal-picker-avatar" aria-hidden="true">' +
          childAvatar(c.name, c.age) +
          "</span>" +
          "<strong>" +
          esc(c.name) +
          "</strong>" +
          "<small>عمر " +
          (c.age || "?") +
          " · " +
          (prog ? prog.packCount : 0) +
          " مجموعة</small></button>";
      });
      html += "</div>";
    } else {
      html +=
        '<div class="personal-empty personal-panel"><p>🐱 مفيش أطفال مسجّلين لسه.</p>' +
        "<p class=\"personal-hint\">أضيفي أول ملف طفل تحت 👇</p></div>";
    }

    html +=
      '<div class="personal-panel personal-picker-add">' +
      "<h2>➕ طفل جديد</h2>" +
      '<form id="personal-picker-add-form" class="personal-form-grid">' +
      '<div class="personal-field"><label>اسم الطفل</label>' +
      '<input type="text" id="personal-picker-name" required maxlength="40" placeholder="مثال: علي"></div>' +
      '<div class="personal-field"><label>العمر</label>' +
      '<input type="number" id="personal-picker-age" min="2" max="12" placeholder="3"></div>' +
      '<button type="submit" class="btn btn-primary">إنشاء ودخول</button></form></div>';

    if (children.length) {
      html +=
        '<p class="personal-picker-parent-link">' +
        '<button type="button" class="btn btn-secondary btn-small" id="personal-picker-parent">👩‍👧 إعدادات الوالدين</button></p>';
    }

    html += "</div>";
    root.innerHTML = html;

    root.querySelectorAll("[data-pick-child]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        enterChildDashboard(btn.getAttribute("data-pick-child"));
      });
    });

    var addForm = $("personal-picker-add-form");
    if (addForm) {
      addForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = ($("personal-picker-name").value || "").trim();
        var age = $("personal-picker-age").value;
        if (!name) return;
        var c = Store.addChild({ name: name, age: age });
        if (c) {
          playOk();
          enterChildDashboard(c.id);
        }
      });
    }

    var parentBtn = $("personal-picker-parent");
    if (parentBtn) {
      parentBtn.addEventListener("click", function () {
        state.screen = "app";
        setMode("parent");
      });
    }
  }

  /* =========================================================================
     Child learning mode (dashboard)
     ========================================================================= */

  function renderChildHome(root) {
    var child = Store.getActiveChild();
    if (!child) {
      root.innerHTML =
        '<div class="personal-empty personal-panel">' +
        "<p>🐱 مفيش ملف طفل لسه.</p>" +
        '<p class="personal-hint">اطلبي من ماما أو بابا يضيفوا ملفك من تبويب <strong>للوالدين</strong>.</p></div>';
      return;
    }

    if (state.writingActive) {
      renderWritingPractice(root, child);
      return;
    }

    if (state.selectedPackId) {
      renderPackLearn(root, child);
      return;
    }

    var packs = child.packs || [];
    var writingWords = getActiveWritingWords(child);
    var prog = Store.getProgress(child.id);
    var html =
      '<div class="personal-dashboard-top">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-switch-child">🔄 تبديل الطفل</button></div>' +
      '<div class="personal-hero">' +
      "<h1>مرحبًا " +
      esc(child.name) +
      "! ✨</h1>" +
      "<p>اختاري مجموعة كلمات أو تمرين الكتابة مع Kitty</p></div>";

    if (prog) {
      html +=
        '<div class="personal-dashboard-stats personal-panel">' +
        '<div class="personal-stat"><span class="personal-stat-num">' +
        prog.packCount +
        '</span><span class="personal-stat-label">مجموعات</span></div>' +
        '<div class="personal-stat"><span class="personal-stat-num">' +
        prog.practicedWords +
        "/" +
        prog.totalWords +
        '</span><span class="personal-stat-label">كلمات</span></div>' +
        '<div class="personal-stat"><span class="personal-stat-num">' +
        prog.writingWordCount +
        '</span><span class="personal-stat-label">كتابة</span></div></div>';
    }

    if (writingWords.length) {
      html +=
        '<button type="button" class="personal-writing-entry" id="personal-open-writing">' +
        '<span class="writing-entry-icon">✏️</span>' +
        "<strong>تمرين الكتابة والتتبّع</strong>" +
        "<small>" +
        writingWords.length +
        " كلمة للتدريب</small></button>";
    }

    if (!packs.length && !writingWords.length) {
      html +=
        '<div class="personal-empty personal-panel"><p>📦 مفيش مجموعات كلمات بعد.</p>' +
        "<p class=\"personal-hint\">الوالد يقدر يضيف مجموعة أو كلمات كتابة من تبويب للوالدين.</p></div>";
    } else if (!packs.length) {
      html += '<div class="personal-empty personal-panel"><p>📦 مفيش مجموعات كلمات بعد.</p></div>';
    } else {
      html += '<div class="personal-pack-grid">';
      packs.forEach(function (pack, i) {
        var count = (pack.words || []).length;
        html +=
          '<button type="button" class="personal-pack-card" data-pack-id="' +
          esc(pack.id) +
          '" style="animation-delay:' +
          i * 0.05 +
          's">' +
          '<span class="pack-icon">📦</span>' +
          esc(pack.name) +
          "<small>" +
          count +
          " كلمة</small></button>";
      });
      html += "</div>";
    }

    root.innerHTML = html;
    var switchBtn = $("personal-switch-child");
    if (switchBtn) {
      switchBtn.addEventListener("click", goToChildPicker);
    }
    var openWriting = $("personal-open-writing");
    if (openWriting) {
      openWriting.addEventListener("click", function () {
        playTap();
        state.writingActive = true;
        state.writingWordIndex = 0;
        state.writingMode = "trace";
        render();
        mascotEncourage(child.name);
      });
    }
    root.querySelectorAll("[data-pack-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        playTap();
        state.selectedPackId = btn.getAttribute("data-pack-id");
        state.learnWordIndex = 0;
        state.packSearch = "";
        render();
        mascotEncourage(child.name);
      });
    });
  }

  function filterWords(words) {
    var q = (state.packSearch || "").trim().toLowerCase();
    if (!q) return words;
    return words.filter(function (w) {
      return String(w.text || "")
        .toLowerCase()
        .indexOf(q) !== -1;
    });
  }

  function renderPackLearn(root, child) {
    var pack = Store.getPack(child.id, state.selectedPackId);
    if (!pack) {
      state.selectedPackId = null;
      renderChildHome(root);
      return;
    }

    var words = filterWords(pack.words || []);
    var practiced = (pack.words || []).filter(function (w) {
      return (w.learnedCount || 0) > 0;
    }).length;
    var total = (pack.words || []).length;
    var pct = total ? Math.round((practiced / total) * 100) : 0;

    var html =
      '<div class="personal-back-row">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-back-packs">← المجموعات</button></div>' +
      '<div class="personal-hero"><h1>' +
      esc(pack.name) +
      '</h1><p>تقدّمك: ' +
      practiced +
      "/" +
      total +
      " كلمة</p>" +
      '<div class="personal-progress-bar"><div class="personal-progress-fill" style="width:' +
      pct +
      '%"></div></div></div>' +
      '<div class="personal-search personal-field"><input type="search" id="personal-pack-search" placeholder="🔍 ابحثي عن كلمة..." value="' +
      esc(state.packSearch) +
      '"></div>' +
      '<div class="personal-view-toggle">' +
      '<button type="button" class="' +
      (state.learnView === "card" ? "active" : "") +
      '" data-view="card">بطاقة</button>' +
      '<button type="button" class="' +
      (state.learnView === "grid" ? "active" : "") +
      '" data-view="grid">شبكة</button></div>';

    if (!words.length) {
      html += '<div class="personal-empty"><p>مفيش كلمات هنا لسه.</p></div>';
    } else if (state.learnView === "grid") {
      html += '<div class="personal-word-grid">';
      words.forEach(function (w, i) {
        html += wordGridCardHtml(w, i);
      });
      html += "</div>";
    } else {
      var idx = Math.min(state.learnWordIndex, words.length - 1);
      if (idx < 0) idx = 0;
      state.learnWordIndex = idx;
      var w = words[idx];
      html += renderFlashcard(w, idx, words.length);
    }

    root.innerHTML = html;
    bindLearnEvents(root, child, pack, words);
  }

  function wordGridCardHtml(w, i) {
    var img = w.imageUrl
      ? '<img src="' + esc(w.imageUrl) + '" alt="">'
      : '<span style="font-size:2.5rem">📝</span>';
    return (
      '<div class="personal-word-card-wrap"><button type="button" class="personal-word-card" data-word-id="' +
      esc(w.id) +
      '" style="animation-delay:' +
      i * 0.04 +
      's">' +
      (w.favorite ? '<span class="fav">⭐</span>' : "") +
      img +
      "<span>" +
      esc(w.text) +
      "</span></button></div>"
    );
  }

  function renderFlashcard(w, idx, total) {
    var imgBlock = w.imageUrl
      ? '<img class="personal-learn-img" src="' + esc(w.imageUrl) + '" alt="">'
      : '<div class="personal-learn-img placeholder">📝</div>';
    return (
      '<div class="personal-learn-card">' +
      imgBlock +
      '<p class="personal-learn-word">' +
      esc(w.text) +
      "</p>" +
      '<button type="button" class="btn btn-primary btn-fat" data-speak-word="' +
      esc(w.id) +
      '">🔊 اسمعي الكلمة</button>' +
      '<button type="button" class="btn btn-secondary btn-small" data-fav-word="' +
      esc(w.id) +
      '" style="margin-top:0.5rem">' +
      (w.favorite ? "⭐ مفضلة" : "☆ أضيفي للمفضلة") +
      "</button>" +
      '<div class="personal-learn-nav">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-prev-word"' +
      (idx <= 0 ? " disabled" : "") +
      ">← السابق</button>" +
      "<span>" +
      (idx + 1) +
      " / " +
      total +
      "</span>" +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-next-word"' +
      (idx >= total - 1 ? " disabled" : "") +
      ">التالي →</button></div></div>"
    );
  }

  function bindLearnEvents(root, child, pack, words) {
    var back = $("personal-back-packs");
    if (back) {
      back.addEventListener("click", function () {
        playTap();
        state.selectedPackId = null;
        render();
      });
    }

    var search = $("personal-pack-search");
    if (search) {
      search.addEventListener("input", function () {
        state.packSearch = search.value;
        state.learnWordIndex = 0;
        render();
      });
    }

    root.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        playTap();
        state.learnView = btn.getAttribute("data-view");
        render();
      });
    });

    root.querySelectorAll("[data-word-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wid = btn.getAttribute("data-word-id");
        interactWord(findWordInPack(pack, wid), child, pack, true);
      });
    });

    root.querySelectorAll("[data-speak-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wid = btn.getAttribute("data-speak-word");
        var word = findWordInPack(pack, wid);
        if (!word) return;
        speakWord(word);
        Store.recordWordPractice(child.id, pack.id, wid);
        playOk();
      });
    });

    root.querySelectorAll("[data-fav-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wid = btn.getAttribute("data-fav-word");
        var word = findWordInPack(pack, wid);
        if (!word) return;
        playTap();
        Store.updateWord(child.id, pack.id, wid, { favorite: !word.favorite });
        render();
      });
    });

    var prev = $("personal-prev-word");
    var next = $("personal-next-word");
    if (prev) {
      prev.addEventListener("click", function () {
        if (state.learnWordIndex > 0) {
          state.learnWordIndex--;
          playTap();
          render();
        }
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        if (state.learnWordIndex < words.length - 1) {
          state.learnWordIndex++;
          playTap();
          render();
        }
      });
    }
  }

  function findWordInPack(pack, wordId) {
    if (!pack || !pack.words) return null;
    for (var i = 0; i < pack.words.length; i++) {
      if (pack.words[i].id === wordId) return pack.words[i];
    }
    return null;
  }

  function renderWritingPractice(root, child) {
    var words = getActiveWritingWords(child);
    if (!words.length) {
      state.writingActive = false;
      renderChildHome(root);
      return;
    }

    var idx = Math.min(state.writingWordIndex, words.length - 1);
    if (idx < 0) idx = 0;
    state.writingWordIndex = idx;
    var word = words[idx];
    var practiced = words.filter(function (w) {
      return (w.correctCount || 0) > 0;
    }).length;
    var isTrace = state.writingMode !== "type";

    var html =
      '<div class="personal-back-row">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-back-writing">← الرئيسية</button></div>' +
      '<div class="personal-hero"><h1>✏️ تمرين الكتابة والتتبّع</h1>' +
      "<p>تقدّمك: " +
      practiced +
      "/" +
      words.length +
      " كلمة</p></div>" +
      '<div class="personal-view-toggle personal-writing-mode-toggle">' +
      '<button type="button" class="' +
      (isTrace ? "active" : "") +
      '" data-writing-mode="trace">✏️ تتبّع (زي الحروف)</button>' +
      '<button type="button" class="' +
      (!isTrace ? "active" : "") +
      '" data-writing-mode="type">⌨️ كتابة</button></div>' +
      '<p class="personal-writing-prompt">Write: <strong dir="auto">' +
      esc(word.text) +
      "</strong></p>" +
      (isTrace ? traceZoneHtml() : typeZoneHtml(word)) +
      '<div class="personal-learn-nav">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-writing-prev"' +
      (idx <= 0 ? " disabled" : "") +
      ">← السابق</button>" +
      "<span>" +
      (idx + 1) +
      " / " +
      words.length +
      "</span>" +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-writing-next"' +
      (idx >= words.length - 1 ? " disabled" : "") +
      ">التالي →</button></div>";

    root.innerHTML = html;
    bindWritingEvents(root, child, words, word);
  }

  function handleTraceWordDone(child, words, word) {
    var ok = window.TracePad && TracePad.rewardIfDrawn({ useSession: false, quiet: true });
    if (!ok) {
      if (window.TracePad) TracePad.rewardIfDrawn({ useSession: false });
      return;
    }

    Store.recordWritingSuccess(child.id, word.id);
    writingAnswerFeedback(true);
    setTimeout(function () {
      if (state.writingWordIndex < words.length - 1) {
        state.writingWordIndex++;
        render();
      } else if (KittyLearn.mascotSay) {
        KittyLearn.mascotSay("All done! 🎉");
        if (KittyLearn.speakKids) KittyLearn.speakKids("Well done!");
      }
    }, 1200);
  }

  function bindWritingEvents(root, child, words, word) {
    var back = $("personal-back-writing");
    if (back) {
      back.addEventListener("click", function () {
        playTap();
        state.writingActive = false;
        state.writingWordIndex = 0;
        render();
      });
    }

    root.querySelectorAll("[data-writing-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-writing-mode");
        if (mode === state.writingMode) return;
        playTap();
        state.writingMode = mode;
        render();
      });
    });

    if (state.writingMode !== "type" && window.TracePad) {
      TracePad.init();
      if (TracePad.setWord) {
        TracePad.setWord(word.text, wordLang(word.text));
      } else {
        TracePad.setLetter(word.text, wordLang(word.text));
      }
      TracePad.bindActions({
        onDone: function () {
          handleTraceWordDone(child, words, word);
        },
      });
    } else {
      bindWritingTypeEvents(child, words, word);
    }

    var prev = $("personal-writing-prev");
    var next = $("personal-writing-next");
    if (prev) {
      prev.addEventListener("click", function () {
        if (state.writingWordIndex > 0) {
          state.writingWordIndex--;
          playTap();
          render();
        }
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        if (state.writingWordIndex < words.length - 1) {
          state.writingWordIndex++;
          playTap();
          render();
        }
      });
    }
  }

  function bindWritingTypeEvents(child, words, word) {
    var input = $("personal-writing-input");
    var msg = $("personal-writing-msg");
    var check = $("personal-writing-check");

    function doCheck() {
      if (!input || !word) return;
      var typed = input.value;
      if (!normalizeWritingAnswer(typed)) {
        if (msg) {
          msg.textContent = "اكتبي الكلمة الأول!";
          msg.className = "personal-writing-msg personal-writing-msg--warn";
        }
        playTap();
        return;
      }
      if (writingAnswersMatch(word.text, typed)) {
        Store.recordWritingSuccess(child.id, word.id);
        writingAnswerFeedback(true);
        if (msg) {
          msg.textContent = "✓ Correct!";
          msg.className = "personal-writing-msg personal-writing-msg--ok";
        }
        input.classList.add("personal-writing-input--ok");
        setTimeout(function () {
          if (state.writingWordIndex < words.length - 1) {
            state.writingWordIndex++;
            render();
          } else if (KittyLearn.mascotSay) {
            KittyLearn.mascotSay("All done! 🎉");
            if (KittyLearn.speakKids) KittyLearn.speakKids("Well done!");
          }
        }, 1200);
      } else {
        writingAnswerFeedback(false);
        if (msg) {
          msg.textContent = "Not quite — try again!";
          msg.className = "personal-writing-msg personal-writing-msg--err";
        }
        input.classList.add("personal-writing-input--err");
        setTimeout(function () {
          input.classList.remove("personal-writing-input--err");
        }, 600);
      }
    }

    if (check) check.addEventListener("click", doCheck);
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doCheck();
        }
      });
      setTimeout(function () {
        input.focus();
      }, 80);
    }
  }

  /* =========================================================================
     Parent mode
     ========================================================================= */

  function renderParentGate(root) {
    root.innerHTML =
      '<div class="personal-pin-gate personal-panel">' +
      "<h2>👩‍👧 للوالدين فقط</h2>" +
      "<p class=\"personal-hint\">أدخلي رمز PIN (نفس رمز Parent Control)</p>" +
      '<div class="personal-field"><label>PIN</label>' +
      '<input type="password" inputmode="numeric" maxlength="4" id="personal-parent-pin" autocomplete="off"></div>' +
      '<p class="personal-msg-error" id="personal-pin-msg"></p>' +
      '<button type="button" class="btn btn-primary" id="personal-pin-unlock">دخول</button>' +
      "</div>";

    $("personal-pin-unlock").addEventListener("click", tryParentUnlock);
    $("personal-parent-pin").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryParentUnlock();
    });
  }

  function tryParentUnlock() {
    var pin = ($("personal-parent-pin").value || "").replace(/\D/g, "");
    var msg = $("personal-pin-msg");
    if (pin.length !== 4) {
      msg.textContent = "أدخلي 4 أرقام.";
      return;
    }
    if (!verifyParentPin(pin)) {
      msg.textContent = "PIN غلط.";
      if (KittyLearn.playSound) KittyLearn.playSound("wrong");
      return;
    }
    sessionStorage.setItem(VERIFY_KEY, "1");
    state.parentUnlocked = true;
    playTap();
    render();
  }

  function renderParent(root) {
    if (parentPinRequired() && !state.parentUnlocked && sessionStorage.getItem(VERIFY_KEY) !== "1") {
      renderParentGate(root);
      return;
    }
    state.parentUnlocked = true;

    var data = Store.getAll();
    state.selectedChildId = state.selectedChildId || Store.getCurrentChildId() || (data.children[0] && data.children[0].id);
    var child = state.selectedChildId ? Store.getChild(state.selectedChildId) : null;

    var html =
      '<div class="personal-hero"><h1>إعداد التعلّم المخصص</h1>' +
      "<p>أنشئي ملف الطفل ومجموعات كلمات خاصة</p></div>";

    html += renderChildProfileSection(data, child);
    if (child) {
      html += renderPackSection(child);
      html += renderWritingSection(child);
    }
    root.innerHTML = html;
    bindParentEvents(child);
  }

  function renderChildProfileSection(data, child) {
    var html = '<div class="personal-panel"><h2>👶 ملفات الأطفال</h2><div class="personal-child-list">';
    Store.listChildren().forEach(function (c) {
      var merged = Store.getChild(c.id);
      var active = child && c.id === child.id;
      html +=
        '<div class="personal-child-chip' +
        (active ? " active" : "") +
        '" data-child-id="' +
        esc(c.id) +
        '"><div><strong>' +
        esc(c.name) +
        "</strong><small>عمر " +
        (c.age || "?") +
        " · " +
        ((merged && merged.packs) || []).length +
        " مجموعة · " +
        esc(c.id) +
        "</small></div>" +
        '<button type="button" class="btn btn-small btn-secondary" data-del-child="' +
        esc(c.id) +
        '">🗑</button></div>';
    });
    html += "</div>";

    html +=
      '<h3 style="font-family:var(--font-display);margin:1rem 0 0.5rem">' +
      (child ? "تعديل " + esc(child.name) : "طفل جديد") +
      "</h3>" +
      '<form id="personal-child-form" class="personal-form-grid">' +
      '<div class="personal-field"><label>اسم الطفل</label>' +
      '<input type="text" id="personal-child-name" value="' +
      esc(child ? child.name : "") +
      '" required maxlength="40"></div>' +
      '<div class="personal-field"><label>العمر</label>' +
      '<input type="number" id="personal-child-age" min="2" max="12" value="' +
      (child ? child.age : "") +
      '"></div>' +
      '<div class="personal-field"><label>تركيز التعلّم</label><select id="personal-child-focus">';

    FOCUS_OPTIONS.forEach(function (opt) {
      var sel = child && child.focus === opt.value ? " selected" : "";
      html += '<option value="' + esc(opt.value) + '"' + sel + ">" + esc(opt.label) + "</option>";
    });

    html +=
      "</select></div>" +
      '<div class="personal-actions">' +
      '<button type="submit" class="btn btn-primary">' +
      (child ? "حفظ التعديل" : "إضافة طفل") +
      "</button>";

    if (child) {
      html +=
        '<button type="button" class="btn btn-secondary" id="personal-set-active">⭐ اجعليه الافتراضي عند الدخول</button>';
    }

    html += "</div></form></div>";
    return html;
  }

  function renderPackSection(child) {
    var pack = state.selectedPackId ? Store.getPack(child.id, state.selectedPackId) : null;

    var html =
      '<div class="personal-panel"><h2>📦 مجموعات ' +
      esc(child.name) +
      "</h2>" +
      '<form id="personal-pack-form" class="personal-form-grid" style="margin-bottom:1rem">' +
      '<div class="personal-field"><label>اسم مجموعة جديدة</label>' +
      '<input type="text" id="personal-pack-name" placeholder="مثال: العيلة، حيوانات..." maxlength="50"></div>' +
      '<button type="submit" class="btn btn-primary btn-small">+ مجموعة</button></form>' +
      '<div class="personal-pack-grid">';

    (child.packs || []).forEach(function (p, i) {
      var active = pack && p.id === pack.id;
      html +=
        '<button type="button" class="personal-pack-card' +
        (active ? " personal-pack-card--active" : "") +
        '" data-edit-pack="' +
        esc(p.id) +
        '" style="animation-delay:' +
        i * 0.04 +
        's"><span class="pack-icon">' +
        (active ? "📂" : "📦") +
        "</span>" +
        esc(p.name) +
        "<small>" +
        (p.words || []).length +
        " كلمة (4–10 مقترح)</small></button>";
    });

    html += "</div>";

    if (pack) {
      html += renderWordEditor(child, pack);
    }

    html += "</div>";
    return html;
  }

  function renderWordEditor(child, pack) {
    var html =
      '<div class="personal-back-row" style="margin-top:1rem">' +
      '<button type="button" class="btn btn-secondary btn-small" id="personal-close-pack">← كل المجموعات</button>' +
      '<button type="button" class="btn btn-small btn-secondary" data-del-pack="' +
      esc(pack.id) +
      '">🗑 حذف المجموعة</button></div>' +
      "<h3>كلمات: " +
      esc(pack.name) +
      "</h3>" +
      '<p class="personal-hint">4–10 كلمات مقترح · صورة + نطق TTS أو ملف صوت</p>';

    (pack.words || []).forEach(function (w) {
      html +=
        '<div class="personal-word-list-item"><span>' +
        (w.favorite ? "⭐ " : "") +
        esc(w.text) +
        " · " +
        (w.learnedCount || 0) +
        "x</span>" +
        '<span><button type="button" class="btn btn-small btn-secondary" data-edit-word="' +
        esc(w.id) +
        '">✏️</button> ' +
        '<button type="button" class="btn btn-small btn-secondary" data-del-word="' +
        esc(w.id) +
        '">🗑</button></span></div>';
    });

    var editWord = state.editingWordId ? findWordInPack(pack, state.editingWordId) : null;

    html +=
      '<div class="personal-word-editor">' +
      "<h4>" +
      (editWord ? "تعديل كلمة" : "كلمة جديدة") +
      "</h4>" +
      '<form id="personal-word-form" class="personal-form-grid">' +
      '<div class="personal-field"><label>الكلمة</label>' +
      '<input type="text" id="personal-word-text" required maxlength="60" value="' +
      esc(editWord ? editWord.text : "") +
      '"></div>' +
      '<div class="personal-field"><label>رابط صورة (اختياري)</label>' +
      '<input type="url" id="personal-word-image-url" placeholder="https://..." value="' +
      esc(editWord && editWord.imageUrl && editWord.imageUrl.indexOf("data:") !== 0 ? editWord.imageUrl : "") +
      '"></div>' +
      '<div class="personal-field"><label>أو ارفعي صورة</label>' +
      '<input type="file" id="personal-word-image-file" accept="image/*"></div>' +
      '<div class="personal-field"><label><input type="checkbox" id="personal-word-tts"' +
      (editWord && editWord.useTts === false ? "" : " checked") +
      "> استخدمي نطق تلقائي (TTS)</label></div>" +
      '<div class="personal-field"><label>ملف صوت (اختياري)</label>' +
      '<input type="file" id="personal-word-audio-file" accept="audio/*"></div>' +
      '<div class="personal-actions">' +
      '<button type="submit" class="btn btn-primary btn-small">' +
      (editWord ? "حفظ" : "إضافة") +
      "</button>";

    if (editWord) {
      html += '<button type="button" class="btn btn-secondary btn-small" id="personal-cancel-edit">إلغاء</button>';
    }

    html += "</div></form></div>";
    return html;
  }

  function renderWritingSection(child) {
    var wp = child.writingPractice || { enabled: false, words: [] };
    var words = wp.words || [];
    var activeCount = words.filter(function (w) {
      return w.active !== false;
    }).length;

    var html =
      '<div class="personal-panel"><h2>✏️ Writing Practice — ' +
      esc(child.name) +
      "</h2>" +
      '<p class="personal-hint">أضيفي أسماء للكتابة: اسم الطفل، ماما، بابا، جدّة…</p>' +
      '<label class="personal-writing-toggle">' +
      '<input type="checkbox" id="personal-writing-enabled"' +
      (wp.enabled ? " checked" : "") +
      "> تفعيل تمرين الكتابة لهذا الطفل</label>" +
      '<form id="personal-writing-word-form" class="personal-form-grid" style="margin:1rem 0">' +
      '<div class="personal-field"><label>كلمة جديدة</label>' +
      '<input type="text" id="personal-writing-word-text" placeholder="Ali, Mama, Baba, Grandma…" maxlength="40"></div>' +
      '<button type="submit" class="btn btn-primary btn-small">+ إضافة</button></form>';

    if (words.length) {
      html +=
        '<p class="personal-hint">اختاري الكلمات اللي الطفل يتدرب عليها (' +
        activeCount +
        "/" +
        words.length +
        " مفعّلة)</p>" +
        '<div class="personal-writing-word-list">';
      words.forEach(function (w) {
        html +=
          '<div class="personal-word-list-item personal-writing-list-item">' +
          '<label class="personal-writing-active-label">' +
          '<input type="checkbox" data-writing-active="' +
          esc(w.id) +
          '"' +
          (w.active !== false ? " checked" : "") +
          "> " +
          '<span>' +
          esc(w.text) +
          "</span></label>" +
          "<small>" +
          (w.correctCount || 0) +
          "x ✓</small>" +
          '<span><button type="button" class="btn btn-small btn-secondary" data-edit-writing-word="' +
          esc(w.id) +
          '">✏️</button> ' +
          '<button type="button" class="btn btn-small btn-secondary" data-del-writing-word="' +
          esc(w.id) +
          '">🗑</button></span></div>';
      });
      html += "</div>";
    } else {
      html += '<p class="personal-empty" style="padding:1rem">مفيش كلمات كتابة بعد.</p>';
    }

    var editWord = state.editingWritingWordId
      ? (words.filter(function (w) {
          return w.id === state.editingWritingWordId;
        })[0] || null)
      : null;

    if (editWord) {
      html +=
        '<div class="personal-word-editor">' +
        "<h4>تعديل كلمة الكتابة</h4>" +
        '<form id="personal-writing-edit-form" class="personal-form-grid">' +
        '<div class="personal-field"><label>الكلمة</label>' +
        '<input type="text" id="personal-writing-edit-text" required maxlength="40" value="' +
        esc(editWord.text) +
        '"></div>' +
        '<div class="personal-actions">' +
        '<button type="submit" class="btn btn-primary btn-small">حفظ</button>' +
        '<button type="button" class="btn btn-secondary btn-small" id="personal-cancel-writing-edit">إلغاء</button>' +
        "</div></form></div>";
    }

    html += "</div>";
    return html;
  }

  function bindParentEvents(child) {
    document.querySelectorAll("[data-child-id]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (e.target.closest("[data-del-child]")) return;
        state.selectedChildId = el.getAttribute("data-child-id");
        state.selectedPackId = null;
        state.editingWordId = null;
        state.editingWritingWordId = null;
        playTap();
        render();
      });
    });

    document.querySelectorAll("[data-del-child]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-del-child");
        if (!confirm("حذف ملف الطفل وكل مجموعاته؟")) return;
        Store.deleteChild(id);
        state.selectedChildId = Store.getCurrentChildId();
        state.selectedPackId = null;
        if (!Store.listChildren().length || !Store.getCurrentChildId()) {
          state.screen = "pick";
        }
        render();
      });
    });

    var childForm = $("personal-child-form");
    if (childForm) {
      childForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("personal-child-name").value.trim();
        var age = $("personal-child-age").value;
        var focus = $("personal-child-focus").value;
        if (!name) return;
        if (child) {
          Store.updateChild(child.id, { name: name, age: age, focus: focus });
          state.selectedChildId = child.id;
        } else {
          var c = Store.addChild({ name: name, age: age, focus: focus });
          if (c) state.selectedChildId = c.id;
        }
        playTap();
        if (KittyLearn.playSound) KittyLearn.playSound("ok");
        render();
      });
    }

    var setActive = $("personal-set-active");
    if (setActive && child) {
      setActive.addEventListener("click", function () {
        Store.setActiveChild(child.id);
        playTap();
        render();
      });
    }

    var packForm = $("personal-pack-form");
    if (packForm && child) {
      packForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("personal-pack-name").value.trim();
        if (!name) return;
        var p = Store.addPack(child.id, name);
        if (p) {
          state.selectedPackId = p.id;
          state.editingWordId = null;
        }
        playTap();
        render();
      });
    }

    document.querySelectorAll("[data-edit-pack]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedPackId = btn.getAttribute("data-edit-pack");
        state.editingWordId = null;
        playTap();
        render();
      });
    });

    var closePack = $("personal-close-pack");
    if (closePack) {
      closePack.addEventListener("click", function () {
        state.selectedPackId = null;
        state.editingWordId = null;
        render();
      });
    }

    document.querySelectorAll("[data-del-pack]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!child || !confirm("حذف المجموعة وكل كلماتها؟")) return;
        Store.deletePack(child.id, btn.getAttribute("data-del-pack"));
        state.selectedPackId = null;
        render();
      });
    });

    document.querySelectorAll("[data-edit-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.editingWordId = btn.getAttribute("data-edit-word");
        render();
      });
    });

    document.querySelectorAll("[data-del-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!child || !state.selectedPackId) return;
        Store.deleteWord(child.id, state.selectedPackId, btn.getAttribute("data-del-word"));
        if (state.editingWordId === btn.getAttribute("data-del-word")) state.editingWordId = null;
        render();
      });
    });

    var cancelEdit = $("personal-cancel-edit");
    if (cancelEdit) {
      cancelEdit.addEventListener("click", function () {
        state.editingWordId = null;
        render();
      });
    }

    var wordForm = $("personal-word-form");
    if (wordForm && child && state.selectedPackId) {
      wordForm.addEventListener("submit", function (e) {
        e.preventDefault();
        submitWordForm(child);
      });
    }

    var writingEnabled = $("personal-writing-enabled");
    if (writingEnabled && child) {
      writingEnabled.addEventListener("change", function () {
        Store.updateWritingPractice(child.id, { enabled: writingEnabled.checked });
        playTap();
        if (KittyLearn.playSound) KittyLearn.playSound("ok");
        render();
      });
    }

    var writingForm = $("personal-writing-word-form");
    if (writingForm && child) {
      writingForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = ($("personal-writing-word-text").value || "").trim();
        if (!text) return;
        Store.addWritingWord(child.id, text);
        $("personal-writing-word-form").reset();
        playTap();
        if (KittyLearn.playSound) KittyLearn.playSound("ok");
        render();
      });
    }

    document.querySelectorAll("[data-writing-active]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        if (!child) return;
        Store.updateWritingWord(child.id, cb.getAttribute("data-writing-active"), { active: cb.checked });
        playTap();
      });
    });

    document.querySelectorAll("[data-edit-writing-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.editingWritingWordId = btn.getAttribute("data-edit-writing-word");
        playTap();
        render();
      });
    });

    document.querySelectorAll("[data-del-writing-word]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!child || !confirm("حذف كلمة الكتابة؟")) return;
        var wid = btn.getAttribute("data-del-writing-word");
        Store.deleteWritingWord(child.id, wid);
        if (state.editingWritingWordId === wid) state.editingWritingWordId = null;
        render();
      });
    });

    var writingEditForm = $("personal-writing-edit-form");
    if (writingEditForm && child && state.editingWritingWordId) {
      writingEditForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = ($("personal-writing-edit-text").value || "").trim();
        if (!text) return;
        Store.updateWritingWord(child.id, state.editingWritingWordId, { text: text });
        state.editingWritingWordId = null;
        playTap();
        if (KittyLearn.playSound) KittyLearn.playSound("ok");
        render();
      });
    }

    var cancelWritingEdit = $("personal-cancel-writing-edit");
    if (cancelWritingEdit) {
      cancelWritingEdit.addEventListener("click", function () {
        state.editingWritingWordId = null;
        render();
      });
    }
  }

  function submitWordForm(child) {
    var text = $("personal-word-text").value.trim();
    var imageUrl = $("personal-word-image-url").value.trim();
    var useTts = $("personal-word-tts").checked;
    var imgFile = $("personal-word-image-file").files[0];
    var audioFile = $("personal-word-audio-file").files[0];
    var packId = state.selectedPackId;

    function saveWord(imageData, audioData) {
      var payload = {
        text: text,
        imageUrl: imageData || imageUrl,
        audioUrl: audioData || "",
        useTts: useTts && !audioData,
      };
      if (state.editingWordId) {
        Store.updateWord(child.id, packId, state.editingWordId, payload);
        state.editingWordId = null;
      } else {
        Store.addWord(child.id, packId, payload);
      }
      playTap();
      if (KittyLearn.playSound) KittyLearn.playSound("ok");
      render();
    }

    if (!text) return;

    if (imgFile) {
      resizeImageFile(imgFile, 400, function (dataUrl) {
        if (audioFile) {
          readAudioFile(audioFile, function (aud) {
            saveWord(dataUrl, aud);
          });
        } else {
          saveWord(dataUrl, "");
        }
      });
    } else if (audioFile) {
      readAudioFile(audioFile, function (aud) {
        saveWord(imageUrl, aud);
      });
    } else {
      saveWord(imageUrl, "");
    }
  }

  /* =========================================================================
     Main render & init
     ========================================================================= */

  function render() {
    var root = $("personal-root");
    if (!root) return;
    updateChromeVisibility();

    if (state.screen === "pick") {
      renderChildPicker(root);
      return;
    }

    if (state.mode === "child") {
      if (!Store.getActiveChild()) {
        state.screen = "pick";
        renderChildPicker(root);
        return;
      }
      renderChildHome(root);
    } else {
      renderParent(root);
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.screen = "app";
    if (mode === "parent") state.writingActive = false;
    $("personal-mode-child").classList.toggle("active", mode === "child");
    $("personal-mode-parent").classList.toggle("active", mode === "parent");
    $("personal-mode-child").setAttribute("aria-selected", mode === "child" ? "true" : "false");
    $("personal-mode-parent").setAttribute("aria-selected", mode === "parent" ? "true" : "false");
    render();
  }

  function init() {
    var currentId = Store.getCurrentChildId();
    var children = Store.listChildren();

    if (currentId && Store.getChild(currentId)) {
      state.screen = "app";
      state.mode = "child";
    } else {
      state.screen = "pick";
    }

    state.selectedChildId = currentId || (children[0] && children[0].id);

    $("personal-mode-child").addEventListener("click", function () {
      if (!Store.getActiveChild()) {
        goToChildPicker();
        return;
      }
      playTap();
      setMode("child");
    });
    $("personal-mode-parent").addEventListener("click", function () {
      playTap();
      setMode("parent");
    });

    if (sessionStorage.getItem(VERIFY_KEY) === "1") state.parentUnlocked = true;

    render();

    if (state.screen === "app") {
      setTimeout(function () {
        var child = Store.getActiveChild();
        if (child && KittyLearn.mascotSay) {
          KittyLearn.mascotSay("أهلاً " + child.name + "! 📚");
        }
      }, 800);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
