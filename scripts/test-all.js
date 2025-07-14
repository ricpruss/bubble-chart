#!/usr/bin/env node

/**
 * Unified test runner: smoke → unit → integration
 * Produces single colour-coded summary with durations.
 */

import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

function extractCounts(output) {
  // Jest summary e.g. "Tests:       86 passed, 86 total"
  const jestMatch = output.match(/Tests:\s+(\d+)\s+passed[,\s]+(\d+)\s+total/);
  if (jestMatch) {
    return { passed: Number(jestMatch[1]), total: Number(jestMatch[2]) };
  }

  // Smoke script summary
  const smokeMatch = output.match(/Results:\s+(\d+)\/(\d+) tests passed/);
  if (smokeMatch) {
    return { passed: Number(smokeMatch[1]), total: Number(smokeMatch[2]) };
  }

  // Integration script summary lines
  const integMatch = output.match(/Results:\s+(\d+)\/(\d+) passed/);
  if (integMatch) {
    return { passed: Number(integMatch[1]), total: Number(integMatch[2]) };
  }

  return null;
}

function run(cmd, label) {
  const start = performance.now();
  const parts = cmd.split(' ');
  const proc = spawnSync(parts[0], parts.slice(1), { encoding: 'utf8' });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  const dur = ((performance.now() - start) / 1000).toFixed(2);
  const combined = (proc.stdout ?? '') + (proc.stderr ?? '');
  const counts = extractCounts(combined);
  return { label, ok: proc.status === 0, dur, counts };
}

const results = [
  run('node scripts/smoke-test.js', 'smoke'),
  run('npx jest --forceExit --detectOpenHandles', 'unit'),
  run('node scripts/test-integration.js', 'integration')
];

console.log('\n── Test Summary ───────────────────────────');
results.forEach(r => {
  const status = r.ok ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m';
  const countsStr = r.counts ? ` ${r.counts.passed}/${r.counts.total}` : '';
  console.log(`${status}  ${r.label.padEnd(12)} (${r.dur}s)${countsStr}`);
});

const failed = results.filter(r => !r.ok);
if (failed.length) {
  console.log(`\n${failed.length} stage(s) failed.`);
  process.exit(1);
}

const totalTests = results.reduce((sum, r) => sum + (r.counts?.total ?? 0), 0);
const passedTests = results.reduce((sum, r) => sum + (r.counts?.passed ?? 0), 0);
if (totalTests) {
  console.log(`\nOverall: ${passedTests}/${totalTests} passed`);
}
console.log('\nAll stages passed\n'); 