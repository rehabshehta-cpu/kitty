/**
 * Kitty Learn — shared interactions: progress, mascot, sounds, confetti, loading.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "kittyLearn_progress_v1";

  var defaultProgress = function () {
    return {
      stars: 0,
      level: 1,
      badges: [],
      accessories: [],
      equippedAccessory: null,
      completedGames: {},
      lessonRewards: {},
    };
  };

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      var p = JSON.parse(raw);
      return Object.assign(defaultProgress(), p);
    } catch (e) {
      return defaultProgress();
    }
  }

  function saveProgress(p) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (e) {}
  }

  var progress = loadProgress();

  /** Public API */
  window.KittyLearn = {
    getProgress: function () {
      return Object.assign({}, progress);
    },
    save: saveProgress,

    addStars: function (n, reason) {
      if (!n || n < 1) return progress;
      progress.stars += n;
      var thresholds = [0, 15, 40, 80, 150, 300];
      var lvl = 1;
      for (var i = thresholds.length - 1; i >= 0; i--) {
        if (progress.stars >= thresholds[i]) {
          lvl = i + 1;
          break;
        }
      }
      progress.level = lvl;

      if (progress.stars >= 5 && progress.badges.indexOf("star") === -1) {
        progress.badges.push("star");
      }
      if (progress.stars >= 25 && progress.badges.indexOf("explorer") === -1) {
        progress.badges.push("explorer");
      }
      if (progress.stars >= 60 && progress.badges.indexOf("super") === -1) {
        progress.badges.push("super");
      }

      var acc = ["bow", "glasses", "crown", "tie", "chef", "crownSpring"];
      var idx = Math.floor(progress.stars / 20);
      if (idx > 0 && idx <= acc.length) {
        var key = acc[idx - 1];
        if (progress.accessories.indexOf(key) === -1) {
          progress.accessories.push(key);
        }
      }

      saveProgress(progress);
      updateHeaderUI();
      celebrate(n);
      if (reason) {
        mascotSay("You earned " + n + " star" + (n > 1 ? "s" : "") + "! " + reason);
      } else {
        mascotSay("Amazing! +" + n + " star" + (n > 1 ? "s" : "") + "!");
      }
      return progress;
    },

    unlockBadge: function (id, label) {
      if (progress.badges.indexOf(id) === -1) {
        progress.badges.push(id);
        saveProgress(progress);
        updateHeaderUI();
        mascotSay(label ? "New badge: " + label + "!" : "New badge unlocked!");
      }
    },

    markGameDone: function (gameId) {
      progress.completedGames = progress.completedGames || {};
      if (!progress.completedGames[gameId]) {
        progress.completedGames[gameId] = true;
        saveProgress(progress);
      }
    },

    claimLessonReward: function (key, stars, msg) {
      progress.lessonRewards = progress.lessonRewards || {};
      if (progress.lessonRewards[key]) {
        mascotSay("You already collected this reward!");
        KittyLearn.playSound("tap");
        return false;
      }
      progress.lessonRewards[key] = true;
      saveProgress(progress);
      KittyLearn.addStars(stars || 2, msg || "Great exploring!");
      return true;
    },

    equipAccessory: function (key) {
      if (!key || progress.accessories.indexOf(key) === -1) return;
      progress.equippedAccessory = key;
      saveProgress(progress);
      applyAccessoryUI();
    },

    clearAccessory: function () {
      progress.equippedAccessory = null;
      saveProgress(progress);
      applyAccessoryUI();
    },
  };

  /* --- Audio --- */
  var audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function resumeAudio() {
    var ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  /** Soft synthetic "meow" — short rising–falling pitch like a kitten. */
  function playMeow(tweak) {
    resumeAudio();
    var ctx = getAudioContext();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var tw = tweak || 0;
    var f0 = 500 + tw * 35;
    var fPeak = 950 + tw * 25;
    var fEnd = 400;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(fPeak, t0 + 0.13);
    osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + 0.48);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.11, t0 + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.52);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.55);

    var osc2 = ctx.createOscillator();
    var g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(f0 * 1.85, t0);
    osc2.frequency.exponentialRampToValueAtTime(fPeak * 1.75, t0 + 0.11);
    osc2.frequency.exponentialRampToValueAtTime(620, t0 + 0.44);
    g2.gain.setValueAtTime(0, t0);
    g2.gain.linearRampToValueAtTime(0.045, t0 + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.48);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t0);
    osc2.stop(t0 + 0.52);
  }

  function playWelcomeMessage() {
    setTimeout(function () {
      mascotSay("Welcome to you all!");
      if (window.KittyLearn && KittyLearn.speakKids) {
        KittyLearn.speakKids("Welcome to you all!");
      }
    }, 700);
  }

  function playTone(freq, duration, type, volume) {
    resumeAudio();
    var ctx = getAudioContext();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = volume != null ? volume : 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (duration || 0.12));
  }

  window.KittyLearn.playSound = function (name) {
    resumeAudio();
    switch (name) {
      case "tap":
        playTone(520, 0.06, "sine", 0.06);
        break;
      case "ok":
        playTone(660, 0.08, "triangle", 0.07);
        setTimeout(function () {
          playTone(880, 0.1, "triangle", 0.06);
        }, 70);
        break;
      case "wrong":
        playTone(180, 0.15, "square", 0.04);
        break;
      case "win":
        playTone(523, 0.1, "sine", 0.07);
        setTimeout(function () {
          playTone(659, 0.1, "sine", 0.06);
        }, 90);
        setTimeout(function () {
          playTone(784, 0.18, "sine", 0.055);
        }, 180);
        break;
      case "meow":
        playMeow(0);
        break;
      default:
        playTone(440, 0.08, "sine", 0.05);
    }
  };

  KittyLearn.meow = function (variant) {
    playMeow(variant != null ? variant : 0);
  };

  /** Kid-friendly TTS: higher pitch, slower pace, prefers lighter English voices when available. */
  var kidsVoiceCached = null;

  function getEnglishVoices() {
    if (!window.speechSynthesis) return [];
    try {
      return speechSynthesis.getVoices().filter(function (v) {
        return v.lang && String(v.lang).toLowerCase().indexOf("en") === 0;
      });
    } catch (e) {
      return [];
    }
  }

  function pickKidsVoice() {
    var voices = getEnglishVoices();
    if (!voices.length) {
      try {
        voices = speechSynthesis.getVoices().slice();
      } catch (e2) {
        return null;
      }
    }
    var best = null;
    var bestScore = -999;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var name = String(v.name || "").toLowerCase();
      var score = 0;
      if (/girl|child|kid|young|little/i.test(name)) score += 25;
      if (/zira|samantha|karen|victoria|flo|emma|ivy|joanna|nicole|aria|jenny|sonya|linda|heather/i.test(name))
        score += 15;
      if (/female/i.test(name)) score += 8;
      if (/google|microsoft|natural|neural/i.test(name)) score += 4;
      if (/male|david|daniel|fred|mark\b|george/i.test(name)) score -= 12;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best || voices[0] || null;
  }

  function refreshKidsVoice() {
    kidsVoiceCached = pickKidsVoice();
  }

  var arabVoiceCached = null;

  /** Prefer softer / female / kid-named Arabic voices when the OS exposes them. */
  function pickArabicVoice() {
    if (!window.speechSynthesis) return null;
    try {
      var voices = speechSynthesis.getVoices();
      var ar = voices.filter(function (v) {
        return v.lang && String(v.lang).toLowerCase().indexOf("ar") === 0;
      });
      if (!ar.length) return null;
      var preferLang = ["ar-eg", "ar-sa", "ar-ae"];
      var best = null;
      var bestScore = -999;
      for (var i = 0; i < ar.length; i++) {
        var v = ar[i];
        var lang = String(v.lang || "").toLowerCase();
        var name = String(v.name || "").toLowerCase();
        var score = 0;
        if (/girl|child|kid|young|little|طفل|بنت/i.test(name)) score += 22;
        if (/female|woman|سيدة|أنثى/i.test(name)) score += 10;
        if (/male|رجل/i.test(name)) score -= 8;
        if (/google|microsoft|natural|neural/i.test(name)) score += 4;
        for (var p = 0; p < preferLang.length; p++) {
          if (lang.indexOf(preferLang[p]) === 0) {
            score += 8 - p * 2;
            break;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          best = v;
        }
      }
      return best || ar[0];
    } catch (e) {
      return null;
    }
  }

  function refreshArabVoice() {
    arabVoiceCached = pickArabicVoice();
  }

  function refreshSpeechVoices() {
    refreshKidsVoice();
    refreshArabVoice();
  }

  /** Reliable TTS — fixes Chrome/Edge cancel+speak race and empty voice list. */
  function safeSpeechSpeak(utterance, voicePicker) {
    if (!window.speechSynthesis || !utterance) return;
    resumeAudio();
    if (voicePicker) {
      var v = voicePicker();
      if (v) {
        utterance.voice = v;
        utterance.lang = v.lang || utterance.lang;
      }
    }
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    clearTimeout(safeSpeechSpeak._t);
    safeSpeechSpeak._t = setTimeout(function () {
      refreshSpeechVoices();
      if (voicePicker) {
        var v2 = voicePicker();
        if (v2) {
          utterance.voice = v2;
          utterance.lang = v2.lang || utterance.lang;
        }
      }
      try {
        if (speechSynthesis.paused) speechSynthesis.resume();
      } catch (e2) {}
      try {
        speechSynthesis.speak(utterance);
      } catch (e3) {}
    }, 120);
  }

  KittyLearn.speakKids = function (text) {
    if (!text) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.79;
    u.pitch = 1.42;
    u.volume = 1;
    safeSpeechSpeak(u, function () {
      if (!kidsVoiceCached) refreshKidsVoice();
      return kidsVoiceCached;
    });
  };

  KittyLearn.speakArabic = function (text) {
    if (!text) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = arabVoiceCached && arabVoiceCached.lang ? arabVoiceCached.lang : "ar-SA";
    u.rate = 0.82;
    u.pitch = 1.32;
    u.volume = 1;
    safeSpeechSpeak(u, function () {
      if (!arabVoiceCached) refreshArabVoice();
      return arabVoiceCached;
    });
  };

  /**
   * Play a recorded clip (mp3/ogg/wav). If the file is missing or autoplay fails, runs fallbackFn.
   * options.onEnded: called when playback finishes (not called when fallbackFn runs).
   */
  KittyLearn.tryPlaySpeech = function (url, fallbackFn, options) {
    options = options || {};
    if (!url || typeof url !== "string") {
      if (fallbackFn) fallbackFn();
      return;
    }
    var a = new Audio(url);
    var fallbackCalled = false;
    function fall() {
      if (fallbackCalled) return;
      fallbackCalled = true;
      if (fallbackFn) fallbackFn();
    }
    a.addEventListener("error", fall);
    a.addEventListener("ended", function () {
      if (fallbackCalled) return;
      if (options.onEnded) options.onEnded();
    });
    var p = a.play();
    if (p && typeof p.catch === "function") {
      p.catch(fall);
    }
  };

  KittyLearn.speakNumberBilingual = function (arabicPhrase, englishPhrase) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
    } catch (e3) {}
    var u1 = new SpeechSynthesisUtterance(arabicPhrase);
    u1.lang = arabVoiceCached && arabVoiceCached.lang ? arabVoiceCached.lang : "ar-SA";
    u1.rate = 0.82;
    u1.pitch = 1.32;
    u1.volume = 1;
    if (arabVoiceCached) u1.voice = arabVoiceCached;
    var u2 = new SpeechSynthesisUtterance(englishPhrase);
    u2.lang = kidsVoiceCached && kidsVoiceCached.lang ? kidsVoiceCached.lang : "en-US";
    u2.rate = 0.79;
    u2.pitch = 1.35;
    u2.volume = 1;
    if (kidsVoiceCached) u2.voice = kidsVoiceCached;
    u1.onend = function () {
      speechSynthesis.speak(u2);
    };
    speechSynthesis.speak(u1);
  };

  KittyLearn.speakBilingual = KittyLearn.speakNumberBilingual;

  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = refreshSpeechVoices;
    refreshSpeechVoices();
    setTimeout(refreshSpeechVoices, 300);
    setTimeout(refreshSpeechVoices, 1000);
  }

  var musicOn = false;
  var musicNodes = [];

  function stopMusic() {
    musicNodes.forEach(function (n) {
      try {
        n.stop();
        n.disconnect();
      } catch (e) {}
    });
    musicNodes = [];
    musicOn = false;
  }

  function startMusic() {
    resumeAudio();
    var ctx = getAudioContext();
    if (!ctx) return;
    stopMusic();
    musicOn = true;
    var notes = [392, 440, 523, 659, 523, 440];
    var step = 0;
    function playNote() {
      if (!musicOn) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[step % notes.length];
      gain.gain.value = 0.025;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      musicNodes.push(osc);
      step++;
      setTimeout(playNote, 380);
    }
    playNote();
  }

  /* --- Confetti --- */
  function celebrate(starCount) {
    window.KittyLearn.playSound("win");
    var canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = (canvas.width = window.innerWidth);
    var h = (canvas.height = window.innerHeight);
    var pieces = [];
    var colors = ["#ff8fab", "#a78bfa", "#7fdbda", "#ffe066", "#ffb8a8", "#9ae8bf"];
    var n = Math.min(80 + (starCount || 1) * 15, 180);
    for (var i = 0; i < n; i++) {
      pieces.push({
        x: Math.random() * w,
        y: Math.random() * -h * 0.5,
        vy: 2 + Math.random() * 4,
        vx: -2 + Math.random() * 4,
        r: 4 + Math.random() * 8,
        c: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: -0.15 + Math.random() * 0.3,
      });
    }
    var start = performance.now();
    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, w, h);
      pieces.forEach(function (p) {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      });
      if (t < 2800) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  window.KittyLearn.celebrate = celebrate;

  /* --- Mascot --- */
  function ensureMascotDock() {
    if (document.getElementById("mascot-dock")) return;
    var dock = document.createElement("div");
    dock.id = "mascot-dock";
    dock.className = "mascot-dock";
    dock.innerHTML =
      '<div class="mascot-bubble" hidden dir="rtl">أحسنت!</div>' +
      '<div class="mascot-cat-wrap">' +
      '<span data-kitty-accessory aria-hidden="true"></span>' +
      '<svg class="dock-cat" viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-label="Kitty helper">' +
      '<path d="M52 88 Q42 35 58 28 Q72 22 88 62" fill="#FFB896"/>' +
      '<path d="M168 88 Q178 35 162 28 Q148 22 132 62" fill="#FFB896"/>' +
      '<ellipse cx="110" cy="118" rx="72" ry="64" fill="#FFE5CC"/>' +
      '<ellipse cx="82" cy="108" rx="12" ry="16" fill="#3D3558"/>' +
      '<ellipse cx="138" cy="108" rx="12" ry="16" fill="#3D3558"/>' +
      '<ellipse cx="85" cy="102" rx="4" ry="5" fill="#fff"/>' +
      '<ellipse cx="141" cy="102" rx="4" ry="5" fill="#fff"/>' +
      '<path d="M104 128 Q110 134 116 128" fill="#FF8FAB"/>' +
      "</svg></div>";
    document.body.appendChild(dock);
    ensureMascotMoodFace();
    applyAccessoryUI();
    bindMascotDockClick(dock);
  }

  function bindMascotDockClick(dock) {
    if (!dock || dock.getAttribute("data-kitty-bound") === "1") return;
    dock.setAttribute("data-kitty-bound", "1");
    var cat = dock.querySelector(".dock-cat");
    if (!cat) return;
    cat.addEventListener("click", function () {
      KittyLearn.meow((Math.random() * 2) | 0);
      var ar = isPageArabic();
      var msgs = ar
        ? ["أحسنت!", "يلا نكمل!", "أنا فخورة بيك!", "نجرب تاني؟"]
        : ["You are doing paw-some!", "Keep learning — I believe in you!", "Tap lessons for stars!"];
      mascotSay(msgs[(Math.random() * msgs.length) | 0]);
    });
  }

  function mascotSay(text, opts) {
    opts = opts || {};
    ensureMascotDock();
    var dock = document.getElementById("mascot-dock");
    if (!dock) return;
    var bubble = dock.querySelector(".mascot-bubble");
    if (!bubble) return;
    bubble.textContent = text;
    bubble.setAttribute("dir", /[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr");
    bubble.hidden = false;
    bubble.classList.toggle("mascot-bubble--praise", !!opts.praise);
    dock.classList.toggle("mascot-dock--praise", !!opts.praise);
    clearTimeout(mascotSay._t);
    clearTimeout(mascotSay._praiseT);
    var duration = opts.duration || (opts.praise ? 6000 : 4500);
    mascotSay._t = setTimeout(function () {
      bubble.hidden = true;
      bubble.classList.remove("mascot-bubble--praise");
    }, duration);
    if (opts.praise) {
      mascotSay._praiseT = setTimeout(function () {
        dock.classList.remove("mascot-dock--praise");
      }, duration);
    }
  }

  window.KittyLearn.mascotSay = mascotSay;

  /* --- Mascot answer feedback (voice + animation) --- */
  var CORRECT_PHRASES = ["Great job!", "Well done!", "You are amazing!"];
  var ENCOURAGE_PHRASES = [
    "Try again 💡",
    "Don't worry, you can do it!",
    "Let's try once more 🙂",
  ];
  var CORRECT_PHRASES_AR = ["أحسنت!", "رائع!", "ممتاز!"];
  var ENCOURAGE_PHRASES_AR = [
    "جرّبي تاني 💡",
    "ولا يهمك، تقدري!",
    "يلا نجرب تاني 🙂",
  ];

  function isPageArabic() {
    var lang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    return lang.indexOf("ar") === 0;
  }

  function pickPhrase(list) {
    return list[(Math.random() * list.length) | 0];
  }

  function speakMascotPhrase(displayMsg, useArabic) {
    var spoken = displayMsg.replace(" 💡", "").replace(" 🙂", "").replace(/\s+/g, " ").trim();
    if (!spoken) return;
    setTimeout(function () {
      if (useArabic && KittyLearn.speakArabic) KittyLearn.speakArabic(spoken);
      else if (KittyLearn.speakKids) KittyLearn.speakKids(spoken);
    }, 280);
  }

  function ensureMascotMoodFace() {
    var dock = document.getElementById("mascot-dock");
    if (!dock || dock.querySelector(".mascot-mood-face")) return;
    var face = document.createElement("span");
    face.className = "mascot-mood-face";
    face.setAttribute("aria-hidden", "true");
    dock.appendChild(face);
  }

  function mascotSetMood(mood, faceEmoji) {
    var dock = document.getElementById("mascot-dock");
    if (!dock) return;
    ensureMascotMoodFace();
    dock.classList.remove("mascot-mood-happy", "mascot-mood-sad");
    var face = dock.querySelector(".mascot-mood-face");
    if (mood) dock.classList.add(mood);
    if (face) face.textContent = faceEmoji || "";
    clearTimeout(mascotSetMood._t);
    if (mood) {
      mascotSetMood._t = setTimeout(function () {
        dock.classList.remove("mascot-mood-happy", "mascot-mood-sad");
        if (face) face.textContent = "";
      }, mood === "mascot-mood-happy" ? 950 : 1300);
    }
  }

  function mascotAnswerFeedback(isCorrect) {
    ensureMascotDock();
    var ar = isPageArabic();
    var msg;
    var spoken;
    if (isCorrect) {
      if (ar) {
        msg = "أحسنت! ⭐";
        spoken = "أحسنت";
      } else {
        msg = pickPhrase(CORRECT_PHRASES);
        spoken = msg;
      }
      mascotSay(msg, { praise: true, duration: 6000 });
      speakMascotPhrase(spoken, ar);
      mascotSetMood("mascot-mood-happy", "😊");
      if (KittyLearn.meow) KittyLearn.meow(0);
    } else {
      msg = pickPhrase(ar ? ENCOURAGE_PHRASES_AR : ENCOURAGE_PHRASES);
      spoken = msg.replace(" 💡", "").replace(" 🙂", "").trim();
      mascotSay(msg, { praise: true, duration: 5000 });
      speakMascotPhrase(spoken, ar);
      mascotSetMood("mascot-mood-sad", "🤔");
    }
  }

  KittyLearn.answerFeedback = function (isCorrect) {
    resumeAudio();
    playSound(isCorrect ? "ok" : "wrong");
    mascotAnswerFeedback(isCorrect);
  };

  KittyLearn.mascotAnswerFeedback = mascotAnswerFeedback;

  function applyAccessoryUI() {
    var map = { bow: "🎀", glasses: "👓", crown: "👑", tie: "👔", chef: "👨‍🍳", crownSpring: "🌸" };
    var key = progress.equippedAccessory;
    var emoji = key && map[key] ? map[key] : "";
    document.querySelectorAll("[data-kitty-accessory], #kitty-room-accessory").forEach(function (el) {
      el.textContent = emoji;
      if (el.id === "kitty-room-accessory") {
        el.style.fontSize = "clamp(2.5rem, 8vw, 4rem)";
        el.style.position = "absolute";
        el.style.top = "8%";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        el.style.zIndex = "2";
      } else {
        el.style.fontSize = "1.75rem";
        el.style.position = "absolute";
        el.style.top = "-8px";
        el.style.right = "-4px";
      }
    });
  }

  function updateHeaderUI() {
    var starsEl = document.getElementById("header-stars");
    var lvlEl = document.getElementById("header-level");
    if (starsEl) starsEl.textContent = String(progress.stars);
    if (lvlEl) lvlEl.textContent = String(progress.level);

    var xpBar = document.getElementById("xp-bar");
    if (xpBar) {
      var pct = Math.min(100, ((progress.stars % 15) / 15) * 100);
      xpBar.style.width = pct + "%";
    }

    document.querySelectorAll("[data-badge]").forEach(function (chip) {
      var id = chip.getAttribute("data-badge");
      var has = progress.badges.indexOf(id) !== -1;
      chip.classList.toggle("locked", !has);
    });

    document.querySelectorAll("[data-accessory]").forEach(function (slot) {
      var key = slot.getAttribute("data-accessory");
      var has = progress.accessories.indexOf(key) !== -1;
      slot.classList.toggle("unlocked", has);
      slot.setAttribute("aria-disabled", has ? "false" : "true");
    });
    applyAccessoryUI();
  }

  window.KittyLearn.updateHeaderUI = updateHeaderUI;

  /* --- Loading --- */
  function hideLoading() {
    var el = document.getElementById("loading-screen");
    if (!el) return;
    el.classList.add("hidden");
    setTimeout(function () {
      el.style.display = "none";
    }, 650);
  }

  /* --- Sky stars --- */
  function initSky() {
    var layer = document.querySelector(".sky-layer");
    if (!layer) return;
    for (var i = 0; i < 28; i++) {
      var s = document.createElement("span");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = -Math.random() * 3 + "s";
      layer.appendChild(s);
    }
  }

  /* --- Theme --- */
  function syncThemeButton(btn) {
    var on = document.body.classList.contains("dark-playful");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "☀️" : "🌙";
    var lang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    var ar = lang.indexOf("ar") === 0;
    if (ar) {
      btn.setAttribute("aria-label", on ? "تبديل إلى الوضع الفاتح" : "تبديل إلى الوضع الداكن");
      btn.setAttribute("title", on ? "الوضع الفاتح" : "وضع داكن مريح");
    } else {
      btn.setAttribute("aria-label", on ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("title", on ? "Light theme" : "Cozy dark theme");
    }
  }

  function initThemeToggle() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var dark = localStorage.getItem("kittyLearn_theme") === "dark";
    document.body.classList.toggle("dark-playful", dark);
    syncThemeButton(btn);
    btn.addEventListener("click", function () {
      document.body.classList.toggle("dark-playful");
      var on = document.body.classList.contains("dark-playful");
      localStorage.setItem("kittyLearn_theme", on ? "dark" : "light");
      syncThemeButton(btn);
      KittyLearn.playSound("tap");
    });
  }

  function initMusicToggle() {
    var btn = document.getElementById("music-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      resumeAudio();
      if (musicOn) {
        stopMusic();
        btn.setAttribute("aria-pressed", "false");
        KittyLearn.playSound("tap");
      } else {
        startMusic();
        btn.setAttribute("aria-pressed", "true");
        KittyLearn.playSound("ok");
      }
    });
  }

  function initMascotDock() {
    ensureMascotDock();
    var dock = document.getElementById("mascot-dock");
    if (!dock) return;
    ensureMascotMoodFace();
    bindMascotDockClick(dock);
  }

  function initAccessoryClicks() {
    document.querySelectorAll("[data-accessory]").forEach(function (slot) {
      slot.addEventListener("click", function () {
        var key = slot.getAttribute("data-accessory");
        if (progress.accessories.indexOf(key) === -1) {
          mascotSay("Keep earning stars to unlock this!");
          KittyLearn.playSound("wrong");
          return;
        }
        KittyLearn.equipAccessory(key);
        KittyLearn.playSound("ok");
        mascotSay("Looking cute!");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSky();
    initThemeToggle();
    initMusicToggle();
    initMascotDock();
    updateHeaderUI();
    initAccessoryClicks();

    window.addEventListener("load", function () {
      setTimeout(hideLoading, 400);
    });

    if (document.readyState === "complete") {
      setTimeout(hideLoading, 400);
    }

    if (document.body.getAttribute("data-kitty-page") === "home") {
      setTimeout(function () {
        playWelcomeMessage();
      }, 700);
    }
  });

  /* --- Parent lock module (timer, PIN, screen-time overlay) --- */
  var plCss = document.createElement("link");
  plCss.rel = "stylesheet";
  plCss.href = "css/kitty-learn-parent-lock.css";
  document.head.appendChild(plCss);
  var plJs = document.createElement("script");
  plJs.src = "js/kitty-learn-parent-lock.js";
  plJs.defer = true;
  document.head.appendChild(plJs);
})();
