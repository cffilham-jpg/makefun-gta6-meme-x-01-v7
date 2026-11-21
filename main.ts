// gta6-meme-x-01 entry: hand POST.json to the gate.
//
// The entry itself is the X post named in POST.json: a GTA 6 meme
// ("PAYMENT RECEIPT — 13 YEARS OF RENT") posted from a public X
// account with make.fun and the entrant's play code in its text.
// The house reads the post from X and judges its first picture and
// its text. Nothing this program writes is judged; its only job is
// to deliver POST.json, byte for byte, to the output directory
// where the sealed gate reads it.
//
// This copy validates before it writes, so a malformed POST.json
// fails loudly here instead of silently scoring valid 0:
//   - the file must exist and be at most 16,384 bytes
//   - it must parse as a JSON object with a string `url`
//   - the url must be an X post address:
//     https://x.com/<handle>/status/<digits>
//     (twitter.com, www./mobile. prefixes and /i/web/status/ also read)
//
// Outside the grader, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand
// in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAX_POST_BYTES = 16384;
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// An X post address: x.com or twitter.com, optional www./mobile.,
// /status/, /statuses/ or /i/web/status/, then digits only. A query
// or fragment after the id is read past by the gate, so it is
// allowed here too. The gate reads the id as digits under 2^64,
// so the match captures the id for a bounds check below.
const X_POST_URL =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/(status|statuses|i\/web\/status)\/(\d+)([?#].*)?$/;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const sourcePath = join(BOT_DIR, "POST.json");
let raw: Buffer;
try {
  raw = readFileSync(sourcePath);
} catch (err) {
  fail(`could not read ${sourcePath}: ${(err as Error).message}`);
}

if (raw.length > MAX_POST_BYTES) {
  fail(`POST.json is ${raw.length} bytes, over the ${MAX_POST_BYTES}-byte cap`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw.toString("utf8"));
} catch (err) {
  fail(`POST.json is not valid JSON: ${(err as Error).message}`);
}

if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
  fail("POST.json must be a JSON object");
}
const url = (parsed as Record<string, unknown>).url;
if (typeof url !== "string") {
  fail(`POST.json url is not a string: ${JSON.stringify(url)}`);
}
const match = X_POST_URL.exec(url.trim());
if (match === null) {
  fail(`POST.json url is not an X post address: ${JSON.stringify(url)}`);
}
// The gate reads the id as digits under 2^64; refuse anything at
// or above it rather than letting it through to score valid 0.
if (BigInt(match[5]) >= 1n << 64n) {
  fail(`POST.json status id is not under 2^64: ${match[5]}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const destPath = join(OUTPUT_DIR, "POST.json");
try {
  writeFileSync(destPath, raw);
} catch (err) {
  fail(`could not write ${destPath}: ${(err as Error).message}`);
}
console.log(
  `main.ts: wrote ${raw.length} bytes to ${destPath} (status ${match[5]})`,
);
