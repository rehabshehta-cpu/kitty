/**
 * اسمع جسمك — Nutrition platform (HTML/CSS/JS)
 */
(function () {
  "use strict";

  var THEME_KEY = "asmaaBody_theme";
  var BOOKINGS_KEY = "asmaaBody_bookings";
  var DAILY_MSG_INDEX_KEY = "asmaaBody_dailyMsgIdx";

  /** @type {{ emoji: string, title: string, paragraphs: string[] }[]} */
  var dailyHealthMessages = [
    {
      emoji: "🌿",
      title: "الجوع الحقيقي ولا العاطفي؟",
      paragraphs: [
        "لو جعانة فجأة وخصوصًا مع توتر…",
        "اعملي اختبار بسيط:",
        "اشربي مية + استني 10 دقايق.",
        "لو الجوع اختفى → ده مش جوع حقيقي، ده غالبًا توتر أو إرهاق 🤍",
      ],
    },
    {
      emoji: "🥗",
      title: "تنظيم السكر في الدم",
      paragraphs: [
        "الرغبة الشديدة في الحلويات بعد الأكل معناها غالبًا إن وجبتك ناقصها بروتين أو ألياف.",
        "الحل:",
        "ضيفي مصدر بروتين (بيض/فراخ/بقول) + خضار في كل وجبة → هتقلل craving بشكل واضح ✨",
      ],
    },
    {
      emoji: "💧",
      title: "الجفاف = جوع كاذب",
      paragraphs: [
        "لو بتلاقي نفسك بتاكلي من غير سبب واضح…",
        "ابدئي بالمية.",
        "الجفاف البسيط بيترجم في المخ على إنه جوع 💦",
        "الحل: 6–8 أكواب مية يوميًا على الأقل",
      ],
    },
    {
      emoji: "🍞",
      title: "النشويات مش العدو",
      paragraphs: [
        "قطع النشويات تمامًا بيزود نوبات الجوع بعد كده.",
        "الحل الصحي:",
        "خلي النشويات “موزونة” (رز/عيش/بطاطس) + بروتين + خضار في نفس الوجبة 🍽️",
      ],
    },
    {
      emoji: "🧠",
      title: "الأكل وقت التوتر",
      paragraphs: [
        "الأكل العاطفي مش ضعف… ده استجابة هرمونية (كورتيزول).",
        "الحل:",
        "قبل الأكل اسألي نفسك: “أنا جعانة ولا مضغوطة؟”",
        "لو مضغوطة → امشي 5 دقايق أو اعملي تنفس عميق الأول 🌿",
      ],
    },
    {
      emoji: "🍫",
      title: "الحلويات مش لازم تمنعيها",
      paragraphs: [
        "المنع الكامل بيزود النهم.",
        "الحل العلاجي:",
        "خدي جزء صغير بعد وجبة أساسية مش على معدة فاضية → هتقل الرغبة والهجوم عليها 🍫",
      ],
    },
    {
      emoji: "🥑",
      title: "الشبع الحقيقي",
      paragraphs: [
        "لو بتخلصي الأكل وبتجوعي بسرعة:",
        "غالبًا وجبتك ناقصها دهون صحية أو بروتين.",
        "الحل:",
        "ضيفي زيت زيتون / مكسرات / أفوكادو بكميات بسيطة 🤍",
      ],
    },
    {
      emoji: "🌙",
      title: "الأكل الليلي",
      paragraphs: [
        "الجوع بالليل غالبًا سببه قلة الأكل خلال اليوم.",
        "الحل:",
        "3 وجبات أساسية + سناك متوازن → يقلل الأكل الليلي تلقائيًا 🌿",
      ],
    },
  ];

  var modalContent = {
    myth: {
      title: "صح أم خطأ — أسطورة التغذية",
      html:
        "<p><strong>الادعاء:</strong> «الكربوهيدرات بالليل تزيد الوزن دائماً»</p>" +
        "<p><strong>الإجابة:</strong> خطأ كقاعدة عامة. المهم إجمالي ما تأكله مع نشاطك وليس توقيت الوجبة وحده. لكن جودة النوم قد تتأثر بوجبة ثقيلة جداً قبل النوم.</p>" +
        "<div class='modal-fact'><strong>جملة تفكير:</strong> ركّز على التوازن والكمية، لا على «حظر» كامل لمجموعة غذائية.</div>",
    },
    recipe: {
      title: "وصفة مصرية صحية",
      html:
        "<p><strong>طبق: فول بالخضار المشوي</strong></p>" +
        "<ul>" +
        "<li>١ كوب فول مسلوق باهت الملح</li>" +
        "<li>خليط خضروات مشوية (فلفل، بصل، طماطم)</li>" +
        "<li>رشة كمّون وزيت زيتون بارد</li>" +
        "</ul>" +
        "<p>بروتين نباتي، ألياف، ومذاق بيتي — مناسبة للإفطار أو الغداء.</p>",
    },
    mom: {
      title: "ركن الأم والطفل",
      html:
        "<p><strong>الرضاعة والعطش</strong></p>" +
        "<p>زيادة طبيعية بالعطش أثناء الرضاعة. حافظي على وجود ماء بجانبك ووجبات منتظمة غنية بالألياف والبروتين حسب احتياجك ومتابعتك الطبية.</p>" +
        "<div class='modal-fact'><strong>مهم:</strong> أي حساسية أو أدوات خاصة لطفلك — ناقشيها مع طبيب الأطفال أو أخصائي الرضاعة.</div>",
    },
    question: {
      title: "سؤال اليوم",
      html:
        "<p><strong>ما الفرق بين الجوع الحقيقي والرغبة المفاجئة؟</strong></p>" +
        "<p>الجوع الحقيقي يتدرج ويُشبع بوجبة متوازنة. الرغبة المفاجئة غالباً مرتبطة بسكر سريع أو توتر أو نقص نوم.</p>" +
        "<p>جرب: كوب ماء + ١٠ دقائق توقف قبل أن تقرر الوجبة.</p>",
    },
  };

  var quizQuestions = [
    {
      id: "sleep",
      q: "كيف تنام؟",
      options: [
        { text: "نوم عميق ومنتظم", key: "good" },
        { text: "متقطع مع استيقاظ", key: "mid" },
        { text: "قلة نوم أو صعوبة في النوم", key: "low" },
      ],
    },
    {
      id: "water",
      q: "كم كوب ماء تشرب يومياً؟",
      options: [
        { text: "أكثر من ٨ أكواب", key: "good" },
        { text: "٤–٨ أكواب", key: "mid" },
        { text: "أقل من ٤", key: "low" },
      ],
    },
    {
      id: "activity",
      q: "مستوى النشاط؟",
      options: [
        { text: "نشاط منتظم يومي", key: "good" },
        { text: "متوسط — أسبوعياً", key: "mid" },
        { text: "خامل معظم الأيام", key: "low" },
      ],
    },
    {
      id: "cravings",
      q: "هل لديك رغبات مفاجئة (cravings)؟",
      options: [
        { text: "نادراً أو لا", key: "good" },
        { text: "أحياناً", key: "mid" },
        { text: "كثيراً ويومياً", key: "low" },
      ],
    },
    {
      id: "digestion",
      q: "كيف الهضم؟",
      options: [
        { text: "مرتاح ومستقر", key: "good" },
        { text: "تقلبات بسيطة", key: "mid" },
        { text: "انتفاخ أو بطء مستمر", key: "low" },
      ],
    },
    {
      id: "energy",
      q: "مستوى الطاقة؟",
      options: [
        { text: "جيد معظم اليوم", key: "good" },
        { text: "يتراجع بعد الظهر", key: "mid" },
        { text: "إرهاق دائم", key: "low" },
      ],
    },
  ];

  var foodsData = [
    {
      slug: "koshari",
      name: "الكشري",
      emoji: "🍚",
      tags: ["مجمع نشويات"],
      cats: ["kids", "weight-loss"],
      nutritional: "نشويات غنية، عدس وبقوليات، ألياف معتدلة، صلصة طماطم. السعرات ترتفع حسب الزيت والكمية.",
      benefits: "مصدر طاقة؛ العدس يضيف بروتين نباتي وألياف.",
      mistakes: "إفراط في الزيت والصلصة؛ تناول كميات كبيرة دفعة واحدة.",
      prep: "قلل الزيت؛ زد السلطة؛ اختر حجم وجبة أصغر مع بروتين إضافي إن احتجت.",
      suitable: "أطفال أكبر بوجبة أصغر؛ من يرغب بالتخسيس بإدارة جزء وحجم وزيت.",
    },
    {
      slug: "fuul",
      name: "الفول",
      emoji: "🫘",
      tags: ["بروتين نباتي"],
      cats: ["kids", "nursing", "pregnancy", "weight-loss"],
      nutritional: "بروتين نباتي، ألياف، حديد، حسب التتبيلة تحدد الزيت والملح.",
      benefits: "يشبع ويحمي مستويات السكر بشكل نسبي بفضل الألياف.",
      mistakes: "ملح زائد وزيت زائد؛ تأخير وقت الفطور كثيراً.",
      prep: "فول طازج معطماطم وفلفل وزيت معتدل؛ رشة ليمون.",
      suitable: "عائلي؛ الحمل والرضاعة بمراعاة الهضم والملح؛ التخسيس بكميات معتدلة.",
    },
    {
      slug: "taamiya",
      name: "الطعمية",
      emoji: "🧆",
      tags: ["مقلي بحذر"],
      cats: ["kids", "nursing"],
      nutritional: "بروتين من البقول؛ القلي يضيف دهون وسعرات عالية.",
      benefits: "بروتين نباتي سريع التحضير مع الخبز المصري بحجم مناسب.",
      mistakes: "زيت غير مستجد أو إفراط في الكمية.",
      prep: "شوي أو هواء بديل جزئياً؛ سلطة خضر وزبادي خفيف.",
      suitable: "أطفال بكميات مناسبة للعمر؛ الرضاعة إن لم يسبب انتفاخ مزعج.",
    },
    {
      slug: "mahshi",
      name: "المحشي",
      emoji: "🫑",
      tags: ["خضروات محشية"],
      cats: ["kids", "pregnancy", "nursing"],
      nutritional: "ألياف من الخضار؛ الأرز يضيف نشويات؛ الكمية تقرر السعرات.",
      benefits: "وجبة متكاملة يمكن تقويتها بلحم مفروم قليل الدهن أو عدس.",
      mistakes: "زيت وفير في الصلصة؛ أحجام عملاقة بالعشاء.",
      prep: "صوص بلحم قليل الدهن أو نباتي؛ خبز أسمر قليل.",
      suitable: "الحمل بتنوع وحجم مناسب؛ الأطفال بقطع صغيرة سهلة المضغ.",
    },
    {
      slug: "mulukhiyah",
      name: "الملوخية",
      emoji: "🥬",
      tags: ["خضروات ورقية"],
      cats: ["kids", "pregnancy", "nursing", "weight-loss"],
      nutritional: "ألياف وفيتامينات؛ الثوم والزبد/الدهن يضيف سعرات.",
      benefits: "خفيفة على المعدة لكثيرين مع أرز قليل أو ريش.",
      mistakes: "زبد زائد؛ تقديم بدون مصدر بروتين متوازن.",
      prep: "زبد معتدل؛ ريش مخلي أو عدس جانب الوجبة.",
      suitable: "للجميع بتنوع؛ للتخسيس مع خفض الزيت وحجم النشويات ضمن خطتك.",
    },
    {
      slug: "roz-b-laban",
      name: "الأرز باللبن",
      emoji: "🍮",
      tags: ["كالسيوم وحلو"],
      cats: ["kids", "pregnancy"],
      nutritional: "كالسيوم وبروتين حيواني؛ سكر حسب الوصفة.",
      benefits: "وجبة مغذية ومريحة قبل النوم بكميات صغيرة.",
      mistakes: "سكر ومكسرات وفيرة تجعلها وجبة ثقيلة.",
      prep: "سكر أقل؛ فاكهة؛ حليب قليل الدسم بحسب احتياجك.",
      suitable: "أطفال (مراعاة الحساسية)؛ الحمل بكميات آمنة ونظافة.",
    },
  ];

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* Theme */
  function initTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      document.body.setAttribute("data-theme", stored);
    }
    var btn = qs("#theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var cur = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  /* Navigation */
  function initNav() {
    var toggle = qs(".nav-toggle");
    var panel = qs("#nav-panel");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    qsa("#nav-panel a").forEach(function (a) {
      a.addEventListener("click", function () {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Modals */
  function initModals() {
    var root = qs("#modal-root");
    var titleEl = qs("#modal-title");
    var bodyEl = qs("#modal-body");
    if (!root || !titleEl || !bodyEl) return;

    function openModal(key) {
      var data = modalContent[key];
      if (!data) return;
      titleEl.textContent = data.title;
      bodyEl.innerHTML = data.html;
      root.hidden = false;
      document.documentElement.style.overflow = "hidden";
      var modal = qs(".modal", root);
      if (modal) modal.focus();
    }

    function closeModal() {
      root.hidden = true;
      document.documentElement.style.overflow = "";
    }

    qsa(".radio-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openModal(card.getAttribute("data-modal"));
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card.getAttribute("data-modal"));
        }
      });
      card.tabIndex = 0;
      card.setAttribute("role", "button");
    });

    qsa("[data-close-modal]", root).forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !root.hidden) closeModal();
    });
  }

  /* Quiz */
  function initQuiz() {
    var stepsEl = qs("#quiz-steps");
    var barEl = qs("#quiz-progress-bar");
    var btnPrev = qs("#quiz-prev");
    var btnNext = qs("#quiz-next");
    var quizView = qs("#quiz-view");
    var resultView = qs("#result-view");
    var restartBtn = qs("#quiz-restart");
    if (!stepsEl || !barEl || !btnPrev || !btnNext) return;

    var answers = {};
    var current = 0;
    var quizErr = qs("#quiz-error");

    function showQuizError(msg) {
      if (!quizErr) return;
      quizErr.textContent = msg;
      quizErr.classList.remove("hidden");
      window.clearTimeout(showQuizError._t);
      showQuizError._t = window.setTimeout(function () {
        quizErr.classList.add("hidden");
      }, 4000);
    }

    function renderSteps() {
      stepsEl.innerHTML = "";
      quizQuestions.forEach(function (q, i) {
        var li = document.createElement("li");
        li.className = "quiz-step" + (i === 0 ? " active" : "");
        li.dataset.index = String(i);

        var h4 = document.createElement("h4");
        h4.textContent = q.q;
        li.appendChild(h4);

        var opts = document.createElement("div");
        opts.className = "quiz-options";

        q.options.forEach(function (opt) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "quiz-option";
          if (answers[q.id] === opt.key) b.classList.add("selected");
          b.textContent = opt.text;
          b.addEventListener("click", function () {
            qsa(".quiz-option", opts).forEach(function (x) {
              x.classList.remove("selected");
            });
            b.classList.add("selected");
            answers[q.id] = opt.key;
          });
          opts.appendChild(b);
        });

        li.appendChild(opts);
        stepsEl.appendChild(li);
      });
    }

    function updateProgress() {
      var pct = ((current + 1) / quizQuestions.length) * 100;
      barEl.style.width = pct + "%";
    }

    function showStep(i) {
      qsa(".quiz-step", stepsEl).forEach(function (step, idx) {
        step.classList.toggle("active", idx === i);
      });
      btnPrev.disabled = i === 0;
      btnNext.textContent = i === quizQuestions.length - 1 ? "احصل على النتيجة" : "التالي";
      updateProgress();
    }

    function scoreToProfile() {
      var vals = quizQuestions.map(function (q) {
        return answers[q.id] || "mid";
      });
      var low = vals.filter(function (v) {
        return v === "low";
      }).length;
      var good = vals.filter(function (v) {
        return v === "good";
      }).length;

      if (good >= 5) {
        return {
          title: "توازن ممتاز نسبياً",
          summary:
            "إجاباتك تعكس روتيناً قادراً على دعم صحتك. حافظ على الماء والنوم والنشاط كما هي عادات أساس.",
          bullets: [
            "حافظ على وجبة فطور بروتين + ألياف على الأقل خمس أيام بالأسبوع.",
            "راجع حصة الزيت والحلو شهرياً — التفاصيل الصغيرة تتراكم.",
            "اختبر نشاطاً جديداً خفيفاً كل أسبوعين ليثبت التنوع.",
          ],
        };
      }
      if (low >= 3) {
        return {
          title: "إشارات تستحق اهتماماً لطيفاً",
          summary:
            "جسمك يعطيك مؤشرات (نوم، هضم، طاقة) تستحق إعادة ترتيب بسيطة قبل أي حميات قاسية.",
          bullets: [
            "ابدأ بكوبي ماء إضافيين موزّعين قبل الغداء والعصر.",
            "جدول نوم ثابت بفارق لا يتعدى ساعة حتى أيام الدوام الخفيف.",
            "اختصر السكر السريع لمرة واحدة باليوم ولاحظ الفرق لمدة أسبوعين.",
          ],
        };
      }
      return {
        title: "أنت على الطريق الصحيح مع مجال للتحسين",
        summary:
          "بعض المحاور قوية وأخرى تحتاج دعمة خفيفة. التركيز على ماء أفضل، نوم أنظف، وحركة أكثر ستغيّر الإحساس اليومي.",
        bullets: [
          "خطط لنشاط مشي ٢٠ دقيقة بعد وجبة ثقيلة من الأسبوع.",
          "أضف خضروات ملونة لواحدة على الأقل من الوجبات الرئيسية.",
          "راقب وقت قهوتك متأخراً — قد تؤثر على النوم وتزيد الرغبات.",
        ],
      };
    }

    function showResults() {
      var missing = quizQuestions.some(function (q) {
        return !answers[q.id];
      });
      if (missing) {
        showQuizError("يرجى اختيار إجابة لكل سؤال قبل المتابعة.");
        return;
      }
      quizView.classList.add("hidden");
      resultView.classList.remove("hidden");
      var p = scoreToProfile();
      qs("#result-title").textContent = p.title;
      qs("#result-summary").textContent = p.summary;
      var list = qs("#result-list");
      list.innerHTML = "";
      p.bullets.forEach(function (b) {
        var li = document.createElement("li");
        li.textContent = b;
        list.appendChild(li);
      });
    }

    function resetQuiz() {
      answers = {};
      current = 0;
      renderSteps();
      showStep(0);
      quizView.classList.remove("hidden");
      resultView.classList.add("hidden");
    }

    btnNext.addEventListener("click", function () {
      var curQ = quizQuestions[current];
      if (!answers[curQ.id]) {
        showQuizError("اختر إجابة واحدة للمتابعة.");
        return;
      }
      if (current === quizQuestions.length - 1) {
        showResults();
        return;
      }
      current++;
      showStep(current);
    });

    btnPrev.addEventListener("click", function () {
      if (current > 0) {
        current--;
        showStep(current);
      }
    });

    if (restartBtn) restartBtn.addEventListener("click", resetQuiz);

    /* Fake audio */
    var fakePlay = qs("#fake-audio-play");
    var fakeWrap = fakePlay ? fakePlay.closest(".fake-audio") : null;
    var fakeTime = qs("#fake-audio-time");
    var fakePlaying = false;
    var t = 0;
    var tick = null;

    if (fakePlay && fakeWrap) {
      fakePlay.addEventListener("click", function () {
        fakePlaying = !fakePlaying;
        fakePlay.textContent = fakePlaying ? "❚❚" : "▶";
        fakePlay.classList.toggle("playing", fakePlaying);
        fakeWrap.classList.toggle("playing", fakePlaying);

        function fmt(s) {
          var m = Math.floor(s / 60);
          var sec = Math.floor(s % 60);
          return m + ":" + (sec < 10 ? "0" : "") + sec;
        }

        if (fakePlaying) {
          tick = window.setInterval(function () {
            t += 1;
            if (t > 154) t = 0;
            if (fakeTime) fakeTime.textContent = fmt(t) + " / 2:34";
          }, 600);
        } else if (tick) {
          window.clearInterval(tick);
          tick = null;
        }
      });
    }

    renderSteps();
    showStep(0);
  }

  /* Foods */
  function initFoods() {
    var grid = qs("#food-grid");
    var search = qs("#food-search");
    var chips = qsa(".chip");
    if (!grid) return;

    var activeFilter = "all";
    var term = "";

    function normalizeStr(s) {
      return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    }

    function matchesFood(f) {
      if (activeFilter !== "all" && f.cats.indexOf(activeFilter) === -1) return false;
      var n = normalizeStr(term);
      if (!n) return true;
      var blob = normalizeStr(f.name + " " + f.tags.join(" ") + " " + f.slug);
      return blob.indexOf(n) !== -1;
    }

    function escapeHtml(str) {
      var d = document.createElement("div");
      d.textContent = str;
      return d.innerHTML;
    }

    function render() {
      grid.innerHTML = "";
      foodsData.filter(matchesFood).forEach(function (f) {
        var art = document.createElement("article");
        art.className = "food-card glass-card";

        var head = document.createElement("button");
        head.type = "button";
        head.className = "food-card-head";
        head.style.cssText =
          "width:100%;border:none;background:transparent;color:inherit;text-align:right;cursor:pointer;font:inherit;";
        head.innerHTML =
          "<div><h3>" +
          f.emoji +
          " " +
          f.name +
          "</h3><div class='food-tags'>" +
          f.tags
            .map(function (x) {
              return "<span class='food-tag'>" + escapeHtml(x) + "</span>";
            })
            .join("") +
          "</div></div><span class='expand-icon' aria-hidden='true'>⌄</span>";

        head.addEventListener("click", function () {
          art.classList.toggle("open");
        });

        var body = document.createElement("div");
        body.className = "food-card-body";
        var inner = document.createElement("div");
        inner.className = "food-card-inner";
        inner.innerHTML =
          "<div class='food-section'><h4>القيم الغذائية (ملخص)</h4><p>" +
          escapeHtml(f.nutritional) +
          "</p></div>" +
          "<div class='food-section'><h4>الفوائد</h4><p>" +
          escapeHtml(f.benefits) +
          "</p></div>" +
          "<div class='food-section'><h4>أخطاء شائعة</h4><p>" +
          escapeHtml(f.mistakes) +
          "</p></div>" +
          "<div class='food-section'><h4>تحضير صحي</h4><p>" +
          escapeHtml(f.prep) +
          "</p></div>" +
          "<div class='food-section'><h4>مناسب لمن؟</h4><p>" +
          escapeHtml(f.suitable) +
          "</p></div>";

        body.appendChild(inner);
        art.appendChild(head);
        art.appendChild(body);
        grid.appendChild(art);
      });

      if (!grid.children.length) {
        var empty = document.createElement("p");
        empty.className = "section-desc";
        empty.style.gridColumn = "1 / -1";
        empty.textContent =
          "لا توجد أطباق تطابق البحث أو التصفية. جرّب «الكل» أو كلمة مختلفة.";
        grid.appendChild(empty);
      }
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) {
          x.classList.remove("chip-active");
        });
        c.classList.add("chip-active");
        activeFilter = c.getAttribute("data-filter") || "all";
        render();
      });
    });

    if (search) {
      search.addEventListener("input", function () {
        term = search.value;
        render();
      });
    }

    render();
  }

  /* Timeline observer */
  function initTimeline() {
    var items = qsa(".timeline-item");
    if (!items.length) return;
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach(function (li) {
      obs.observe(li);
    });
  }

  /* Booking */
  function initBooking() {
    var form = qs("#booking-form");
    var toast = qs("#form-toast");
    var list = qs("#bookings-list");
    if (!form) return;

    function loadBookings() {
      try {
        var raw = localStorage.getItem(BOOKINGS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    function saveBookings(arr) {
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr));
    }

    function goalLabel(g) {
      var map = {
        weight: "إدارة الوزن",
        energy: "الطاقة",
        digestion: "الهضم",
        mother: "الأم/الطفل",
        chronic: "حالة صحية",
      };
      return map[g] || g;
    }

    function renderList() {
      if (!list) return;
      var arr = loadBookings();
      list.innerHTML = "";
      arr
        .slice(-8)
        .reverse()
        .forEach(function (b) {
          var li = document.createElement("li");
          li.textContent =
            b.name +
            " — عمر " +
            b.age +
            " — " +
            goalLabel(b.goal) +
            " — " +
            b.phone +
            " — " +
            b.date;
          list.appendChild(li);
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var entry = {
        name: String(fd.get("name") || "").trim(),
        age: String(fd.get("age") || "").trim(),
        goal: String(fd.get("goal") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        date: new Date().toLocaleString("ar-EG"),
      };
      var all = loadBookings();
      all.push(entry);
      saveBookings(all);
      if (toast) {
        toast.classList.remove("hidden");
        toast.textContent = "تم استلام الطلب وحفظه محلياً في هذا المتصفح.";
      }
      form.reset();
      renderList();
      window.setTimeout(function () {
        if (toast) toast.classList.add("hidden");
      }, 5000);
    });

    renderList();
  }

  /* رسالة واحدة من الثمانية لكل تحميل أو زيارة؛ عشوائي بدون تكرار الزيارة المباشرة — لا تايمر */
  function randomVisitIndexExcludeLast(total, lastShown) {
    if (total <= 1) return 0;

    if (!Number.isFinite(lastShown) || lastShown < 0 || lastShown >= total) {
      return Math.floor(Math.random() * total);
    }

    var gap = Math.floor(Math.random() * (total - 1));

    if (gap >= lastShown) gap += 1;

    return gap;
  }

  function readLastDailyIndex(total) {
    try {
      var sx = window.localStorage.getItem(DAILY_MSG_INDEX_KEY);
      if (sx === null || sx === "") return -1;

      var n = Number.parseInt(sx, 10);
      if (!Number.isFinite(n) || n < 0 || n >= total) return -1;
      return n;
    } catch (_e) {
      return -1;
    }
  }

  function persistDailyIndex(idx) {
    try {
      window.localStorage.setItem(DAILY_MSG_INDEX_KEY, String(idx));
    } catch (_e) {}
  }

  var healthRadioMqBound = false;
  var healthRadioTimers = [];

  function healthRadioClearTimers() {
    healthRadioTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    healthRadioTimers = [];
  }

  function healthRadioDefer(fn, ms) {
    var id = window.setTimeout(function () {
      healthRadioTimers = healthRadioTimers.filter(function (x) {
        return x !== id;
      });
      fn();
    }, ms);
    healthRadioTimers.push(id);
    return id;
  }

  function healthRadioTypewriter(el, full, msPerChar, done) {
    var i = 0;
    el.textContent = "";

    function tick() {
      i += 1;
      el.textContent = full.slice(0, i);
      if (i < full.length) healthRadioDefer(tick, msPerChar);
      else if (done) healthRadioDefer(done, 30);
    }

    healthRadioDefer(tick, msPerChar);
  }

  function initHealthRadioBroadcast() {
    var panel = qs("#health-radio-panel");
    var inner = qs("#health-radio-msg-inner");
    var emojiEl = qs("#health-radio-emoji");
    var headingEl = qs("#health-radio-heading");
    var bodyEl = qs("#health-radio-body");
    var nextBtn = qs("#health-radio-next");

    if (!panel || !inner || !emojiEl || !headingEl || !bodyEl || !nextBtn)
      return;

    if (panel.dataset.healthRadioInit === "1") return;

    panel.dataset.healthRadioInit = "1";

    var mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    function prefersReduce() {
      return mq ? mq.matches : false;
    }

    function setReduceAttr() {
      panel.dataset.reducedMotion = prefersReduce() ? "1" : "0";
    }

    setReduceAttr();

    var total = dailyHealthMessages.length;
    var currentIdx = -1;
    var firstShow = true;

    function revealFullMessage(item) {
      emojiEl.textContent = item.emoji;
      headingEl.textContent = item.title;
      bodyEl.innerHTML = "";
      item.paragraphs.forEach(function (line) {
        var p = window.document.createElement("p");
        p.className = "health-radio-line";
        p.textContent = line;
        bodyEl.appendChild(p);
      });
    }

    function typeFullMessage(item) {
      emojiEl.textContent = item.emoji;
      headingEl.textContent = "";
      bodyEl.innerHTML = "";
      healthRadioTypewriter(headingEl, item.title, 20, function () {
        var pi = 0;

        function chainPara() {
          if (pi >= item.paragraphs.length) return;

          var p = window.document.createElement("p");
          p.className = "health-radio-line";
          p.textContent = "";
          bodyEl.appendChild(p);

          healthRadioTypewriter(p, item.paragraphs[pi], 14, function () {
            pi += 1;

            chainPara();
          });
        }

        chainPara();
      });
    }

    function applyIndex(idx, opts) {
      opts = opts || {};
      var item = dailyHealthMessages[idx];
      if (!item) return;

      currentIdx = idx;
      persistDailyIndex(idx);
      panel.setAttribute("aria-label", "إذاعة اسمع جسمك — " + item.title);
      healthRadioClearTimers();

      function fill() {
        if (prefersReduce()) revealFullMessage(item);
        else if (opts.noTyping) revealFullMessage(item);
        else typeFullMessage(item);
      }

      if (firstShow || prefersReduce()) {
        firstShow = false;
        inner.classList.remove("health-radio-msg-out", "health-radio-msg-in");

        void inner.offsetWidth;


        if (!prefersReduce()) inner.classList.add("health-radio-msg-in");

        healthRadioDefer(fill, prefersReduce() ? 0 : 180);

        healthRadioDefer(function () {


          inner.classList.remove("health-radio-msg-in");
        }, 780);

        return;
      }

      inner.classList.add("health-radio-msg-out");

      healthRadioDefer(function () {
        inner.classList.remove("health-radio-msg-out");
        void inner.offsetWidth;


        inner.classList.add("health-radio-msg-in");
        fill();
        healthRadioDefer(function () {


          inner.classList.remove("health-radio-msg-in");
        }, 780);
      }, 300);
    }

    var pick0 = randomVisitIndexExcludeLast(
      total,
      readLastDailyIndex(total)
    );
    applyIndex(pick0);

    nextBtn.addEventListener("click", function () {
      applyIndex(randomVisitIndexExcludeLast(total, currentIdx), {});
    });

    if (mq && mq.addEventListener && !healthRadioMqBound) {
      healthRadioMqBound = true;

      mq.addEventListener("change", function () {
        setReduceAttr();
        healthRadioClearTimers();


        if (currentIdx >= 0)
          applyIndex(currentIdx, { noTyping: prefersReduce() });
      });
    }
  }


  window.addEventListener("pageshow", function (ev) {


    if (ev.persisted) initHealthRadioBroadcast();
  });

  /* Chat */
  function initChat() {
    var fab = qs("#chat-fab");
    var panel = qs("#chat-panel");
    var closeBtn = qs("#chat-close");
    var form = qs("#chat-form");
    var msgs = qs("#chat-messages");
    var input = qs("#chat-input");

    function toggle(open) {
      if (!panel || !fab) return;
      if (typeof open !== "boolean") open = panel.hidden;
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", open ? "true" : "false");
    }

    if (fab)
      fab.addEventListener("click", function () {
        toggle(panel.hasAttribute("hidden"));
      });
    if (closeBtn)
      closeBtn.addEventListener("click", function () {
        toggle(false);
      });

    function norm(x) {
      return String(x || "").toLowerCase();
    }

    function replyFor(text) {
      var t = norm(text);
      if (t.indexOf("ماء") !== -1 || t.indexOf("ميه") !== -1) {
        return "الماء أفضل توزيعاً على اليوم؛ ابدأ بواحد عند الاستيقاظ وحافظ على كوب قبل الوجبات إن لم يزعج معدتك.";
      }
      if (t.indexOf("نوم") !== -1) {
        return "النوم يعيد ضبط الهرمونات المرتبطة بالجوع؛ جرب إيقاف الشاشات ساعة قبل النوم وزامن وقت الاستيقاظ.";
      }
      if (t.indexOf("كشري") !== -1) {
        return "الكشري وجبة طاقة — قلل الزيت في الصوص وحجم الطبق حسب نشاط يومك.";
      }
      if (t.indexOf("فول") !== -1) {
        return "الفول غني وبسيط؛ راقب الملح وقدّمه مع سلطة ومكونات مغذية بدل الإفراط في الزيت.";
      }
      return "شكراً لسؤالك! للتخصيص أكثر جرّب قسم التقييم أو احجز استشارة خاصة من النموذج.";
    }

    if (form && msgs && input) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var val = input.value.trim();
        if (!val) return;
        var u = document.createElement("p");
        u.className = "chat-bubble user";
        u.textContent = val;
        msgs.appendChild(u);
        input.value = "";
        var bot = document.createElement("p");
        bot.className = "chat-bubble bot";
        bot.textContent = replyFor(val);
        msgs.appendChild(bot);
        msgs.scrollTop = msgs.scrollHeight;
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHealthRadioBroadcast();
    initTheme();
    initNav();
    initModals();
    initQuiz();
    initFoods();
    initTimeline();
    initBooking();
    initChat();
  });
})();
