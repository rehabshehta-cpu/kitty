/**
 * Unified TTS launcher: postinstall (+ optional manual npm run tts).
 * See kitty-learn/.env.example for GEMINI_* / ELEVENLABS_* / KITTY_* flags.
 */

import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { loadDotEnv, kittyRoot } from "./tts-lib.mjs";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var ROOT = kittyRoot(__dirname);
loadDotEnv(ROOT);

var IS_CI =
  !!(process.env.CI && String(process.env.CI).trim() && String(process.env.CI).toLowerCase() !== "false");

function t(name) {
  return String(process.env[name] || "").trim();
}

function run(rel, fwd) {
  fwd = fwd || [];
  var code = spawnSync(process.execPath, [path.join(__dirname, rel), ...fwd], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  }).status;
  var ec = typeof code === "number" ? code : 1;
  if (ec !== 0) process.exit(ec);
}

function preference() {
  var p = (t("KITTY_TTS_PROVIDER") || t("KITTY_TTS_PREFER") || "elevenlabs").toLowerCase();
  return p.indexOf("gemini") === 0 ? "gemini" : "elevenlabs";
}

function splitArgs(argv) {
  var ix = argv.indexOf("--");
  if (ix === -1) return { head: argv, tail: [] };
  return { head: argv.slice(0, ix), tail: argv.slice(ix + 1) };
}

function postinstallGate() {
  var policy = t("KITTY_TTS_ON_INSTALL").toLowerCase();
  var hasGem = !!t("GEMINI_API_KEY");
  var hasEl = !!t("ELEVENLABS_API_KEY");

  if (policy === "off" || policy === "skip" || policy === "none") {
    console.log("[kitty-learn] postinstall: KITTY_TTS_ON_INSTALL=off — skip.");
    return;
  }
  if (IS_CI && policy !== "always" && policy !== "force" && policy !== "on") {
    console.log(
      "[kitty-learn] postinstall: CI detected; set KITTY_TTS_ON_INSTALL=always or run npm run tts locally."
    );
    return;
  }
  if (!hasGem && !hasEl) {
    console.log("[kitty-learn] postinstall: no GEMINI/ELEVENLABS keys — skip.");
    return;
  }
  if (policy === "gemini") {
    if (!hasGem) console.log("[kitty-learn] postinstall: GEMINI_API_KEY missing — skip.");
    else run("generate-gemini-tts.mjs");
    return;
  }
  if (policy === "elevenlabs" || policy === "eleven") {
    if (!hasEl) console.log("[kitty-learn] postinstall: ELEVENLABS_API_KEY missing — skip.");
    else run("generate-elevenlabs-tts.mjs");
    return;
  }
  var pref = preference();
  if (pref === "gemini") {
    if (hasGem) run("generate-gemini-tts.mjs");
    else run("generate-elevenlabs-tts.mjs");
    return;
  }
  if (hasEl) run("generate-elevenlabs-tts.mjs");
  else run("generate-gemini-tts.mjs");
}

function manualGate() {
  var sp = splitArgs(process.argv.slice(2));
  var wantGem = sp.head.indexOf("--gemini-only") !== -1;
  var wantEl = sp.head.indexOf("--eleven-only") !== -1;

  if (wantGem && wantEl) {
    console.error("[kitty-learn] use only one of: --gemini-only | --eleven-only");
    process.exit(1);
  }

  var headNo = sp.head.filter(function (x) {
    return x !== "--gemini-only" && x !== "--eleven-only";
  });

  /** Optional: forwarded args like --no-clean for the child via `npm run tts -- --eleven-only --no-clean`. */
  var fwd = headNo.concat(sp.tail);

  if (wantGem) {
    if (!t("GEMINI_API_KEY")) {
      console.error("[kitty-learn] GEMINI_API_KEY missing.");
      process.exit(1);
    }
    run("generate-gemini-tts.mjs", fwd);
    return;
  }
  if (wantEl) {
    if (!t("ELEVENLABS_API_KEY")) {
      console.error("[kitty-learn] ELEVENLABS_API_KEY missing.");
      process.exit(1);
    }
    run("generate-elevenlabs-tts.mjs", fwd);
    return;
  }

  var hasGem = !!t("GEMINI_API_KEY");
  var hasEl = !!t("ELEVENLABS_API_KEY");
  if (!hasGem && !hasEl) {
    console.error(
      "[kitty-learn] add GEMINI_API_KEY or ELEVENLABS_API_KEY to .env, or npm run tts:gemini / tts:eleven"
    );
    process.exit(1);
  }
  var pref = preference();
  if (pref === "gemini") {
    run("generate-gemini-tts.mjs", fwd);
  } else if (hasEl) {
    run("generate-elevenlabs-tts.mjs", fwd);
  } else run("generate-gemini-tts.mjs", fwd);
}

var life = String(process.env.npm_lifecycle_event || "").trim().toLowerCase();
if (life === "postinstall") postinstallGate();
else manualGate();
