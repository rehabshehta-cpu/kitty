/**
 * Landing page lesson tiles: ElevenLabs line on tap (starts before navigation).
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("a.lesson-card[data-speak-intro]").forEach(function (el) {
      el.addEventListener(
        "pointerdown",
        function () {
          var t = el.getAttribute("data-speak-intro");
          if (!t || !window.KittyLearn || typeof KittyLearn.speakKids !== "function") return;
          KittyLearn.speakKids(t);
        },
        { passive: true }
      );
    });
  });
})();
