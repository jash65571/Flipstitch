#!/usr/bin/env node
/**
 * Source scan: confirms no network analytics SDK or network call was added.
 *
 * Scans app/ and src/ for third-party analytics SDK imports, advertising
 * identifiers, device fingerprinting, and direct network calls. The local
 * playtest instrumentation is not an analytics SDK and is not flagged.
 *
 * Run: node scripts/scan-analytics.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "src"];
const FORBIDDEN = [
  { pattern: /\b(from|require\()\s*["'](firebase|@firebase)/i, label: "Firebase SDK" },
  { pattern: /\b(from|require\()\s*["'](amplitude|@amplitude)/i, label: "Amplitude SDK" },
  { pattern: /\b(from|require\()\s*["'](mixpanel|mixpanel-react-native)/i, label: "Mixpanel SDK" },
  { pattern: /\b(from|require\()\s*["']@segment/i, label: "Segment SDK" },
  { pattern: /\b(from|require\()\s*["']@sentry/i, label: "Sentry SDK" },
  { pattern: /expo-tracking-transparency/i, label: "Tracking Transparency SDK" },
  { pattern: /expo-device/i, label: "expo-device (device fingerprinting)" },
  { pattern: /react-native-device-info/i, label: "device-info SDK" },
  { pattern: /advertisingid|advertising-id|advertiserid|idfa|gaid|adid/i, label: "advertising identifier" },
  { pattern: /\bfetch\s*\(/i, label: "network fetch call" },
  { pattern: /\baxios\b/i, label: "axios network client" },
  { pattern: /XMLHttpRequest/i, label: "XMLHttpRequest network call" },
  { pattern: /WebSocket\s*\(/i, label: "WebSocket connection" },
  { pattern: /\b(navigator\.sendBeacon|sendBeacon)\b/i, label: "sendBeacon beacon" }
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx") || full.endsWith(".js") || full.endsWith(".mjs")) {
      out.push(full);
    }
  }
  return out;
}

let failures = 0;
for (const dir of SCAN_DIRS) {
  const files = walk(join(ROOT, dir));
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const relative = file.slice(ROOT.length + 1).replace(/\\/g, "/");
    for (const { pattern, label } of FORBIDDEN) {
      const match = content.match(pattern);
      if (match) {
        const line = content.slice(0, match.index).split("\n").length;
        console.error(`FAIL: ${relative}:${line} — ${label} (${match[0].trim()})`);
        failures += 1;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} analytics/network finding(s) in source.`);
  process.exit(1);
}
console.log("No analytics SDK, advertising identifier, device fingerprint, or network call found in app/ and src/.");
