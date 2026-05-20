/**
 * إعادة توليد ملفات المرحلة 2 العربية الناقصة فقط (محاولات متعددة).
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
  var channels = 1;
  var bitsPerSample = 16;
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
  return new Promise((r) => setTimeout(r, ms));
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
  if (!res.ok) {
    var msg = json?.error?.message || res.statusText;
    throw new Error("HTTP " + res.status + ": " + msg);
  }

  var parts = json?.candidates?.[0]?.content?.parts;
  if (!parts?.length) {
    var reason = json?.candidates?.[0]?.finishReason || "unknown";
    throw new Error("no audio parts (finishReason=" + reason + ")");
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

const tasks = [
  { phrase: "سعيد", alt: "أنا سعيد", out: "data/audio/emotions/ar/happy.wav" },
  { phrase: "حزين", alt: "أنا حزين", out: "data/audio/emotions/ar/sad.wav" },
  { phrase: "نعسان", alt: "أنا نعسان", out: "data/audio/emotions/ar/sleepy.wav" },
  { phrase: "الشمس", alt: "هذه الشمس", out: "data/audio/space/ar/sun.wav" },
  { phrase: "القمر", alt: "هذا القمر", out: "data/audio/space/ar/moon.wav" },
  { phrase: "غسل الوجه", alt: "اغسل وجهك", out: "data/audio/routine/ar/wash.wav" },
  { phrase: "الإفطار", alt: "وقت الفطور", out: "data/audio/routine/ar/breakfast.wav" },
  { phrase: "المدرسة", alt: "أذهب للمدرسة", out: "data/audio/routine/ar/school.wav" },
  { phrase: "النوم", alt: "وقت النوم", out: "data/audio/routine/ar/sleep.wav" },
];

const models = [
  process.env.GEMINI_TTS_MODEL || "gemini-2.5-pro-preview-tts",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];
const voices = ["Leda", "Kore", "Aoede", "Puck"];

async function main() {
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    console.error("GEMINI_API_KEY missing");
    process.exit(1);
  }

  var ok = 0;
  for (const task of tasks) {
    const outPath = path.join(ROOT, task.out);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
      console.log("[skip] " + task.out);
      ok++;
      continue;
    }

    var done = false;
    for (const model of models) {
      if (done) break;
      for (const voice of voices) {
        if (done) break;
        for (const text of [task.phrase, task.alt]) {
          const prompts = [
            "[warmly, clearly, youthful Arabic speaker]: " + text,
            "Say this Arabic word clearly for children: " + text,
            text,
          ];
          for (const prompt of prompts) {
            try {
              console.log(`try ${task.out} | ${model} | ${voice} | "${text}"`);
              await generateOne(apiKey, model, voice, prompt, outPath);
              console.log("  OK");
              done = true;
              ok++;
              break;
            } catch (e) {
              console.log("  fail:", e.message);
              await sleep(400);
            }
          }
          if (done) break;
        }
      }
    }
    if (!done) console.error("FAILED:", task.out);
    await sleep(500);
  }
  console.log(`Done: ${ok}/${tasks.length} files present`);
}

main();
