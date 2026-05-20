/**
 * يكمل كل ملفات WAV الناقصة (مرحلة 1 + 2) بمحاولات متعددة — 5 عمال متوازيين.
 *   node scripts/complete-missing-tts.mjs
 *   node scripts/complete-missing-tts.mjs --workers=5
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MIN_SIZE = 500;
const DEFAULT_WORKERS = 5;

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

function pcm16MonoToWav(pcm, sampleRate) {
  sampleRate = sampleRate || 24000;
  var buf = Buffer.alloc(44 + pcm.length);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  return buf;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function buildFullQueue() {
  const q = [];
  const arLetters = [
    { name: "ألف", word: "أسد" }, { name: "باء", word: "بطة" }, { name: "تاء", word: "تفاحة" },
    { name: "ثاء", word: "ثعلب" }, { name: "جيم", word: "جمل" }, { name: "حاء", word: "حصان" },
    { name: "خاء", word: "خروف" }, { name: "دال", word: "ديك" }, { name: "ذال", word: "ذهب" },
    { name: "راء", word: "أرنب" }, { name: "زاي", word: "زهرة" }, { name: "سين", word: "سمكة" },
    { name: "شين", word: "شمس" }, { name: "صاد", word: "صقر" }, { name: "ضاد", word: "ضفدع" },
    { name: "طاء", word: "طائرة" }, { name: "ظاء", word: "ظبي" }, { name: "عين", word: "عنب" },
    { name: "غين", word: "غيمة" }, { name: "فاء", word: "فراشة" }, { name: "قاف", word: "قمر" },
    { name: "كاف", word: "كتاب" }, { name: "لام", word: "ليمون" }, { name: "ميم", word: "موز" },
    { name: "نون", word: "نجمة" }, { name: "هاء", word: "هلال" }, { name: "واو", word: "وردة" },
    { name: "ياء", word: "يد" },
  ];
  arLetters.forEach((d, i) => {
    const phrase = `${d.name}، ${d.word}`;
    q.push({ phrase, lang: "ar", out: `data/audio/alphabet/ar/${i}.wav`, alts: [d.word, d.name] });
  });
  const enLetters = [
    "Apple", "Ball", "Cat", "Dog", "Egg", "Fish", "Gift", "Heart", "Ice cream", "Juice",
    "Kite", "Lion", "Moon", "Nest", "Orange", "Penguin", "Queen", "Rainbow", "Sun", "Tree",
    "Umbrella", "Violin", "Water", "X-ray fish", "Yo-yo", "Zebra",
  ];
  const enChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  enLetters.forEach((word, i) => {
    q.push({ phrase: `${enChars[i]}. ${word}`, lang: "en", out: `data/audio/alphabet/en/${i}.wav`, alts: [word] });
  });
  const animals = [
    { key: "cat", ar: "قطة", en: "Cat" }, { key: "dog", ar: "كلب", en: "Dog" },
    { key: "bird", ar: "طائر", en: "Bird" }, { key: "fish", ar: "سمكة", en: "Fish" },
    { key: "rabbit", ar: "أرنب", en: "Rabbit" }, { key: "elephant", ar: "فيل", en: "Elephant" },
    { key: "lion", ar: "أسد", en: "Lion" }, { key: "penguin", ar: "بطريق", en: "Penguin" },
    { key: "butterfly", ar: "فراشة", en: "Butterfly" },
  ];
  animals.forEach((d) => {
    q.push({ phrase: d.ar, lang: "ar", out: `data/audio/animals/ar/${d.key}.wav`, alts: [] });
    q.push({ phrase: d.en, lang: "en", out: `data/audio/animals/en/${d.key}.wav`, alts: [] });
  });
  const colors = [
    { hex: "ef4444", ar: "أحمر", en: "Red" }, { hex: "3b82f6", ar: "أزرق", en: "Blue" },
    { hex: "eab308", ar: "أصفر", en: "Yellow" }, { hex: "22c55e", ar: "أخضر", en: "Green" },
    { hex: "a855f7", ar: "بنفسجي", en: "Purple" }, { hex: "f97316", ar: "برتقالي", en: "Orange" },
    { hex: "ec4899", ar: "وردي", en: "Pink" }, { hex: "92400e", ar: "بني", en: "Brown" },
    { hex: "ffffff", ar: "أبيض", en: "White" }, { hex: "171717", ar: "أسود", en: "Black" },
  ];
  colors.forEach((d) => {
    q.push({ phrase: d.ar, lang: "ar", out: `data/audio/colors/ar/${d.hex}.wav`, alts: [] });
    q.push({ phrase: d.en, lang: "en", out: `data/audio/colors/en/${d.hex}.wav`, alts: [] });
  });
  const shapes = [
    { key: "circle", ar: "دائرة", en: "Circle" }, { key: "square", ar: "مربع", en: "Square" },
    { key: "triangle", ar: "مثلث", en: "Triangle" }, { key: "heart", ar: "قلب", en: "Heart" },
    { key: "star", ar: "نجمة", en: "Star" }, { key: "rectangle", ar: "مستطيل", en: "Rectangle" },
  ];
  shapes.forEach((d) => {
    q.push({ phrase: d.ar, lang: "ar", out: `data/audio/shapes/ar/${d.key}.wav`, alts: [] });
    q.push({ phrase: d.en, lang: "en", out: `data/audio/shapes/en/${d.key}.wav`, alts: [] });
  });
  for (let n = 1; n <= 100; n++) {
    const ar = arabicWords(n);
    q.push({ phrase: ar, lang: "ar", out: `data/audio/numbers/ar/${n}.wav`, alts: [String(n), `رقم ${n}`] });
    const en = n === 100 ? "one hundred" : n < 20 ? ["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"][n-1] : (() => {
      const low = ["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
      const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
      const td = Math.floor(n/10), od = n%10;
      return od === 0 ? tens[td] : tens[td] + " " + low[od-1];
    })();
    q.push({ phrase: en, lang: "en", out: `data/audio/numbers/en/${n}.wav`, alts: [String(n)] });
  }
  const fam = JSON.parse(fs.readFileSync(path.join(ROOT, "data/family-words.json"), "utf8"));
  (fam.items || []).forEach((it) => {
    q.push({ phrase: it.phrase, lang: "ar", out: `data/audio/family/${it.id}.wav`, alts: [] });
  });
  // phase 2 included for completeness
  const emotions = [
    { key: "happy", ar: "سعيد", en: "Happy" }, { key: "sad", ar: "حزين", en: "Sad" },
    { key: "angry", ar: "غاضب", en: "Angry" }, { key: "scared", ar: "خائف", en: "Scared" },
    { key: "excited", ar: "متحمس", en: "Excited" }, { key: "sleepy", ar: "نعسان", en: "Sleepy" },
    { key: "sick", ar: "مريض", en: "Sick" }, { key: "proud", ar: "فخور", en: "Proud" },
  ];
  emotions.forEach((d) => {
    q.push({ phrase: d.ar, lang: "ar", out: `data/audio/emotions/ar/${d.key}.wav`, alts: ["أنا " + d.ar] });
    q.push({ phrase: d.en, lang: "en", out: `data/audio/emotions/en/${d.key}.wav`, alts: [] });
  });
  return q;
}

async function generateOne(apiKey, model, voiceName, prompt, outPath) {
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";
  var body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };
  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  var json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || res.statusText);
  var parts = json?.candidates?.[0]?.content?.parts;
  if (!parts?.length) throw new Error("no parts (" + (json?.candidates?.[0]?.finishReason || "?") + ")");
  var inline = parts[0].inlineData || parts[0].inline_data;
  if (!inline?.data) throw new Error("no inlineData");
  var mime = String(inline.mimeType || inline.mime_type || "").toLowerCase();
  var raw = Buffer.from(inline.data, "base64");
  if (mime.indexOf("wav") !== -1) fs.writeFileSync(outPath, raw);
  else {
    var rate = 24000;
    var m = /rate=(\d+)/.exec(mime);
    if (m) rate = parseInt(m[1], 10);
    fs.writeFileSync(outPath, pcm16MonoToWav(raw, rate));
  }
}

const models = ["gemini-2.5-pro-preview-tts", "gemini-2.5-flash-preview-tts"];
const voices = ["Leda", "Kore", "Aoede", "Puck"];

async function tryTask(apiKey, task) {
  const outPath = path.join(ROOT, task.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  const style = task.lang === "ar"
    ? "[warmly, clearly, youthful Arabic speaker]: "
    : "[warmly, clearly, friendly English speaker]: ";
  const texts = [task.phrase, ...(task.alts || [])];

  for (const model of models) {
    for (const voice of voices) {
      for (const text of texts) {
        for (const wrap of [style + text, "Say clearly for children: " + text, text]) {
          try {
            await generateOne(apiKey, model, voice, wrap, outPath);
            if (fs.statSync(outPath).size >= MIN_SIZE) return true;
          } catch (_) {
            await sleep(300);
          }
        }
      }
    }
  }
  return false;
}

function parseWorkers() {
  var arg = process.argv.find(function (a) {
    return a.indexOf("--workers=") === 0;
  });
  if (arg) {
    var n = parseInt(arg.split("=")[1], 10);
    if (n >= 1 && n <= 12) return n;
  }
  var env = parseInt(process.env.TTS_WORKERS || "", 10);
  if (env >= 1 && env <= 12) return env;
  return DEFAULT_WORKERS;
}

/** تشغيل المهام بـ N عامل متوازي */
async function runWorkerPool(apiKey, tasks, workers) {
  var next = 0;
  var done = 0;
  var ok = 0;
  var fail = 0;
  var total = tasks.length;

  async function worker(workerId) {
    await sleep(workerId * 120);
    while (true) {
      var i = next++;
      if (i >= total) break;
      var task = tasks[i];
      console.log(`[W${workerId}][${i + 1}/${total}] ${task.out} ← "${task.phrase}"`);
      if (await tryTask(apiKey, task)) {
        ok++;
        console.log(`[W${workerId}] ✓ ${task.out}`);
      } else {
        fail++;
        console.error(`[W${workerId}] ✗ ${task.out}`);
      }
      done++;
    }
  }

  await Promise.all(
    Array.from({ length: workers }, function (_, id) {
      return worker(id + 1);
    })
  );
  return { ok, fail, total };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    console.error("GEMINI_API_KEY missing");
    process.exit(1);
  }
  var workers = parseWorkers();
  const all = buildFullQueue();
  const missing = all.filter((t) => {
    const p = path.join(ROOT, t.out);
    return !fs.existsSync(p) || fs.statSync(p).size < MIN_SIZE;
  });
  console.log(`ناقص: ${missing.length} من ${all.length} | عمال: ${workers}`);
  if (!missing.length) {
    console.log("كل الملفات مكتملة!");
    return;
  }
  var result = await runWorkerPool(apiKey, missing, workers);
  const still = all.filter((t) => {
    const p = path.join(ROOT, t.out);
    return !fs.existsSync(p) || fs.statSync(p).size < MIN_SIZE;
  });
  console.log(`\nنجح: ${result.ok}/${result.total} | فشل: ${result.fail}`);
  console.log(`ما زال ناقصاً: ${still.length}`);
  if (still.length) {
    still.forEach((t) => console.log("  -", t.out));
    process.exit(1);
  }
}

main();
