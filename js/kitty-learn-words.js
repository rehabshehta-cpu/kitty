/**

 * Kitty Learn — كلمات عائلية: يحمّل العبارات من data/family-words.json

 * ويشغّل الصوت من data/audio/*.wav إن وُجد (من سكربت Gemini TTS)، وإلا نطق المتصفح.

 */

(function () {

  "use strict";



  var items = [];

  var currentIndex = 0;



  function speakArabicFallback(phrase) {

    if (window.KittyLearn && KittyLearn.speakArabic) {

      KittyLearn.speakArabic(phrase);

      return;

    }

    if (!window.speechSynthesis) return;

    speechSynthesis.cancel();

    var u = new SpeechSynthesisUtterance(phrase);

    u.lang = "ar-SA";

    speechSynthesis.speak(u);

  }



  function speakEntry(entry) {

    var phrase = entry.phrase;

    var url = entry.audio;

    function fallback() {

      speakArabicFallback(phrase);

    }

    if (window.KittyLearn && KittyLearn.tryPlaySpeech && url) {

      KittyLearn.tryPlaySpeech(url, fallback);

    } else {

      fallback();

    }

  }



  function initPage(list) {

    items = list;

    var grid = document.getElementById("family-word-grid");

    var emojiEl = document.getElementById("family-display-emoji");

    var phraseEl = document.getElementById("family-display-phrase");

    var hintEl = document.getElementById("family-display-hint");

    var speakBtn = document.getElementById("family-speak-btn");

    var doneBtn = document.getElementById("family-words-done");

    if (!grid || !phraseEl || !hintEl || !speakBtn || !items.length) return;



    function selectWord(index, playAudio) {

      currentIndex = index;

      var d = items[index];

      phraseEl.textContent = d.phrase;

      hintEl.textContent = d.hint;

      if (emojiEl) emojiEl.textContent = d.emoji;



      grid.querySelectorAll(".family-word-card").forEach(function (b, i) {

        b.classList.toggle("active", i === index);

      });



      if (window.KittyLearn) {

        KittyLearn.mascotSay(d.mascot);

        KittyLearn.playSound("tap");

      }



      if (playAudio) speakEntry(d);

    }



    items.forEach(function (d, i) {

      var btn = document.createElement("button");

      btn.type = "button";

      btn.className = "family-word-card";

      btn.setAttribute("aria-label", "كلمة: " + d.phrase);

      btn.innerHTML =

        '<span class="family-word-card-emoji" aria-hidden="true">' +

        d.emoji +

        "</span>" +

        '<span class="family-word-card-text">' +

        d.phrase +

        "</span>";

      btn.addEventListener("click", function () {

        selectWord(i, true);

      });

      grid.appendChild(btn);

    });



    speakBtn.addEventListener("click", function () {

      speakEntry(items[currentIndex]);

      if (window.KittyLearn) KittyLearn.playSound("ok");

    });



    selectWord(0, false);



    if (doneBtn) {

      doneBtn.addEventListener("click", function () {

        if (!window.KittyLearn) return;

        KittyLearn.claimLessonReward("family_words", 2, "برافو! اتدربتي على كلمات العيلة!");

      });

    }

  }



  document.addEventListener("DOMContentLoaded", function () {

    fetch("data/family-words.json")

      .then(function (r) {

        if (!r.ok) throw new Error("HTTP " + r.status);

        return r.json();

      })

      .then(function (manifest) {

        var list = manifest.items || [];

        initPage(list);

      })

      .catch(function () {

        var phraseEl = document.getElementById("family-display-phrase");

        var hintEl = document.getElementById("family-display-hint");

        if (phraseEl) phraseEl.textContent = "…";

        if (hintEl)

          hintEl.textContent =

            "تعذّر تحميل قائمة الكلمات. افتحي الصفحة من سيرفر محلي (مثلاً Live Server) وتأكدي أن ملف data/family-words.json موجود.";

      });

  });

})();


