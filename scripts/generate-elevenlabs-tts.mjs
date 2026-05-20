/**
 * توليد صوت ElevenLabs → ملف MP3 محلي، يشتغله المتصفح بـ KittyLearn.tryPlaySpeech (انظري kitty-learn-core.js).
 *
 * ── إعداد (مرة واحدة) ───────────────────────────────────────────────────────
 * 1) انسخي .env.example إلى kitty-learn/.env
 * 2) ضعي ELEVENLABS_API_KEY (من elevenlabs.io → Profile → API Keys)
 * 3) Voice ID: إمّا ELEVENLABS_VOICE_ID في .env أو elevenlabsVoice في الـ manifest (مثل family-words.json)
 *    لنفس الصوت العربي اللي في المتصفح استخدمي نفس قيمة KITTY_ELEVENLABS_VOICE_AR في config.local.js
 * 4) اختياري: ELEVENLABS_MODEL_ID (افتراضي eleven_multilingual_v2)
 *
 * ── مرآة التصدير ──────────────────────────────────────────────────────────────
 * تُكتب نسخ مطابقة تحت outputs/tts/elevenlabs/‎ (خصِّصي مسارًا بـ KITTY_TTS_OUTPUT_DIR).
 *
 * ── توليد كل المقاطع من data/family-words.json ───────────────────────────────
 *   npm run tts:eleven
 *   npm run tts:eleven:keep       # بدون حذف mp3/wav القديم والمرآة
 *
 * ── كل المولّدات (ElevenLabs + Gemini حسب المتاح / والتفضيل) ─────────────────
 *   npm run tts
 *
 * ── مقطع واحد فقط ────────────────────────────────────────────────────────────
 *   node scripts/generate-elevenlabs-tts.mjs --phrase "النص بالعربي" --out data/audio/اسم-الملف.mp3
 *
 * بعد تشغيل الدفعة: يحدّث data/family-words.json لتُطابق data/audio/<id>.mp3 ثم data/family-words.js من الـ JSON.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadDotEnv,
  kittyRoot,
  sleep,
  writeOutputsMirror,
  cleanOutputsProvider,
  normalizeFamilyAudioManifest,
  persistFamilyManifest,
  syncFamilyWordsJs,
  appendRunManifest,
} from "./tts-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = kittyRoot(__dirname);

const NO_CLEAN = process.argv.includes("--no-clean");
const PROVIDER_SLUG = "elevenlabs";

const DEFAULT_VOICE_SETTINGS = {
  stability: 0.38,
  similarity_boost: 0.88,
  style: 0.42,
  use_speaker_boost: true,
};

/** Optional JSON override in-process env ELEVENLABS_VOICE_SETTINGS as JSON object */
function effectiveVoiceSettings() {
  var raw = (process.env.ELEVENLABS_VOICE_SETTINGS || "").trim();
  if (!raw) return DEFAULT_VOICE_SETTINGS;
  try {
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        stability: typeof parsed.stability === "number" ? parsed.stability : DEFAULT_VOICE_SETTINGS.stability,
        similarity_boost:
          typeof parsed.similarity_boost === "number"
            ? parsed.similarity_boost
            : DEFAULT_VOICE_SETTINGS.similarity_boost,
        style: typeof parsed.style === "number" ? parsed.style : DEFAULT_VOICE_SETTINGS.style,
        use_speaker_boost:
          typeof parsed.use_speaker_boost === "boolean"
            ? parsed.use_speaker_boost
            : DEFAULT_VOICE_SETTINGS.use_speaker_boost,
      };
    }
  } catch (e) {
    console.warn("[elevenlabs-tts] ELEVENLABS_VOICE_SETTINGS ليست JSON صالحة — نستخدم الإعدادات الافتراضية.");
  }
  return DEFAULT_VOICE_SETTINGS;
}

function modelIdResolved() {
  var m = String(process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2").trim();
  return m || "eleven_multilingual_v2";
}

const API_BASE = "https://api.elevenlabs.io";

const DEFAULT_FAMILY_MANIFEST = path.join(ROOT, "data", "family-words.json");

function parseOneOffArgs() {
  var phrase = null;
  var outRel = null;
  var i;
  for (i = 2; i < process.argv.length; i++) {
    var a = process.argv[i];
    if (a === "--phrase" && process.argv[i + 1]) {
      phrase = process.argv[++i];
    } else if (a === "--out" && process.argv[i + 1]) {
      outRel = process.argv[++i];
    }
  }
  if (phrase && outRel) return { phrase: phrase, outRel: outRel };
  if (phrase || outRel) {
    console.error("للمقطع الواحد لازم الاثنين: --phrase \"...\" --out data/audio/example.mp3");
    process.exit(1);
  }
  return null;
}

function cleanGeneratedAudio() {
  var dir = path.join(ROOT, "data", "audio");
  fs.mkdirSync(dir, { recursive: true });
  var names = fs.readdirSync(dir);
  var removed = 0;
  names.forEach(function (name) {
    if (!/\.(wav|mp3)$/i.test(name)) return;
    fs.unlinkSync(path.join(dir, name));
    removed++;
  });
  if (removed) console.log("حُذف " + removed + " ملف صوتي قديم من data/audio/");
}

function resolveVoiceId(manifest) {
  var fromEnv = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (manifest && manifest.elevenlabsVoice) {
    var v = String(manifest.elevenlabsVoice).trim();
    if (v) return v;
  }
  return "";
}

function readManifestIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return {};
  }
}

async function generateOne(apiKey, voiceId, phrase, outPath, modelId) {
  var url =
    API_BASE +
    "/v1/text-to-speech/" +
    encodeURIComponent(voiceId) +
    "?output_format=mp3_44100_128";

  var res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: String(phrase).slice(0, 2500),
      model_id: modelId,
      voice_settings: effectiveVoiceSettings(),
    }),
  });

  var errBody = "";
  if (!res.ok) {
    try {
      errBody = (await res.text()).slice(0, 280);
    } catch (e) {}
    throw new Error("ElevenLabs HTTP " + res.status + ": " + (errBody || res.statusText));
  }

  var buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  writeOutputsMirror(PROVIDER_SLUG, ROOT, outPath, buf, [
    "voice_id=" + voiceId,
    "model=" + modelId,
    "phrase_preview=" + String(phrase).slice(0, 80),
  ]);
}

async function runOneOff(phrase, outRel) {
  loadDotEnv(ROOT);
  var apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
  var manifest = readManifestIfExists(DEFAULT_FAMILY_MANIFEST);
  var voiceId = resolveVoiceId(manifest);
  var modelId = modelIdResolved();

  if (!apiKey) {
    console.error("ضعي ELEVENLABS_API_KEY في kitty-learn/.env (انظري .env.example).");
    process.exit(1);
  }
  if (!voiceId) {
    console.error(
      "حدّدي Voice ID: ELEVENLABS_VOICE_ID في .env أو elevenlabsVoice في data/family-words.json"
    );
    process.exit(1);
  }

  var outPath = path.join(ROOT, outRel.replace(/^\/+/, "").replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  console.log("مقطع واحد →", outRel);
  console.log("النموذج:", modelId, "| الصوت:", voiceId);
  await generateOne(apiKey, voiceId, phrase, outPath, modelId);
  console.log("تم الحفظ:", outPath);
}

async function runFamilyBatch() {
  loadDotEnv(ROOT);
  var apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
  var manifestPath = DEFAULT_FAMILY_MANIFEST;
  var manifest = readManifestIfExists(manifestPath);
  if (!Object.keys(manifest).length) {
    console.error("ملف الـ manifest غير موجود أو تالف:", manifestPath);
    process.exit(1);
  }

  var voiceId = resolveVoiceId(manifest);

  if (!apiKey) {
    console.error("ضعي ELEVENLABS_API_KEY في kitty-learn/.env (انظري .env.example).");
    process.exit(1);
  }
  if (!voiceId) {
    console.error(
      "حدّدي صوتًا: elevenlabsVoice في family-words.json أو ELEVENLABS_VOICE_ID في .env (Voice ID من لوحة ElevenLabs)."
    );
    process.exit(1);
  }

  normalizeFamilyAudioManifest(manifest, "mp3");
  persistFamilyManifest(ROOT, manifest);

  var modelId = modelIdResolved();

  var items = manifest.items || [];

  fs.mkdirSync(path.join(ROOT, "data", "audio"), { recursive: true });
  if (!NO_CLEAN) {
    cleanGeneratedAudio();
    cleanOutputsProvider(PROVIDER_SLUG, ROOT);
  }

  console.log("النموذج:", modelId);
  console.log("الصوت (Voice ID):", voiceId);
  console.log("عدد العبارات:", items.length);

  var failures = [];
  var successes = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var rel = item.audio || "data/audio/" + item.id + ".mp3";
    var outPath = path.join(ROOT, rel.replace(/^\/+/, "").replace(/\//g, path.sep));
    console.log("[" + (i + 1) + "/" + items.length + "] " + item.phrase + " → " + rel);
    try {
      await generateOne(apiKey, voiceId, item.phrase, outPath, modelId);
      successes.push(rel);
    } catch (e) {
      console.error("  فشل:", item.id, "-", e.message || e);
      failures.push(item.id);
    }
    await sleep(850);
  }

  var runLines = [];
  runLines.push("ts=" + new Date().toISOString());
  runLines.push("provider=" + PROVIDER_SLUG);
  runLines.push("model=" + modelId);
  runLines.push("voice_id=" + voiceId);
  runLines.push("ok=" + successes.length + " fail=" + failures.length);
  successes.forEach(function (r) {
    runLines.push("+ " + r);
  });
  failures.forEach(function (fid) {
    runLines.push("! id=" + fid);
  });
  appendRunManifest(PROVIDER_SLUG, ROOT, runLines);

  if (failures.length) {
    console.error("انتهى بأخطاء على:", failures.join(", "));
    process.exit(1);
  }

  persistFamilyManifest(ROOT, manifest);
  syncFamilyWordsJs(
    ROOT,
    manifest,
    "Auto-synced from family-words.json by scripts/generate-elevenlabs-tts.mjs"
  );
  console.log("تم حفظ كل الملفات تحت data/audio/ ونسخًا تحت outputs/tts/elevenlabs/");
}

async function main() {
  var oneOff = parseOneOffArgs();
  if (oneOff) {
    await runOneOff(oneOff.phrase, oneOff.outRel);
    return;
  }

  await runFamilyBatch();
}

main();
