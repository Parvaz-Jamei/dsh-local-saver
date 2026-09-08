import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadPersistedStats, savePersistedStats, statsFilePath } from "../persist.js";
import { homedir } from "node:os";
import { join } from "node:path";

function parsePersist(env = {}) {
  return String(env.DSH_LOCAL_SAVER_PERSIST ?? "").trim() === "1";
}

test("savePersistedStats is not called by parsePersist when off", () => {
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "0" }), false);
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "yes" }), false);
});

test("savePersistedStats writes only calls and saved", async () => {
  const writes = [];
  const fsApi = {
    mkdir: async () => {},
    writeFile: async (path, body) => {
      writes.push({ path, body });
    },
  };
  await savePersistedStats({ calls: 4, saved: 99, secret: "nope" }, fsApi);
  assert.equal(writes.length, 1);
  const parsed = JSON.parse(writes[0].body);
  assert.deepEqual(parsed, { calls: 4, saved: 99 });
  assert.equal("secret" in parsed, false);
});

test("loadPersistedStats reads only numeric pair", async () => {
  const fsApi = {
    readFile: async () => JSON.stringify({ calls: 2, saved: 10, extra: "x" }),
  };
  const loaded = await loadPersistedStats(fsApi);
  assert.deepEqual(loaded, { calls: 2, saved: 10 });
});

test("plugin persist gate: no fs when PERSIST!=1", () => {
  const readFile = mock.fn(async () => "{}");
  if (!parsePersist({ DSH_LOCAL_SAVER_PERSIST: undefined })) {
    assert.equal(readFile.mock.calls.length, 0);
  }
});

test("statsFilePath uses os.homedir and path.join", () => {
  const p = statsFilePath();
  assert.ok(p.includes("local-saver-stats.json"));
  assert.ok(p.startsWith(join(homedir(), ".dsh")) || p.includes(".dsh"));
  assert.equal(statsFilePath("/home/me/.dsh"), join("/home/me/.dsh", "local-saver-stats.json"));
  assert.equal(statsFilePath("/Users/me/.dsh"), join("/Users/me/.dsh", "local-saver-stats.json"));
});
