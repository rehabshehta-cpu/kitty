/**
 * يولّد ملفات صوت WAV لصفحة كلمات العيلة عبر Gemini Native TTS — نفس تقنية
 * "Generate speech" و Voice Library في Google AI Studio (ليست أصوات المتصفح).
 *
 * اختاري الصوت من AI Studio ثم انسخي اسم الصوت الإنجليزي (مثل Leda، Kore، Puck)
 * إلى الحقل "ttsVoice" في data/family-words.json.
 * https://aistudio.google.com/generate-speech
 * https://aistudio.google.com/apps/bundled/voice-library
 *
 * المفتاح في kitty-learn/.env فقط:
 *   GEMINI_API_KEY=...
 *
 * تشغيل (من مجلد kitty-learn):
 *   node scripts/generate-gemini-tts.mjs
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

async function generateOne(apiKey, model, voiceName, phrase, outPath) {
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  var prompt =
    "[warmly, clearly, youthful Arabic speaker]: " + phrase;

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

async function main() {
  var apiKey = process.env.GEMINI_API_KEY;
  var model =
    process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";

  if (!apiKey || !String(apiKey).trim()) {
    console.error("ضعي GEMINI_API_KEY في ملف kitty-learn/.env (انظري .env.example).");
    console.error("لا تشاركي المفتاح علنًا ولا ترفعيه على Git.");
    process.exit(1);
  }

  var manifestPath = path.join(ROOT, "data", "family-words.json");
  var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  var voiceName = manifest.ttsVoice || "Leda";
  var items = manifest.items || [];

  fs.mkdirSync(path.join(ROOT, "data", "audio"), { recursive: true });

  console.log("النموذج:", model, "| الصوت:", voiceName, "| عدد العبارات:", items.length);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var rel = item.audio || "data/audio/" + item.id + ".wav";
    var outPath = path.join(ROOT, rel.replace(/^\/+/, ""));
    console.log("[" + (i + 1) + "/" + items.length + "] " + item.phrase + " → " + rel);
    try {
      await generateOne(apiKey, model, voiceName, item.phrase, outPath);
    } catch (e) {
      console.error("فشل:", item.id, e.message || e);
      process.exitCode = 1;
      break;
    }
    await sleep(900);
  }

  if (!process.exitCode) {
    console.log("تم حفظ الملفات تحت data/audio/");
  }
}

main();
