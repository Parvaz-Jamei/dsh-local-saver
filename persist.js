import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export function statsFilePath(home = process.env.DSH_HOME || join(homedir(), ".dsh")) {
  return join(home, "local-saver-stats.json");
}

export async function loadPersistedStats(fsApi = { readFile }) {
  try {
    const raw = await fsApi.readFile(statsFilePath(), "utf8");
    const data = JSON.parse(raw);
    return {
      calls: Number(data.calls) || 0,
      saved: Number(data.saved) || 0,
      charsBefore: Number(data.charsBefore) || 0,
      charsAfter: Number(data.charsAfter) || 0,
    };
  } catch {
    return { calls: 0, saved: 0, charsBefore: 0, charsAfter: 0 };
  }
}

export async function savePersistedStats(stats, fsApi = { mkdir, writeFile }) {
  const dir = process.env.DSH_HOME || join(homedir(), ".dsh");
  await fsApi.mkdir(dir, { recursive: true });
  const payload = JSON.stringify({
    calls: Number(stats.calls) || 0,
    saved: Number(stats.saved) || 0,
    charsBefore: Number(stats.charsBefore) || 0,
    charsAfter: Number(stats.charsAfter) || 0,
  });
  await fsApi.writeFile(statsFilePath(), payload, "utf8");
}
