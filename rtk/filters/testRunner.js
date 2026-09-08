const KEEP = /\b(FAIL|FAILED|ERROR|PANIC)\b|AssertionError|Traceback|panic:|not ok |undefined reference|\u00d7|\u2716/i;
const SUMMARY = /^=+|test session starts|test result:|Ran \d+|Tests:\s|\d+ (passed|failed|skipped)|ok \d+ (failed|passed)/i;
const PASS_LINE = /\bPASSED\b|^\s*(ok |\u2713|PASS )|\.\.\. ok$/i;

export function testRunner(input) {
  const lines = String(input).split("\n");
  const kept = [];
  let passed = 0;
  let failed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (PASS_LINE.test(t)) {
      passed += 1;
      continue;
    }
    if (KEEP.test(line)) {
      failed += 1;
      kept.push(line);
      continue;
    }
    if (SUMMARY.test(line)) {
      kept.push(line);
      continue;
    }
  }
  const head = `tests kept=${kept.length} passed_dropped=${passed}`;
  return [head, ...kept.slice(0, 80)].join("\n") || input;
}

testRunner.filterName = "test-runner";
