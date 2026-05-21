/**
 * Kitty Learn — Personalized Learning UI (parent setup + child mode)
 */
(function () {
  "use strict";

  var Store = window.KittyPersonalStore;
  var VERIFY_KEY = "kittyLearn_personalParentOk";

  var state = {
    mode: "child",
    parentUnlocked: false,
    selectedChildId: null,
    selectedPackId: null,
    learnView: "card",
    learnWordIndex: 0,
    packSearch: "",
    editingWordId: null,
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
     Child learning mode
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

    if (state.selectedPackId) {
      renderPackLearn(root, child);
      return;
    }

    var packs = child.packs || [];
    var html =
      '<div class="personal-hero">' +
      "<h1>مرحبًا " +
      esc(child.name) +
      "! ✨</h1>" +
      "<p>اختاري مجموعة كلمات ويلا نتعلّم مع Kitty</p></div>";

    if (!packs.length) {
      html +=
        '<div class="personal-empty personal-panel"><p>📦 مفيش مجموعات كلمات بعد.</p>' +
        "<p class=\"personal-hint\">الوالد يقدر يضيف مجموعة من تبويب للوالدين.</p></div>";
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
    state.selectedChildId = state.selectedChildId || data.activeChildId;
    var child = state.selectedChildId ? Store.getChild(state.selectedChildId) : null;

    var html =
      '<div class="personal-hero"><h1>إعداد التعلّم المخصص</h1>' +
      "<p>أنشئي ملف الطفل ومجموعات كلمات خاصة</p></div>";

    html += renderChildProfileSection(data, child);
    if (child) html += renderPackSection(child);
    root.innerHTML = html;
    bindParentEvents(child);
  }

  function renderChildProfileSection(data, child) {
    var html = '<div class="personal-panel"><h2>👶 ملفات الأطفال</h2><div class="personal-child-list">';
    data.children.forEach(function (c) {
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
        (c.packs || []).length +
        " مجموعة</small></div>" +
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
        '<button type="button" class="btn btn-secondary" id="personal-set-active">⭐ اجعليه النشط</button>';
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

  function bindParentEvents(child) {
    document.querySelectorAll("[data-child-id]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (e.target.closest("[data-del-child]")) return;
        state.selectedChildId = el.getAttribute("data-child-id");
        state.selectedPackId = null;
        state.editingWordId = null;
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
        state.selectedChildId = Store.getAll().activeChildId;
        state.selectedPackId = null;
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
    if (state.mode === "child") renderChildHome(root);
    else renderParent(root);
  }

  function setMode(mode) {
    state.mode = mode;
    $("personal-mode-child").classList.toggle("active", mode === "child");
    $("personal-mode-parent").classList.toggle("active", mode === "parent");
    $("personal-mode-child").setAttribute("aria-selected", mode === "child" ? "true" : "false");
    $("personal-mode-parent").setAttribute("aria-selected", mode === "parent" ? "true" : "false");
    render();
  }

  function init() {
    var data = Store.getAll();
    state.selectedChildId = data.activeChildId;

    $("personal-mode-child").addEventListener("click", function () {
      playTap();
      setMode("child");
    });
    $("personal-mode-parent").addEventListener("click", function () {
      playTap();
      setMode("parent");
    });

    if (sessionStorage.getItem(VERIFY_KEY) === "1") state.parentUnlocked = true;

    render();

    setTimeout(function () {
      var child = Store.getActiveChild();
      if (child && KittyLearn.mascotSay) {
        KittyLearn.mascotSay("أهلاً " + child.name + "! 📚");
      }
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
