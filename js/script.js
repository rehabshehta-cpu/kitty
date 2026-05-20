/**
 * Kitty Learn — ElevenLabs natural TTS (English + Arabic).
 *
 * ⚠️ المفتاح في الواجهة مكشوف للزوار؛ للإنتاج استخدمي بروكسي على السيرفر.
 * معاينة Cursor أحيانًا لا تنفّذ <script src="config.local.js">؛ نحمّل الملف يدويًا بـ fetch.
 */
(function () {
  "use strict";

  var LS_API_KEY = "kitty_elevenlabs_api_key";

  function readVoiceId(winKey, fallback) {
    if (typeof window === "undefined") return fallback;
    var v = window[winKey];
    return v && String(v).trim() ? String(v).trim() : fallback;
  }

  function getApiKey() {
    var k =
      (typeof window !== "undefined" &&
        window.KITTY_ELEVENLABS_API_KEY &&
        String(window.KITTY_ELEVENLABS_API_KEY).trim()) ||
      "";
    if (!k) {
      try {
        k = (localStorage.getItem(LS_API_KEY) || "").trim();
      } catch (e) {}
    }
    return k;
  }

  function elevenLabsEnabled() {
    var k = getApiKey();
    return k.length >= 16 && k !== "YOUR_API_KEY";
  }

  /** مجلد ملف script.js — نبني منه مسار config.local.js */
  function resolveJsFolderUrl() {
    var scripts = document.getElementsByTagName("script");
    var i;
    var src;
    for (i = scripts.length - 1; i >= 0; i--) {
      src = scripts[i].src || "";
      if (/[/\\]script\.js(\?|#|$)/.test(src)) {
        var slash = Math.max(src.lastIndexOf("/"), src.lastIndexOf("\\"));
        return slash >= 0 ? src.substring(0, slash + 1) : "";
      }
    }
    return "";
  }

  function fetchAndApplyConfigLocal() {
    var folder = resolveJsFolderUrl();
    if (!folder) return Promise.resolve(false);
    return fetch(folder + "config.local.js", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) return false;
        return r.text();
      })
      .then(function (txt) {
        if (!txt || typeof txt !== "string") return false;
        try {
          var geval = eval;
          geval(txt);
          if (typeof console !== "undefined" && console.info) {
            console.info("[Kitty Learn] تم تحميل config.local.js (مسار ثانٍ لمعاينات Cursor)");
          }
          return true;
        } catch (err) {
          console.warn("[Kitty Learn] تعذّر تنفيذ config.local.js:", err);
          return false;
        }
      })
      .catch(function () {
        return false;
      });
  }

  var installed = false;

  function installElevenLabsIntegration() {
    if (installed) return;
    installed = true;

    var DEFAULT_ELEVENLABS_VOICE = "21m00Tcm4TlvDq8ikWAM";

    var VOICE_ID_ENGLISH = readVoiceId(
      "KITTY_ELEVENLABS_VOICE_EN",
      DEFAULT_ELEVENLABS_VOICE
    );
    var VOICE_ID_ARABIC = readVoiceId(
      "KITTY_ELEVENLABS_VOICE_AR",
      VOICE_ID_ENGLISH
    );

    var MODEL_ID = "eleven_multilingual_v2";
    var API_BASE = "https://api.elevenlabs.io";

    var VOICE_SETTINGS = {
      stability: 0.52,
      similarity_boost: 0.82,
      style: 0.28,
      use_speaker_boost: true,
    };

    var MAX_CACHE_ENTRIES = 72;
    var cacheKeys = [];
    var cacheMap = new Map();

    var audioEl = new Audio();
    audioEl.preload = "auto";

    var abortCtl = null;

    function stopElevenLabsPlayback() {
      if (abortCtl) {
        try {
          abortCtl.abort();
        } catch (e) {}
        abortCtl = null;
      }
      try {
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.load();
      } catch (e2) {}
    }

    function beginUtterance() {
      stopElevenLabsPlayback();
      abortCtl = new AbortController();
      try {
        speechSynthesis.cancel();
      } catch (e) {}
      return abortCtl.signal;
    }

    function cacheGet(key) {
      if (!cacheMap.has(key)) return null;
      var idx = cacheKeys.indexOf(key);
      if (idx >= 0) {
        cacheKeys.splice(idx, 1);
        cacheKeys.push(key);
      }
      return cacheMap.get(key);
    }

    function cacheSet(key, objectUrl) {
      while (cacheKeys.length >= MAX_CACHE_ENTRIES) {
        var oldKey = cacheKeys.shift();
        var oldUrl = cacheMap.get(oldKey);
        cacheMap.delete(oldKey);
        if (oldUrl && String(oldUrl).indexOf("blob:") === 0) {
          try {
            URL.revokeObjectURL(oldUrl);
          } catch (e) {}
        }
      }
      cacheMap.set(key, objectUrl);
      cacheKeys.push(key);
    }

    function makeCacheKey(text, voiceId) {
      return MODEL_ID + "|" + voiceId + "|" + String(text).trim();
    }

    function fetchTTS(text, voiceId, signal) {
      var ck = makeCacheKey(text, voiceId);
      var hit = cacheGet(ck);
      if (hit) return Promise.resolve(hit);

      var url =
        API_BASE +
        "/v1/text-to-speech/" +
        encodeURIComponent(voiceId) +
        "?output_format=mp3_44100_64";

      return fetch(url, {
        method: "POST",
        signal: signal,
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": getApiKey(),
        },
        body: JSON.stringify({
          text: String(text).slice(0, 2500),
          model_id: MODEL_ID,
          voice_settings: VOICE_SETTINGS,
        }),
      })
        .then(function (res) {
          if (res.ok) return res.blob();
          return res.text().then(function (txt) {
            var hint = "";
            if (res.status === 401) hint = " — المفتاح غير صالح أو منتهي.";
            if (res.status === 403) hint = " — الصلاحيات أو الخطة لا تسمح.";
            if (res.status === 429) hint = " — تجاوز حد الطلبات.";
            console.warn(
              "[Kitty Learn ElevenLabs] خطأ API " + res.status + hint,
              txt ? txt.slice(0, 220) : ""
            );
            throw new Error("ElevenLabs " + res.status + hint);
          });
        })
        .then(function (blob) {
          var objectUrl = URL.createObjectURL(blob);
          cacheSet(ck, objectUrl);
          return objectUrl;
        });
    }

    function playAudioUrl(url) {
      return new Promise(function (resolve, reject) {
        function cleanup() {
          audioEl.removeEventListener("ended", onEnd);
          audioEl.removeEventListener("error", onErr);
        }
        function onEnd() {
          cleanup();
          resolve();
        }
        function onErr() {
          cleanup();
          reject(new Error("audio error"));
        }
        audioEl.addEventListener("ended", onEnd);
        audioEl.addEventListener("error", onErr);
        audioEl.src = url;
        audioEl.volume = 1;
        audioEl.playbackRate = 0.94;
        var p = audioEl.play();
        if (p && typeof p.catch === "function") {
          p.catch(function (err) {
            cleanup();
            reject(err);
          });
        }
      });
    }

    function patchKittyLearn() {
      if (!window.KittyLearn) return;

      var origKids = KittyLearn.speakKids;
      var origAr = KittyLearn.speakArabic;
      var origBi = KittyLearn.speakNumberBilingual;
      var origTryPlay = KittyLearn.tryPlaySpeech;

      KittyLearn.tryPlaySpeech = function (url, fallbackFn, options) {
        stopElevenLabsPlayback();
        try {
          speechSynthesis.cancel();
        } catch (e) {}
        return origTryPlay.call(KittyLearn, url, fallbackFn, options);
      };

      KittyLearn.speakKids = function (text) {
        if (!text || !elevenLabsEnabled()) return origKids(text);
        var sig = beginUtterance();
        fetchTTS(text, VOICE_ID_ENGLISH, sig)
          .then(playAudioUrl)
          .catch(function (err) {
            if (err && err.name === "AbortError") return;
            if (err && err.message && String(err.message).indexOf("ElevenLabs") === -1) {
              console.warn("[Kitty Learn ElevenLabs]", err.message || err);
            }
            origKids(text);
          });
      };

      KittyLearn.speakArabic = function (text) {
        if (!text || !elevenLabsEnabled()) return origAr(text);
        var sig = beginUtterance();
        fetchTTS(text, VOICE_ID_ARABIC, sig)
          .then(playAudioUrl)
          .catch(function (err) {
            if (err && err.name === "AbortError") return;
            if (err && err.message && String(err.message).indexOf("ElevenLabs") === -1) {
              console.warn("[Kitty Learn ElevenLabs]", err.message || err);
            }
            origAr(text);
          });
      };

      KittyLearn.speakNumberBilingual = function (arPhrase, enPhrase) {
        if (!elevenLabsEnabled()) return origBi(arPhrase, enPhrase);
        stopElevenLabsPlayback();
        abortCtl = new AbortController();
        try {
          speechSynthesis.cancel();
        } catch (e) {}
        var sig = abortCtl.signal;

        fetchTTS(arPhrase, VOICE_ID_ARABIC, sig)
          .then(playAudioUrl)
          .then(function () {
            return fetchTTS(enPhrase, VOICE_ID_ENGLISH, sig);
          })
          .then(playAudioUrl)
          .catch(function (err) {
            if (err && err.name === "AbortError") return;
            if (err && err.message && String(err.message).indexOf("ElevenLabs") === -1) {
              console.warn("[Kitty Learn ElevenLabs]", err.message || err);
            }
            origBi(arPhrase, enPhrase);
          });
      };

      KittyLearn.speakBilingual = KittyLearn.speakNumberBilingual;

      window.KittyLearnElevenLabs = {
        enabled: elevenLabsEnabled,
        stop: stopElevenLabsPlayback,
        setApiKey: function (key) {
          try {
            if (key && String(key).trim()) {
              localStorage.setItem(LS_API_KEY, String(key).trim());
              console.info("[Kitty Learn] تم حفظ المفتاح. حدّثي الصفحة.");
            } else {
              localStorage.removeItem(LS_API_KEY);
              console.info("[Kitty Learn] تم مسح المفتاح المحلي.");
            }
          } catch (e) {
            console.warn("[Kitty Learn] localStorage", e);
          }
        },
        setVoices: function (englishVoiceId, arabicVoiceId) {
          if (englishVoiceId && String(englishVoiceId).trim()) {
            VOICE_ID_ENGLISH = String(englishVoiceId).trim();
          }
          if (arabicVoiceId && String(arabicVoiceId).trim()) {
            VOICE_ID_ARABIC = String(arabicVoiceId).trim();
          }
          window.KittyLearnElevenLabs.clearAudioCache();
        },
        getVoices: function () {
          return { english: VOICE_ID_ENGLISH, arabic: VOICE_ID_ARABIC };
        },
        clearAudioCache: function () {
          cacheKeys.forEach(function (k) {
            var u = cacheMap.get(k);
            if (u && String(u).indexOf("blob:") === 0) URL.revokeObjectURL(u);
          });
          cacheKeys = [];
          cacheMap.clear();
        },
        selfCheck: function () {
          if (!elevenLabsEnabled()) {
            console.info(
              "[Kitty Learn] ElevenLabs OFF — js/config.local.js أو KittyLearnElevenLabs.setApiKey(...)"
            );
            return Promise.resolve({ ok: false, reason: "no_api_key" });
          }
          return fetch(API_BASE + "/v1/user", {
            method: "GET",
            headers: { "xi-api-key": getApiKey() },
          })
            .then(function (res) {
              if (res.ok) {
                console.info("[Kitty Learn] ElevenLabs: المفتاح يعمل ✓");
                return { ok: true };
              }
              return res.text().then(function (t) {
                console.warn("[Kitty Learn] فحص المفتاح:", res.status, t.slice(0, 200));
                return { ok: false, status: res.status };
              });
            })
            .catch(function (e) {
              console.warn("[Kitty Learn] شبكة/CORS:", e.message || e);
              return { ok: false, error: String(e.message || e) };
            });
        },
      };
    }

    function refreshVoicesFromWindow() {
      VOICE_ID_ENGLISH = readVoiceId(
        "KITTY_ELEVENLABS_VOICE_EN",
        DEFAULT_ELEVENLABS_VOICE
      );
      VOICE_ID_ARABIC = readVoiceId(
        "KITTY_ELEVENLABS_VOICE_AR",
        VOICE_ID_ENGLISH
      );
    }

    patchKittyLearn();

    function announceStartupOnce() {
      if (announceStartupOnce.done) return;
      announceStartupOnce.done = true;
      if (typeof console === "undefined" || !console.info) return;
      refreshVoicesFromWindow();
      if (elevenLabsEnabled()) {
        console.info("%c[Kitty Learn]%c ElevenLabs مفعّل.", "font-weight:bold", "");
        if (window.KittyLearnElevenLabs) {
          setTimeout(function () {
            KittyLearnElevenLabs.selfCheck();
          }, 400);
        }
      } else {
        console.warn(
          "%c[Kitty Learn]%c ElevenLabs غير مفعّل — افتحي من http://localhost أو نفّذي KittyLearnElevenLabs.setApiKey(\"…\") في Console",
          "font-weight:bold",
          ""
        );
      }
    }

    announceStartupOnce();
  }

  fetchAndApplyConfigLocal().then(function () {
    installElevenLabsIntegration();
  });
})();
