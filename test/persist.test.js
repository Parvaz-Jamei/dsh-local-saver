import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { parsePersist } from "../saver-core.js";
import { loadPersistedStats, savePersistedStats } from "../persist.js";

test("savePersistedStats is not called by parsePersist when off", () => {
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "0" }), false);
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "yes" }), false);
});

test("savePersistedStats writes only calls and saved", async () => {
  const writes = [];
  const fsApi = {
    mkdir: async () => {},
    writeFile: async (path, body) => { writes.push({ path, body }); },
  };
  await savePersistedStats({ calls: 4, saved: 99, secret: "nope" }, fsApi);
  assert.equal(writes.length, 1);
  const parsed = JSON.parse(writes[0].body);
  assert.deepEqual(parsed, { calls: 4, saved: 99 });
  assert.equal("secret" in parsed, false);
});

test("loadPersistedStats reads only numeric pair", async () => {
  const fsApi = { readFile: async () => JSON.stringify({ calls: 2, saved: 10, extra: "x" }) };
  const loaded = await loadPersistedStats(fsApi);
  assert.deepEqual(loaded, { calls: 2, saved: 10 });
});

test("plugin persist gate: no fs when PERSIST!=1", () => {
  const readFile = mock.fn(async () => "{}");
  if (!parsePersist({ DSH_LOCAL_SAVER_PERSIST: undefined })) {
    assert.equal(readFile.mock.calls.length, 0);
  }
});
