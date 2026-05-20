/**
 * إعادة توليد الملفات التي فشلت في الجولة الأولى (بالعبارة الأصلية).
 * يحذف الملف القديم ويُجبر التوليد من جديد.
 *
 *   node scripts/regenerate-failed-phase2.mjs
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

async function generateOne(apiKey, model, voiceName, prompt, outPath, lang) {
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  var body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
      },
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
  if (!parts?.length) {
    throw new Error("no parts (" + (json?.candidates?.[0]?.finishReason || "?") + ")");
  }
  var inline = parts[0].inlineData || parts[0].inline_data;
  if (!inline?.data) throw new Error("no inlineData");

  var mime = String(inline.mimeType || inline.mime_type || "").toLowerCase();
  var raw = Buffer.from(inline.data, "base64");
  if (mime.indexOf("wav") !== -1) {
    fs.writeFileSync(outPath, raw);
    return;
  }
  var rate = 24000;
  var m = /rate=(\d+)/.exec(mime);
  if (m) rate = parseInt(m[1], 10);
  fs.writeFileSync(outPath, pcm16MonoToWav(raw, rate));
}

/** الملفات التي فشلت في الجولة الأولى — العبارة الأصلية من التطبيق */
const FAILED = [
  { phrase: "سعيد", lang: "ar", out: "data/audio/emotions/ar/happy.wav", alts: ["أنا سعيد", "سعيدة"] },
  { phrase: "حزين", lang: "ar", out: "data/audio/emotions/ar/sad.wav", alts: ["أنا حزين"] },
  { phrase: "غاضب", lang: "ar", out: "data/audio/emotions/ar/angry.wav", alts: ["أنا غاضب"] },
  { phrase: "Angry", lang: "en", out: "data/audio/emotions/en/angry.wav", alts: [] },
  { phrase: "نعسان", lang: "ar", out: "data/audio/emotions/ar/sleepy.wav", alts: ["أنا نعسان", "نعس"] },
  { phrase: "فخور", lang: "ar", out: "data/audio/emotions/ar/proud.wav", alts: ["أنا فخور"] },
  { phrase: "الشمس", lang: "ar", out: "data/audio/space/ar/sun.wav", alts: ["شمس"] },
  { phrase: "القمر", lang: "ar", out: "data/audio/space/ar/moon.wav", alts: ["قمر"] },
  { phrase: "الأرض", lang: "ar", out: "data/audio/space/ar/earth.wav", alts: ["أرض"] },
  { phrase: "نبتون", lang: "ar", out: "data/audio/space/ar/neptune.wav", alts: ["كوكب نبتون"] },
  { phrase: "غسل الوجه", lang: "ar", out: "data/audio/routine/ar/wash.wav", alts: ["اغسل وجهك", "اغسلي وجهك"] },
  { phrase: "الإفطار", lang: "ar", out: "data/audio/routine/ar/breakfast.wav", alts: ["فطور", "وقت الفطور", "نأكل الفطور"] },
  { phrase: "المدرسة", lang: "ar", out: "data/audio/routine/ar/school.wav", alts: ["مدرسة", "أذهب للمدرسة"] },
  { phrase: "النوم", lang: "ar", out: "data/audio/routine/ar/sleep.wav", alts: ["نوم", "وقت النوم", "ننام"] },
];

const models = [
  "gemini-2.5-pro-preview-tts",
  "gemini-2.5-flash-preview-tts",
];
const voices = ["Leda", "Kore", "Aoede"];

async function tryGenerate(apiKey, task) {
  const outPath = path.join(ROOT, task.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  const style =
    task.lang === "ar"
      ? "[warmly, clearly, youthful Arabic speaker]: "
      : "[warmly, clearly, friendly English speaker]: ";

  const texts = [task.phrase, ...(task.alts || [])];

  for (const model of models) {
    for (const voice of voices) {
      for (const text of texts) {
        for (const wrap of [style + text, "Say clearly for children: " + text, text]) {
          try {
            console.log(`  ${model} / ${voice} / "${text}"`);
            await generateOne(apiKey, model, voice, wrap, outPath, task.lang);
            const sz = fs.statSync(outPath).size;
            if (sz > 500) return { ok: true, text, sz };
          } catch (e) {
            console.log("    ×", e.message);
            await sleep(350);
          }
        }
      }
    }
  }
  return { ok: false };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    console.error("GEMINI_API_KEY missing");
    process.exit(1);
  }

  console.log("إعادة توليد", FAILED.length, "ملفاً فشلت سابقاً...\n");
  let ok = 0;
  for (let i = 0; i < FAILED.length; i++) {
    const task = FAILED[i];
    console.log(`[${i + 1}/${FAILED.length}] ${task.out} ← "${task.phrase}"`);
    const result = await tryGenerate(apiKey, task);
    if (result.ok) {
      console.log(`  ✓ تم (${result.sz} bytes) بعبارة: "${result.text}"\n`);
      ok++;
    } else {
      console.error(`  ✗ فشل نهائياً\n`);
    }
    await sleep(600);
  }
  console.log(`النتيجة: ${ok}/${FAILED.length}`);
  process.exit(ok === FAILED.length ? 0 : 1);
}

main();
