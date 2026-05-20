/**
 * Builds js/config.local.js from kitty-learn/.env (and merges any existing keys in config.local.js).
 * Run after `npm install` or whenever you rotate the ElevenLabs key: npm run setup
 *
 * .env vars (optional except key):
 *   ELEVENLABS_API_KEY=sk_...
 *   ELEVENLABS_VOICE_EN=voiceId    (kid-friendly EN default baked in below if omitted)
 *   ELEVENLABS_VOICE_AR=voiceId     (Arabic multilingual default if omitted)
 *   ELEVENLABS_VOICE_ID=voiceId      (fallback: used for BOTH if *_EN/_AR omitted)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Freya · young American, multilingual eleven_multilingual_v2 */
const FALLBACK_VOICE_EN = "jsCqWAovK2LkecY7zXl4";
/** Sarah / Bella · multilingual, strong Arabic + English clarity */
const FALLBACK_VOICE_AR = "EXAVITQu4vr4xnSDxMaL";

function loadDotEnv() {
  var p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return {};
  var out = {};
  fs.readFileSync(p, "utf8")
    .split(/\r?\n/)
    .forEach(function (line) {
      var t = line.trim();
      if (!t || t.indexOf("#") === 0) return;
      var m = /^([^#=]+)=(.*)$/.exec(t);
      if (!m) return;
      var k = m[1].trim();
      var v = m[2].trim().replace(/^["']|["']$/g, "");
      out[k] = v;
    });
  return out;
}

function readJsConfigLocals() {
  var p = path.join(ROOT, "js", "config.local.js");
  if (!fs.existsSync(p)) return { apiKey: "", voiceEn: "", voiceAr: "" };
  var t = fs.readFileSync(p, "utf8");
  function grab(re) {
    var m = re.exec(t);
    return m && m[1] ? m[1].trim() : "";
  }
  return {
    apiKey: grab(/KITTY_ELEVENLABS_API_KEY\s*=\s*["']([^"']*)["']/),
    voiceEn: grab(/KITTY_ELEVENLABS_VOICE_EN\s*=\s*["']([^"']*)["']/),
    voiceAr: grab(/KITTY_ELEVENLABS_VOICE_AR\s*=\s*["']([^"']*)["']/),
  };
}

function writeConfig(apiKey, voiceEn, voiceAr) {
  var outPath = path.join(ROOT, "js", "config.local.js");
  var banner =
    "/**\n * Auto-generated · run `npm run setup` after editing kitty-learn/.env\n" +
    " * Do not commit (see repo .gitignore).\n" +
    " */\n";
  var body =
    "window.KITTY_ELEVENLABS_API_KEY = " +
    JSON.stringify(apiKey || "") +
    ";\n" +
    "window.KITTY_ELEVENLABS_VOICE_EN = " +
    JSON.stringify(voiceEn || FALLBACK_VOICE_EN) +
    ";\n" +
    "window.KITTY_ELEVENLABS_VOICE_AR = " +
    JSON.stringify(voiceAr || FALLBACK_VOICE_AR) +
    ";\n";
  fs.writeFileSync(outPath, banner + body, "utf8");
  console.log("[kitty-learn] Updated", path.relative(process.cwd(), outPath));
}

function main() {
  var env = loadDotEnv();
  var prev = readJsConfigLocals();

  var apiKey =
    String(env.ELEVENLABS_API_KEY || env.XI_API_KEY || "").trim() ||
    (prev.apiKey && !/PASTE_YOUR|YOUR_API_KEY|^$/i.test(prev.apiKey) ? prev.apiKey : "");

  var both = String(env.ELEVENLABS_VOICE_ID || "").trim();
  var vEn =
    String(env.ELEVENLABS_VOICE_EN || "").trim() || (both ? both : "") || FALLBACK_VOICE_EN;
  var vAr =
    String(env.ELEVENLABS_VOICE_AR || "").trim() || (both ? both : "") || FALLBACK_VOICE_AR;

  writeConfig(apiKey, vEn, vAr);

  if (!apiKey || apiKey.length < 16) {
    console.warn(
      "[kitty-learn] Warning: missing ELEVENLABS_API_KEY in .env — put your xi-api-key there, then run npm run setup again."
    );
  }
}

main();
