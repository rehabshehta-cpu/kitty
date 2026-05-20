/**
 * Kitty Learn — shared lesson tile taps (speech + gentle sounds).
 */
(function () {
  "use strict";

  function speak(text) {
    if (window.KittyLearn && KittyLearn.speakKids) {
      KittyLearn.speakKids(text);
      return;
    }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.79;
    u.pitch = 1.42;
    window.speechSynthesis.speak(u);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-speak]").forEach(function (el) {
      el.addEventListener("click", function () {
        var t = el.getAttribute("data-speak");
        speak(t);
        if (window.KittyLearn) KittyLearn.playSound("tap");
      });
    });

    var done = document.getElementById("lesson-done");
    if (done) {
      done.addEventListener("click", function () {
        var key = done.getAttribute("data-lesson-key");
        if (!key || !window.KittyLearn) return;
        KittyLearn.claimLessonReward(key, 2, "Lesson superstar!");
      });
    }
  });
})();
