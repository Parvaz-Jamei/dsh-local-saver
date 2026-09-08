const KEEP = /FAIL|FAILED|ERROR|Error|Assertion|Traceback|panic:|not ok |FAILED\s|FAILED\)|×|✖|wasm-bindgen|undefined reference/i;
const SUMMARY = /passed|failed|skipped|errors?|failures?|ok \d+|Ran \d+|test result:|Tests:\s|FAIL\s+\d+|PASS\s+\d+/i;
const PASS_LINE = /^(ok |✓|PASS |PASSED |\s*test .* \.\.\. ok)/i;

export function testRunner(input) {
  const lines = String(input).split("\n");
  const kept = [];
  let passed = 0;
  let failed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (KEEP.test(line)) {
      failed += 1;
      kept.push(line);
      continue;
    }
    if (SUMMARY.test(line)) {
      kept.push(line);
      continue;
    }
    if (PASS_LINE.test(t) || /\.\.\. ok$/.test(t) || /PASSED/.test(t)) {
      passed += 1;
      continue;
    }
  }
  const head = `tests kept=${kept.length} passed_dropped=${passed}`;
  return [head, ...kept.slice(0, 80)].join("\n") || input;
}

testRunner.filterName = "test-runner";
