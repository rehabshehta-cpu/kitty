/**
 * Kitty Learn — mini-games
 */
(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function awardStars(n, msg) {
    if (window.KittyLearn) KittyLearn.addStars(n, msg || "");
  }

  function tabInit() {
    var tabs = $all(".games-tabs button");
    var panels = $all(".game-panel");
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        tabs.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(function (p) {
          p.classList.toggle("active", p.id === "panel-" + id);
        });
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });
  }

  /* Match picture to word */
  var matchPairs = [
    { emoji: "🍎", word: "Apple" },
    { emoji: "🐱", word: "Cat" },
    { emoji: "⭐", word: "Star" },
    { emoji: "🌙", word: "Moon" },
    { emoji: "🚌", word: "Bus" },
    { emoji: "☀️", word: "Sun" },
  ];

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

  function initMatchGame() {
    var grid = $("#match-grid");
    var fb = $("#match-feedback");
    if (!grid) return;

    var selectedEmoji = null;
    var selectedWord = null;

    function render() {
      grid.innerHTML = "";
      selectedEmoji = null;
      selectedWord = null;
      var emojis = shuffle(matchPairs);
      var words = shuffle(matchPairs.map(function (p) {
        return p.word;
      }));

      emojis.forEach(function (p) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "game-card";
        el.textContent = p.emoji;
        el.dataset.pair = p.word;
        el.dataset.kind = "emoji";
        el.addEventListener("click", onPick);
        grid.appendChild(el);
      });
      words.forEach(function (w) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "game-card";
        el.textContent = w;
        el.dataset.pair = w;
        el.dataset.kind = "word";
        el.addEventListener("click", onPick);
        grid.appendChild(el);
      });
      fb.textContent = "Match each picture with its word!";
    }

    var matched = 0;

    function clearSelection() {
      $all(".game-card.selected", grid).forEach(function (c) {
        if (!c.classList.contains("matched")) c.classList.remove("selected");
      });
      selectedEmoji = null;
      selectedWord = null;
    }

    function onPick(ev) {
      var el = ev.currentTarget;
      if (el.classList.contains("matched")) return;
      if (window.KittyLearn) KittyLearn.playSound("tap");

      var kind = el.dataset.kind;

      if (kind === "emoji") {
        if (selectedEmoji && selectedEmoji !== el) selectedEmoji.classList.remove("selected");
        selectedEmoji = el;
        el.classList.add("selected");
      } else {
        if (selectedWord && selectedWord !== el) selectedWord.classList.remove("selected");
        selectedWord = el;
        el.classList.add("selected");
      }

      if (!selectedEmoji || !selectedWord) return;

      if (selectedEmoji.dataset.pair === selectedWord.dataset.pair) {
        selectedEmoji.classList.add("matched");
        selectedWord.classList.add("matched");
        selectedEmoji.classList.remove("selected");
        selectedWord.classList.remove("selected");
        matched++;
        if (window.KittyLearn) KittyLearn.answerFeedback(true);
        fb.textContent = "Great match!";
        selectedEmoji = null;
        selectedWord = null;
        if (matched >= matchPairs.length) {
          matched = 0;
          awardStars(3, "You matched them all!");
          if (window.KittyLearn) KittyLearn.markGameDone("match");
          setTimeout(render, 1400);
        }
      } else {
        if (window.KittyLearn) KittyLearn.answerFeedback(false);
        selectedEmoji.classList.add("wrong");
        selectedWord.classList.add("wrong");
        fb.textContent = "Try again!";
        var em = selectedEmoji;
        var wd = selectedWord;
        setTimeout(function () {
          em.classList.remove("wrong", "selected");
          wd.classList.remove("wrong", "selected");
          clearSelection();
        }, 500);
      }
    }

    var reset = $("#match-reset");
    if (reset)
      reset.addEventListener("click", function () {
        matched = 0;
        render();
      });
    render();
  }

  /* Color game */
  var colors = [
    { name: "Red", hex: "#ff6b6b" },
    { name: "Blue", hex: "#4dabf7" },
    { name: "Yellow", hex: "#ffe066" },
    { name: "Green", hex: "#69db7c" },
    { name: "Purple", hex: "#9775fa" },
    { name: "Orange", hex: "#ffa94d" },
  ];

  function initColorGame() {
    var promptEl = $("#color-prompt");
    var opts = $("#color-options");
    var fb = $("#color-feedback");
    if (!promptEl || !opts) return;

    var target = null;

    function nextRound() {
      target = colors[(Math.random() * colors.length) | 0];
      promptEl.innerHTML =
        'Tap the color: <strong style="font-size:1.25rem">' +
        target.name +
        "</strong>";
      opts.innerHTML = "";
      shuffle(colors).forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "color-dot";
        b.style.background = c.hex;
        b.setAttribute("aria-label", c.name);
        b.addEventListener("click", function () {
          if (window.KittyLearn) KittyLearn.playSound("tap");
          if (c.name === target.name) {
            if (window.KittyLearn) KittyLearn.answerFeedback(true);
            fb.textContent = "Perfect!";
            awardStars(2, "Correct color!");
            if (window.KittyLearn) KittyLearn.markGameDone("color");
            setTimeout(nextRound, 900);
          } else {
            if (window.KittyLearn) KittyLearn.answerFeedback(false);
            fb.textContent = "Not quite — try again!";
          }
        });
        opts.appendChild(b);
      });
      fb.textContent = "";
    }

    nextRound();
  }

  /* Drag letters — spell CAT */
  function initDragLetters() {
    var bank = $("#drag-bank");
    var targets = $("#drag-targets");
    var fb = $("#drag-feedback");
    var reset = $("#drag-reset");
    if (!bank || !targets) return;

    var answer = ["C", "A", "T"];
    var pickedLetter = null;

    function clearPick() {
      pickedLetter = null;
      $all(".drag-letter", bank).forEach(function (el) {
        el.classList.remove("picked");
      });
    }

    function removeLetterFromBank(L) {
      var letters = $all(".drag-letter", bank);
      for (var j = 0; j < letters.length; j++) {
        var el = letters[j];
        if (el.dataset.letter === L && el.parentNode === bank) {
          el.remove();
          break;
        }
      }
    }

    function tryPlaceLetter(slot, i, L) {
      if (L !== answer[i]) {
        if (window.KittyLearn) KittyLearn.answerFeedback(false);
        fb.textContent = "Try another letter!";
        return;
      }
      if (slot.classList.contains("filled")) return;
      slot.textContent = L;
      slot.classList.add("filled");
      if (window.KittyLearn) KittyLearn.answerFeedback(true);
      removeLetterFromBank(L);
      clearPick();
      checkDone();
    }

    function render() {
      bank.innerHTML = "";
      targets.innerHTML = "";
      pickedLetter = null;
      fb.textContent = "Drag letters to spell CAT!";
      shuffle(["C", "A", "T", "X", "P"]).forEach(function (L) {
        var span = document.createElement("span");
        span.className = "drag-letter";
        span.textContent = L;
        span.draggable = true;
        span.dataset.letter = L;
        span.setAttribute("role", "button");
        span.tabIndex = 0;
        span.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            span.click();
          }
        });
        span.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/plain", L);
          span.classList.add("dragging");
          clearPick();
          if (window.KittyLearn) KittyLearn.playSound("tap");
        });
        span.addEventListener("dragend", function () {
          span.classList.remove("dragging");
        });
        span.addEventListener("click", function () {
          if (window.KittyLearn) KittyLearn.playSound("tap");
          if (span.classList.contains("picked")) {
            clearPick();
            return;
          }
          clearPick();
          pickedLetter = L;
          span.classList.add("picked");
          fb.textContent = "Now tap the box for this letter!";
        });
        bank.appendChild(span);
      });

      answer.forEach(function (_, i) {
        var slot = document.createElement("div");
        slot.className = "drop-slot";
        slot.dataset.index = String(i);
        slot.tabIndex = 0;
        slot.setAttribute("role", "button");
        slot.addEventListener("keydown", function (e) {
          if ((e.key === "Enter" || e.key === " ") && pickedLetter) {
            e.preventDefault();
            tryPlaceLetter(slot, i, pickedLetter);
          }
        });
        slot.addEventListener("dragover", function (e) {
          e.preventDefault();
        });
        slot.addEventListener("drop", function (e) {
          e.preventDefault();
          var L = e.dataTransfer.getData("text/plain");
          tryPlaceLetter(slot, i, L);
        });
        slot.addEventListener("click", function () {
          if (!pickedLetter) return;
          tryPlaceLetter(slot, i, pickedLetter);
        });
        targets.appendChild(slot);
      });
    }

    function checkDone() {
      var filled = $all(".drop-slot.filled", targets).length;
      if (filled === answer.length) {
        fb.textContent = "You spelled CAT!";
        awardStars(4, "Super spelling!");
        if (window.KittyLearn) KittyLearn.markGameDone("drag");
      }
    }

    if (reset) reset.addEventListener("click", render);
    render();
  }

  /* Memory */
  var memorySymbols = ["🐱", "🍎", "🌟", "🎈", "🦋", "🍌"];

  function initMemory() {
    var board = $("#memory-board");
    var fb = $("#memory-feedback");
    if (!board) return;

    var first = null;
    var lock = false;
    var pairsFound = 0;

    function render() {
      board.innerHTML = "";
      first = null;
      lock = false;
      pairsFound = 0;
      fb.textContent = "Find all pairs!";
      var deck = shuffle(memorySymbols.concat(memorySymbols));
      deck.forEach(function (sym, idx) {
        var wrap = document.createElement("div");
        wrap.className = "memory-card";
        wrap.dataset.sym = sym;
        wrap.dataset.idx = String(idx);
        wrap.innerHTML =
          '<div class="memory-card-inner">' +
          '<div class="memory-card-face memory-card-front">✨</div>' +
          '<div class="memory-card-face memory-card-back">' +
          sym +
          "</div></div>";
        wrap.addEventListener("click", function () {
          if (lock || wrap.classList.contains("matched") || wrap.classList.contains("flipped"))
            return;
          if (window.KittyLearn) KittyLearn.playSound("tap");
          wrap.classList.add("flipped");
          if (!first) {
            first = wrap;
            return;
          }
          lock = true;
          if (first.dataset.sym === wrap.dataset.sym) {
            first.classList.add("matched");
            wrap.classList.add("matched");
            if (window.KittyLearn) KittyLearn.answerFeedback(true);
            pairsFound++;
            first = null;
            lock = false;
            if (pairsFound >= memorySymbols.length) {
              fb.textContent = "You found every pair!";
              awardStars(5, "Memory champion!");
              if (window.KittyLearn) KittyLearn.markGameDone("memory");
              setTimeout(render, 2000);
            }
          } else {
            if (window.KittyLearn) KittyLearn.answerFeedback(false);
            setTimeout(function () {
              first.classList.remove("flipped");
              wrap.classList.remove("flipped");
              first = null;
              lock = false;
            }, 700);
          }
        });
        board.appendChild(wrap);
      });
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("#match-grid")) return;
    tabInit();
    initMatchGame();
    initColorGame();
    initDragLetters();
    initMemory();
  });
})();
