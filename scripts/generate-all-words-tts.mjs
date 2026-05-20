/**
 * توليد ملفات صوت WAV لجميع الكلمات والعبارات في التطبيق عبر Gemini Native TTS.
 * يستخدم الموديل: gemini-2.5-pro-preview-tts
 *
 * تشغيل (من مجلد kitty-learn):
 *   node scripts/generate-all-words-tts.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadDotEnv() {
  var p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach(function (line) {
    var m = /^([^#=]+)=(.*)$/.exec(line.trim());
    if (!m) return;
    var k = m[1].trim();
    var v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

loadDotEnv();

function pcm16MonoToWav(pcm, sampleRate, channels, bitsPerSample) {
  sampleRate = sampleRate || 24000;
  channels = channels || 1;
  bitsPerSample = bitsPerSample || 16;
  var byteRate = (sampleRate * channels * bitsPerSample) / 8;
  var blockAlign = (channels * bitsPerSample) / 8;
  var dataSize = pcm.length;
  var buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  pcm.copy(buf, 44);
  return buf;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function generateOne(apiKey, model, voiceName, phrase, outPath, lang = "ar") {
  // تخطي التوليد إن كان الملف موجوداً بالفعل لتوفير الكوتا والوقت
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
    console.log(`  [تخطي] موجود بالفعل: ${path.basename(outPath)}`);
    return;
  }

  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  // تخصيص البرومبت بناءً على اللغة ليعطي نطقاً طفولياً وواضحاً ومناسباً
  var promptStyle = lang === "ar"
    ? "[warmly, clearly, youthful Arabic speaker]: "
    : "[warmly, clearly, friendly English speaker]: ";

  var prompt = promptStyle + phrase;

  var body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  var res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  var json = await res.json().catch(function () {
    return null;
  });

  if (!res.ok) {
    var msg = json && json.error ? json.error.message : res.statusText;
    throw new Error("Gemini HTTP " + res.status + ": " + msg);
  }

  var parts = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  if (!parts || !parts.length) {
    throw new Error("لا توجد parts في الاستجابة: " + JSON.stringify(json).slice(0, 400));
  }

  var part = parts[0];
  var inline = part.inlineData || part.inline_data;
  if (!inline || !inline.data) {
    throw new Error("لا يوجد inlineData صوتي في الاستجابة: " + JSON.stringify(part).slice(0, 400));
  }

  var mime = String(inline.mimeType || inline.mime_type || "").toLowerCase();
  var raw = Buffer.from(inline.data, "base64");

  if (mime.indexOf("wav") !== -1) {
    fs.writeFileSync(outPath, raw);
    return;
  }

  var rate = 24000;
  var m = /rate=(\d+)/.exec(mime);
  if (m) rate = parseInt(m[1], 10);

  fs.writeFileSync(outPath, pcm16MonoToWav(raw, rate, 1, 16));
}

// ----------------------------------------------------
// تعريف دالات توليد أسماء الأرقام
// ----------------------------------------------------
function easternDigits(n) {
  var map = { 0: "٠", 1: "١", 2: "٢", 3: "٣", 4: "٤", 5: "٥", 6: "٦", 7: "٧", 8: "٨", 9: "٩" };
  return String(n).replace(/\d/g, function (d) { return map[d] || d; });
}

function arabicWords(n) {
  if (n === 0) return "صفر";
  if (n === 100) return "مئة";
  var onesNames = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  var tensNames = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  if (n >= 1 && n <= 10) {
    var u10 = ["واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
    return u10[n - 1];
  }
  if (n >= 11 && n <= 19) {
    var teens = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    return teens[n - 11];
  }
  var tensDigit = Math.floor(n / 10);
  var onesDigit = n % 10;
  if (onesDigit === 0) return tensNames[tensDigit];
  return onesNames[onesDigit] + " و" + tensNames[tensDigit];
}

function englishWords(n) {
  if (n === 0) return "zero";
  if (n === 100) return "one hundred";
  var low = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (n < 20) return low[n - 1];
  var td = Math.floor(n / 10);
  var od = n % 10;
  if (od === 0) return tens[td];
  return tens[td] + " " + low[od - 1];
}

// ----------------------------------------------------
// تجميع قوائم البيانات للتحويل إلى صوت
// ----------------------------------------------------
async function main() {
  var apiKey = process.env.GEMINI_API_KEY;
  var model = "gemini-2.5-pro-preview-tts";

  if (!apiKey || !String(apiKey).trim()) {
    console.error("يرجى التأكد من وجود GEMINI_API_KEY في البيئة المحيطة أو في ملف .env");
    process.exit(1);
  }

  // الأصوات المدعومة والمقترحة من مكتبة جوجل
  var voiceName = "Leda"; // صوت ناعم وواضح ومناسب للأطفال

  console.log("نموذج TTS المستخدم:", model);
  console.log("الصوت المعتمد:", voiceName);

  // تجهيز مجلدات المخرجات الصوتية
  const folders = [
    "alphabet/ar", "alphabet/en",
    "animals/ar", "animals/en",
    "colors/ar", "colors/en",
    "shapes/ar", "shapes/en",
    "numbers/ar", "numbers/en",
    "family",
    "prayer/ar", "prayer/en",
    "emotions/ar", "emotions/en",
    "space/ar", "space/en",
    "routine/ar", "routine/en"
  ];
  for (const f of folders) {
    fs.mkdirSync(path.join(ROOT, "data", "audio", f), { recursive: true });
  }

  const ttsQueue = [];

  // 1. الحروف الهجائية
  const arLetters = [
    { letter: "ا", name: "ألف", word: "أسد" },
    { letter: "ب", name: "باء", word: "بطة" },
    { letter: "ت", name: "تاء", word: "تفاحة" },
    { letter: "ث", name: "ثاء", word: "ثعلب" },
    { letter: "ج", name: "جيم", word: "جمل" },
    { letter: "ح", name: "حاء", word: "حصان" },
    { letter: "خ", name: "خاء", word: "خروف" },
    { letter: "د", name: "دال", word: "ديك" },
    { letter: "ذ", name: "ذال", word: "ذهب" },
    { letter: "ر", name: "راء", word: "أرنب" },
    { letter: "ز", name: "زاي", word: "زهرة" },
    { letter: "س", name: "سين", word: "سمكة" },
    { letter: "ش", name: "شين", word: "شمس" },
    { letter: "ص", name: "صاد", word: "صقر" },
    { letter: "ض", name: "ضاد", word: "ضفدع" },
    { letter: "ط", name: "طاء", word: "طائرة" },
    { letter: "ظ", name: "ظاء", word: "ظبي" },
    { letter: "ع", name: "عين", word: "عنب" },
    { letter: "غ", name: "غين", word: "غيمة" },
    { letter: "ف", name: "فاء", word: "فراشة" },
    { letter: "ق", name: "قاف", word: "قمر" },
    { letter: "ك", name: "كاف", word: "كتاب" },
    { letter: "ل", name: "لام", word: "ليمون" },
    { letter: "م", name: "ميم", word: "موز" },
    { letter: "ن", name: "نون", word: "نجمة" },
    { letter: "ه", name: "هاء", word: "هلال" },
    { letter: "و", name: "واو", word: "وردة" },
    { letter: "ي", name: "ياء", word: "يد" }
  ];
  arLetters.forEach((d, i) => {
    ttsQueue.push({
      phrase: `${d.name}، ${d.word}`,
      out: `data/audio/alphabet/ar/${i}.wav`,
      lang: "ar"
    });
  });

  const enLetters = [
    { letter: "A", word: "Apple" },
    { letter: "B", word: "Ball" },
    { letter: "C", word: "Cat" },
    { letter: "D", word: "Dog" },
    { letter: "E", word: "Egg" },
    { letter: "F", word: "Fish" },
    { letter: "G", word: "Gift" },
    { letter: "H", word: "Heart" },
    { letter: "I", word: "Ice cream" },
    { letter: "J", word: "Juice" },
    { letter: "K", word: "Kite" },
    { letter: "L", word: "Lion" },
    { letter: "M", word: "Moon" },
    { letter: "N", word: "Nest" },
    { letter: "O", word: "Orange" },
    { letter: "P", word: "Penguin" },
    { letter: "Q", word: "Queen" },
    { letter: "R", word: "Rainbow" },
    { letter: "S", word: "Sun" },
    { letter: "T", word: "Tree" },
    { letter: "U", word: "Umbrella" },
    { letter: "V", word: "Violin" },
    { letter: "W", word: "Water" },
    { letter: "X", word: "X-ray fish" },
    { letter: "Y", word: "Yo-yo" },
    { letter: "Z", word: "Zebra" }
  ];
  enLetters.forEach((d, i) => {
    ttsQueue.push({
      phrase: `${d.letter}. ${d.word}`,
      out: `data/audio/alphabet/en/${i}.wav`,
      lang: "en"
    });
  });

  // 2. الحيوانات
  const animals = [
    { key: "cat", ar: "قطة", en: "Cat" },
    { key: "dog", ar: "كلب", en: "Dog" },
    { key: "bird", ar: "طائر", en: "Bird" },
    { key: "fish", ar: "سمكة", en: "Fish" },
    { key: "rabbit", ar: "أرنب", en: "Rabbit" },
    { key: "elephant", ar: "فيل", en: "Elephant" },
    { key: "lion", ar: "أسد", en: "Lion" },
    { key: "penguin", ar: "بطريق", en: "Penguin" },
    { key: "butterfly", ar: "فراشة", en: "Butterfly" }
  ];
  animals.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/animals/ar/${d.key}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/animals/en/${d.key}.wav`, lang: "en" });
  });

  // 3. الألوان والكسور/الأشكال
  const colors = [
    { hex: "ef4444", ar: "أحمر", en: "Red" },
    { hex: "3b82f6", ar: "أزرق", en: "Blue" },
    { hex: "eab308", ar: "أصفر", en: "Yellow" },
    { hex: "22c55e", ar: "أخضر", en: "Green" },
    { hex: "a855f7", ar: "بنفسجي", en: "Purple" },
    { hex: "f97316", ar: "برتقالي", en: "Orange" },
    { hex: "ec4899", ar: "وردي", en: "Pink" },
    { hex: "92400e", ar: "بني", en: "Brown" },
    { hex: "ffffff", ar: "أبيض", en: "White" },
    { hex: "171717", ar: "أسود", en: "Black" }
  ];
  colors.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/colors/ar/${d.hex}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/colors/en/${d.hex}.wav`, lang: "en" });
  });

  const shapes = [
    { key: "circle", ar: "دائرة", en: "Circle" },
    { key: "square", ar: "مربع", en: "Square" },
    { key: "triangle", ar: "مثلث", en: "Triangle" },
    { key: "heart", ar: "قلب", en: "Heart" },
    { key: "star", ar: "نجمة", en: "Star" },
    { key: "rectangle", ar: "مستطيل", en: "Rectangle" }
  ];
  shapes.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/shapes/ar/${d.key}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/shapes/en/${d.key}.wav`, lang: "en" });
  });

  // 4. الأرقام (توليد من 1 إلى 20، ثم العشرات ومئة تسهيلاً وتوفيراً، أو الكل حسب الرغبة)
  // لتوفير القوة والكوتا بشكل ذكي، سنولد الأرقام من 1 إلى 20، ثم العشرات: 30، 40، 50، 60، 70، 80، 90 ومئة (100).
  // وفي كود الأرقام، سنقوم بتوليدها جميعاً! دعنا نولد الأرقام الأساسية التي يحتاجها الطفل بشكل كبير.
  // سنقوم بتوليد جميع الأرقام من 1 إلى 100 لتغطية الشبكة بالكامل بالصوت الحقيقي.
  for (var n = 1; n <= 100; n++) {
    ttsQueue.push({ phrase: arabicWords(n), out: `data/audio/numbers/ar/${n}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: englishWords(n), out: `data/audio/numbers/en/${n}.wav`, lang: "en" });
  }

  // 5. كلمات العائلة
  var familyManifestPath = path.join(ROOT, "data", "family-words.json");
  if (fs.existsSync(familyManifestPath)) {
    var familyManifest = JSON.parse(fs.readFileSync(familyManifestPath, "utf8"));
    var familyItems = familyManifest.items || [];
    familyItems.forEach((item) => {
      ttsQueue.push({ phrase: item.phrase, out: `data/audio/family/${item.id}.wav`, lang: "ar" });
    });
  }

  // 6. الصلاة والوضوء والأدعية والأخلاق
  const wuduSteps = [
    { ar: "قل بسم الله في قلبك قبل أن تغسل يديك", en: "Say Bismillah in your heart before you wash" },
    { ar: "اغسل يديك إلى المعصم ثلاث مرات", en: "Wash your hands to the wrists three times" },
    { ar: "تمضمض واستنثر بلطف ثلاث مرات", en: "Rinse mouth and nose gently three times each" },
    { ar: "اغسل وجهك ثلاث مرات", en: "Wash your face three times" },
    { ar: "اغسل ذراعيك إلى المرفقين ثلاث مرات", en: "Wash your arms up to the elbows three times each" },
    { ar: "بلل يديك ثم امسح على رأسك مرة واحدة", en: "Wet your hands and wipe over your head once" },
    { ar: "اغسل قدميك إلى الكعبين ثلاث مرات", en: "Wash your feet up to the ankles three times each" }
  ];
  wuduSteps.forEach((d, i) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/prayer/ar/wudu_${i}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/prayer/en/wudu_${i}.wav`, lang: "en" });
  });

  const prayerSteps = [
    { ar: "استقبال القبلة. قف بهدوء، قلبك مطمئن", en: "Face the qiblah. Stand calmly with a peaceful heart" },
    { ar: "النية والتكبير. نو الصلاة في قلبك وكبر قائلا الله أكبر", en: "Niyyah and takbir. Make intention and say Allahu Akbar" },
    { ar: "الفاتحة. اقرأ سورة الفاتحة", en: "Al-Fatihah. Recite slowly" },
    { ar: "الركوع. انحن وقل سبحان ربي العظيم", en: "Ruku. Bow and say Subhana Rabbiyal Adheem" },
    { ar: "السجود. ضع جبهتك وأنفك ويديك وركبتيك على الأرض", en: "Sujood. Touch forehead, nose, hands, knees, and toes to the ground" },
    { ar: "التشهد والسلام. اجلس بوقار، ثم سلم يمينا ويسارا", en: "Tashahhud and salam. Sit nicely, then say salam to each side" }
  ];
  prayerSteps.forEach((d, i) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/prayer/ar/prayer_${i}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/prayer/en/prayer_${i}.wav`, lang: "en" });
  });

  const manners = [
    { ar: "احترام. كلمة طيبة مع الوالدين والمعلمين والأصدقاء", en: "Respect. Gentle words with parents, teachers, and friends" },
    { ar: "لطف. شارك ابتسامة، ساعد بيد صغيرة", en: "Kindness. Share smiles and helping hands" },
    { ar: "صدق. الصدق جميل، الخطأ يصلح مع من تحب", en: "Honesty. Tell the truth softly, mistakes can be fixed together" },
    { ar: "شكر. قل شكرا للناس، وحمدا لله على النعم", en: "Gratitude. Thank people and thank Allah for blessings" }
  ];
  manners.forEach((d, i) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/prayer/ar/manner_${i}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/prayer/en/manner_${i}.wav`, lang: "en" });
  });

  const duas = [
    { ar: "قبل الأكل، بسم الله، نبدأ الأكل بحمد الله", en: "Before eating, Bismillah, begin food with gratitude" },
    { ar: "بعد الأكل، الحمد لله، نشكر الله على الطعام الطيب", en: "After eating, Alhamdulillah, thank Allah for good food" },
    { ar: "قبل النوم، دعاء بسيط وذكر رفيق مع العائلة قبل النوم", en: "Before sleeping, gentle dhikr with family before bed" }
  ];
  duas.forEach((d, i) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/prayer/ar/dua_${i}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/prayer/en/dua_${i}.wav`, lang: "en" });
  });

  // 7. المشاعر
  const emotions = [
    { key: "happy", ar: "سعيد", en: "Happy" },
    { key: "sad", ar: "حزين", en: "Sad" },
    { key: "angry", ar: "غاضب", en: "Angry" },
    { key: "scared", ar: "خائف", en: "Scared" },
    { key: "excited", ar: "متحمس", en: "Excited" },
    { key: "sleepy", ar: "نعسان", en: "Sleepy" },
    { key: "sick", ar: "مريض", en: "Sick" },
    { key: "proud", ar: "فخور", en: "Proud" },
  ];
  emotions.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/emotions/ar/${d.key}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/emotions/en/${d.key}.wav`, lang: "en" });
  });

  // 8. الفضاء
  const spaceBodies = [
    { key: "sun", ar: "الشمس", en: "Sun" },
    { key: "moon", ar: "القمر", en: "Moon" },
    { key: "mercury", ar: "عطارد", en: "Mercury" },
    { key: "venus", ar: "الزهرة", en: "Venus" },
    { key: "earth", ar: "الأرض", en: "Earth" },
    { key: "mars", ar: "المريخ", en: "Mars" },
    { key: "jupiter", ar: "المشتري", en: "Jupiter" },
    { key: "saturn", ar: "زحل", en: "Saturn" },
    { key: "uranus", ar: "أورانوس", en: "Uranus" },
    { key: "neptune", ar: "نبتون", en: "Neptune" },
  ];
  spaceBodies.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/space/ar/${d.key}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/space/en/${d.key}.wav`, lang: "en" });
  });

  // 9. الروتين اليومي
  const routineSteps = [
    { key: "wake", ar: "الاستيقاظ", en: "Wake up" },
    { key: "teeth", ar: "تنظيف الأسنان", en: "Brush teeth" },
    { key: "wash", ar: "غسل الوجه", en: "Wash face" },
    { key: "breakfast", ar: "الإفطار", en: "Breakfast" },
    { key: "school", ar: "المدرسة", en: "School" },
    { key: "lunch", ar: "الغداء", en: "Lunch" },
    { key: "play", ar: "اللعب", en: "Play time" },
    { key: "sleep", ar: "النوم", en: "Sleep" },
  ];
  routineSteps.forEach((d) => {
    ttsQueue.push({ phrase: d.ar, out: `data/audio/routine/ar/${d.key}.wav`, lang: "ar" });
    ttsQueue.push({ phrase: d.en, out: `data/audio/routine/en/${d.key}.wav`, lang: "en" });
  });

  console.log(`إجمالي الملفات المطلوب توليدها: ${ttsQueue.length}`);

  var successCount = 0;
  for (var i = 0; i < ttsQueue.length; i++) {
    var task = ttsQueue[i];
    var fullOutPath = path.join(ROOT, task.out);
    console.log(`[${i + 1}/${ttsQueue.length}] جاري معالجة: "${task.phrase}" (${task.lang}) -> ${task.out}`);
    try {
      await generateOne(apiKey, model, voiceName, task.phrase, fullOutPath, task.lang);
      successCount++;
      // الانتظار لتجنب حظر كود الاستجابة ومعدل الطلب
      await sleep(100);
    } catch (e) {
      console.error(`فشل توليد الصوت للعبارة "${task.phrase}":`, e.message || e);
      // في حال حدوث خطأ كوتا أو شبكة، نقوم بالانتظار لفترة أطول ونكمل أو نتوقف
      if (e.message.indexOf("Quota") !== -1 || e.message.indexOf("429") !== -1) {
        console.log("تم بلوغ حد الاستدعاء. الانتظار لمدة 10 ثوانٍ قبل المتابعة...");
        await sleep(10000);
        i--; // إعادة محاولة نفس العبارة
      } else {
        console.log(`تخطي هذه المفردة والمتابعة...`);
      }
    }
  }

  console.log(`تم بنجاح توليد ${successCount} ملفات صوتية من إجمالي ${ttsQueue.length}`);
}

main();
