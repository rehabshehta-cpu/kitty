/**
 * Shared helpers for Kitty Learn offline TTS batch scripts (Gemini · ElevenLabs).
 */

import fs from "fs";
import path from "path";

export function kittyRoot(fromDirname) {
  return path.join(fromDirname, "..");
}

/**
 * Loads kitty-learn/.env into process.env (does not overwrite non-empty shell env values).
 */
export function loadDotEnv(root) {
  var p = path.join(root, ".env");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach(function (line) {
    var t = line.trim();
    if (!t || t.indexOf("#") === 0) return;
    var m = /^([^#=]+)=(.*)$/.exec(t);
    if (!m) return;
    var k = m[1].trim();
    var v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined || process.env[k] === "") process.env[k] = v;
  });
}

export function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export function pcm16MonoToWav(pcm, sampleRate, channels, bitsPerSample) {
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

/** Default under kitty-learn/: outputs/tts/<provider>/... */
export function resolveOutputsExportDir(root, providerSlug) {
  var custom = String(process.env.KITTY_TTS_OUTPUT_DIR || "").trim().replace(/^["']|["']$/g, "");
  var base = custom ? path.join(root, custom) : path.join(root, "outputs", "tts");
  return path.join(base, providerSlug);
}

export function posixRel(fromRootAbs, absPath) {
  return path.relative(fromRootAbs, absPath).split(path.sep).join("/");
}

/**
 * Mirrors the deployed audio file buffer into outputs (full tree under exportDir).
 */
export function writeOutputsMirror(providerSlug, root, deployAbsPath, buf, metaLines) {
  var exportRoot = resolveOutputsExportDir(root, providerSlug);
  var rel = posixRel(root, deployAbsPath);
  var outMirror = path.join(exportRoot, rel.split("/").join(path.sep));
  fs.mkdirSync(path.dirname(outMirror), { recursive: true });
  fs.writeFileSync(outMirror, buf);

  var sidecarLines = [];
  sidecarLines.push("# Kitty Learn — automatic TTS export mirror");
  sidecarLines.push("# provider: " + providerSlug);
  sidecarLines.push("# deploy: " + rel);
  if (metaLines && metaLines.length) {
    metaLines.forEach(function (ln) {
      sidecarLines.push("# " + ln);
    });
  }
  fs.writeFileSync(outMirror + ".meta.txt", sidecarLines.join("\n") + "\n", "utf8");
}

export function cleanOutputsProvider(providerSlug, root) {
  var dir = resolveOutputsExportDir(root, providerSlug);
  if (!fs.existsSync(dir)) return;
  var names = fs.readdirSync(dir);
  names.forEach(function (name) {
    var fp = path.join(dir, name);
    var stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      fs.rmSync(fp, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fp);
    }
  });
}

/**
 * Normalize every item.audio to data/audio/<id>.<ext> (forward slashes).
 */
export function normalizeFamilyAudioManifest(manifest, ext) {
  if (!manifest || !manifest.items || !manifest.items.length) return;
  ext = ext.indexOf(".") === 0 ? ext : "." + ext;
  manifest.items.forEach(function (item) {
    if (!item.id) return;
    item.audio = "data/audio/" + item.id + ext;
  });
}

export function persistFamilyManifest(root, manifest) {
  var manifestPath = path.join(root, "data", "family-words.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export function syncFamilyWordsJs(root, manifest, syncedByComment) {
  var jsPath = path.join(root, "data", "family-words.js");
  var text = [
    "/* " + syncedByComment + " */",
    "window.__KITTY_FAMILY_WORDS__ = " + JSON.stringify(manifest, null, 2) + ";",
    "",
  ].join("\n");
  fs.writeFileSync(jsPath, text, "utf8");
}

export function appendRunManifest(providerSlug, root, lines) {
  var runDir = path.join(resolveOutputsExportDir(root, "_runs"));
  fs.mkdirSync(runDir, { recursive: true });
  var name = providerSlug + "-batch-" + String(new Date().toISOString()).replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z") + ".txt";
  fs.writeFileSync(path.join(runDir, name), lines.join("\n") + "\n", "utf8");
}
