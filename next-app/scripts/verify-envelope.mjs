#!/usr/bin/env node

/**
 * Verify envelope API response structure and data completeness.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/verify-envelope.mjs
 *   BASE_URL=https://study.jimmyyao.com node scripts/verify-envelope.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VERIFY_LESSONS = process.env.LESSONS
  ? process.env.LESSONS.split(',').map(Number)
  : [1, 3, 25];

async function fetchEnvelope(lessonNo) {
  const url = `${BASE_URL}/api/v1/lessons/${lessonNo}/envelope`;
  const res = await fetch(url);
  const body = await res.json();
  return { status: res.status, body, url };
}

function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function verifyLesson(lessonNo) {
  console.log(`\n--- Lesson ${lessonNo} ---`);

  const { status, body, url } = await fetchEnvelope(lessonNo);
  console.log(`  GET ${url} → ${status}`);

  check(status === 200, `Expected 200, got ${status}`);

  const envelope = body.envelope ?? body;
  check(envelope.lesson != null, 'envelope.lesson missing');
  check(Array.isArray(envelope.summaries), 'envelope.summaries not an array');
  check(envelope.summaries.length > 0, 'envelope.summaries empty');
  check(envelope.simulation != null, 'envelope.simulation missing');
  check(envelope.meta != null, 'envelope.meta missing');

  // Simulation fields
  const sim = envelope.simulation;
  check(sim.scene != null, 'simulation.scene missing');
  check(Array.isArray(sim.characters) && sim.characters.length > 0, 'simulation.characters empty');
  check(Array.isArray(sim.nodes) && sim.nodes.length > 0, 'simulation.nodes empty');
  check(sim.learnerStates != null && Object.keys(sim.learnerStates).length > 0, 'simulation.learnerStates empty/missing');
  check(sim.redirectPolicy != null, 'simulation.redirectPolicy missing');
  check(sim.observationSchema != null, 'simulation.observationSchema missing');
  check(sim.quality != null, 'simulation.quality missing');

  // Node hints & completion
  let hintsCount = 0;
  let completionCount = 0;
  for (const node of sim.nodes) {
    if (node.hints) hintsCount++;
    if (node.completion) completionCount++;
  }
  console.log(`  Nodes: ${sim.nodes.length}, with hints: ${hintsCount}, with completion: ${completionCount}`);

  // Has at least one image URL
  console.log(`  conversationImageUrl: ${envelope.conversationImageUrl ? 'YES' : 'NO'}`);
  console.log(`  audioUrls: ${Object.keys(envelope.audioUrls ?? {}).length}`);
  console.log(`  summaries: ${envelope.summaries.length}`);
  console.log(`  learnerStates: ${Object.keys(sim.learnerStates).join(', ')}`);

  return true;
}

async function main() {
  console.log(`Verifying envelope API at ${BASE_URL}`);
  let passed = 0;
  let failed = 0;

  for (const lessonNo of VERIFY_LESSONS) {
    try {
      await verifyLesson(lessonNo);
      passed++;
      console.log(`  ✓ Lesson ${lessonNo} PASSED`);
    } catch (err) {
      failed++;
      console.error(`  ✗ Lesson ${lessonNo}: ${err.message}`);
    }
  }

  console.log(`\n==========`);
  console.log(`Result: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
