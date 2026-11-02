/**
 * `haikrew digest <transcript>`: one JSON line summing up a subagent transcript of any size. The mod cannot read a file
 * over 4 MiB, and its process output has the same cap, so this streams the file line by line and prints only what recording
 * the run needs.
 */
import { createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { isObject } from "./mod/api.ts";
import { digestScan, emptyScan, scanEntry } from "./mod/ledger.ts";
import type { TranscriptDigest } from "./mod/ledger.ts";

/** The digest of the JSONL file at `path`. Lines that are not JSON objects are skipped. Throws when the file cannot be read. */
export async function digestFile(path: string): Promise<TranscriptDigest> {
  statSync(path); // readline does not surface a stream's open error
  const scan = emptyScan();
  let idx = 0;
  for await (const line of createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity })) {
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a partly written line
    }
    if (isObject(entry)) scanEntry(scan, entry, idx++);
  }
  return digestScan(scan);
}

/** Prints the digest of `path`. Resolves to the exit code. */
export async function digestCmd(path: string): Promise<number> {
  try {
    process.stdout.write(`${JSON.stringify(await digestFile(path))}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`haikrew digest: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}
