/**
 * Kitty Learn — letter tracing pad (touch + mouse) over ruled guide lines.
 */
(function () {
  "use strict";

  var canvas;
  var ctx;
  var drawing = false;
  var currentLang = "en";
  var currentChar = "A";
  var resizeListenerBound = false;

  function layoutCanvas() {
    if (!canvas || !ctx) return;
    var stack = document.getElementById("trace-stack");
    if (!stack) return;
    var rect = stack.getBoundingClientRect();
    var w = Math.max(280, rect.width);
    var h = Math.max(220, rect.height);
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(139, 92, 246, 0.92)";
    ctx.lineWidth = Math.max(12, w * 0.035);
  }

  function setupCanvas() {
    canvas = document.getElementById("trace-canvas");
    if (!canvas) {
      ctx = null;
      return false;
    }
    ctx = canvas.getContext("2d");
    if (!canvas.dataset.tracePadBound) {
      bindDrawing();
      canvas.dataset.tracePadBound = "1";
    }
    layoutCanvas();
    return true;
  }

  function ensureResizeListener() {
    if (resizeListenerBound) return;
    resizeListenerBound = true;
    window.addEventListener("resize", debounceResize, { passive: true });
  }

  var resizeT = null;
  function debounceResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(layoutCanvas, 120);
  }

  function getLocalPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX != null ? ev.clientX : ev.touches && ev.touches[0] && ev.touches[0].clientX;
    var y = ev.clientY != null ? ev.clientY : ev.touches && ev.touches[0] && ev.touches[0].clientY;
    return { x: x - rect.left, y: y - rect.top };
  }

  function startDraw(ev) {
    ev.preventDefault();
    drawing = true;
    var p = getLocalPoint(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    if (canvas.setPointerCapture && ev.pointerId != null) {
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch (e) {}
    }
  }

  function moveDraw(ev) {
    if (!drawing) return;
    ev.preventDefault();
    var p = getLocalPoint(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function endDraw(ev) {
    if (drawing && canvas.releasePointerCapture && ev && ev.pointerId != null) {
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (e2) {}
    }
    if (ev && ev.cancelable) ev.preventDefault();
    drawing = false;
  }

  function clearDrawing() {
    if (!ctx || !canvas) return;
    layoutCanvas();
  }

  function hasInk() {
    if (!canvas || !ctx) return false;
    try {
      var full = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var d = full.data;
      for (var i = 3; i < d.length; i += 16) {
        if (d[i] > 40) return true;
      }
    } catch (e) {}
    return false;
  }

  function traceRewardKey() {
    return "kitty_trace_star_" + currentLang + "_" + encodeURIComponent(currentChar);
  }

  function bindDrawing() {
    if (!canvas) return;
    canvas.addEventListener("pointerdown", startDraw);
    canvas.addEventListener("pointermove", moveDraw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);
    canvas.addEventListener("pointerleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", moveDraw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
  }

  function applyGuideClasses(guide, lang, isWord) {
    guide.classList.remove("trace-guide-ar", "trace-guide-en", "trace-guide-word");
    guide.classList.toggle("trace-guide-ar", lang === "ar");
    guide.classList.toggle("trace-guide-en", lang !== "ar");
    if (isWord) guide.classList.add("trace-guide-word");
  }

  function updateGuide(text, lang, isWord) {
    currentChar = text || "?";
    currentLang = lang || "en";
    var guide = document.getElementById("trace-guide");
    if (!guide) {
      clearDrawing();
      return;
    }
    guide.textContent = text;
    applyGuideClasses(guide, lang, isWord);
    if (isWord) {
      var len = Math.max(1, Array.from(text).length);
      var maxRem = Math.min(7.5, Math.max(2.6, 18 / len));
      var vw = Math.min(16, 88 / len);
      guide.style.fontSize = "clamp(" + (maxRem * 0.55) + "rem, " + vw + "vw, " + maxRem + "rem)";
      guide.style.letterSpacing = len > 5 ? "0.01em" : "0.03em";
    } else {
      guide.style.fontSize = "";
      guide.style.letterSpacing = "";
    }
    clearDrawing();
  }

  function isWordGuide(text) {
    return Array.from(String(text || "")).length > 1;
  }

  window.TracePad = {
    init: function () {
      ensureResizeListener();
      return setupCanvas();
    },

    setLetter: function (charStr, lang) {
      updateGuide(charStr, lang, false);
    },

    setWord: function (text, lang) {
      updateGuide(text, lang, true);
    },

    clear: clearDrawing,

    hasInk: hasInk,

    rewardIfDrawn: function (options) {
      options = options || {};
      if (!hasInk()) {
        if (!options.quiet && window.KittyLearn) {
          var wordHint = isWordGuide(currentChar);
          KittyLearn.mascotSay(
            wordHint
              ? "جرّبي تمشي فوق الكلمة بالقلم الأول! ✏️"
              : "جرّبي تمشي فوق الحرف بالقلم الأول! ✏️"
          );
          KittyLearn.playSound("tap");
        }
        return false;
      }

      if (options.useSession !== false) {
        try {
          if (sessionStorage.getItem(traceRewardKey())) {
            if (!options.quiet && window.KittyLearn) {
              KittyLearn.mascotSay("برافو! جرّبي حرف تاني 🌟");
              KittyLearn.answerFeedback(true);
            }
            return false;
          }
          sessionStorage.setItem(traceRewardKey(), "1");
        } catch (e) {}
      }

      if (options.onReward) {
        options.onReward();
      } else if (window.KittyLearn) {
        KittyLearn.addStars(1, "أحسنت!");
      }
      return true;
    },

    bindActions: function (opts) {
      opts = opts || {};
      var clr = document.getElementById(opts.clearId || "trace-clear");
      var done = document.getElementById(opts.doneId || "trace-done");
      if (clr) {
        clr.onclick = function () {
          clearDrawing();
          if (opts.onClear) opts.onClear();
          else if (window.KittyLearn) KittyLearn.playSound("tap");
        };
      }
      if (done) {
        done.onclick = function () {
          if (opts.onDone) {
            opts.onDone();
          } else {
            TracePad.rewardIfDrawn();
          }
        };
      }
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("trace-canvas")) return;
    TracePad.init();
    TracePad.bindActions();
  });
})();
