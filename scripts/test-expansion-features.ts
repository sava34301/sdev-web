/**
 * Comprehensive Test Suite for the 5 Expansion Features (`scripts/test-expansion-features.ts`)
 *
 * Tests:
 * 1. In-Browser Hardware Simulator (`src/lang/hardware/simulator.ts`)
 * 2. Time-Travel Visual Debugger (`src/studio/runner.ts` — v1 & v2 Prism + Canvas snapshots)
 * 3. Sub-50MB Pre-Baked WebGPU Speculative Micro-Brain (`src/lang/agent/micro-brain.ts`)
 * 4. WASI 0.2 Component Model Export (`src/lang/wasi-component.ts` + live WebAssembly.instantiate)
 * 5. Multiplayer Classroom & Pair-Programming CRDT Live Rooms (`src/lang/collab/live-room.ts`)
 */

import {
  createHardwareSimState,
  stepHardwareSimulator,
  runHardwareLoopCycle,
} from '../src/lang/hardware/simulator';
import { runStudioCode } from '../src/studio/runner';
import {
  runMicroBrainTranslation,
  callMicroBrain,
  getMicroBrainStats,
  classifyLineIntent,
} from '../src/lang/agent/micro-brain';
import { execute } from '../src/lang';
import { buildWasiComponentBundle } from '../src/lang/runtime/wasi-component';
import {
  CrdtDocument,
  LiveRoomSession,
  generateRoomCode,
} from '../src/lang/collab/live-room';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('=== 1. In-Browser Hardware Simulator Tests ===');
  {
    const blinkSource = `
board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }

  conjure loop() {
    pin 13 write high
    serial println "LED_ON"
    wait 250
    pin 13 write low
    serial println "LED_OFF"
    wait 250
  }
}
`;
    let sim = createHardwareSimState(blinkSource);
    assert(sim.boardId === 'uno', 'Detects Arduino Uno board');
    assert(sim.builtinLedPin === 13, 'Uno built-in LED is pin 13');
    assert(!sim.setupDone, 'Initial state has setupDone = false');

    // Step 1 runs setup()
    sim = stepHardwareSimulator(sim);
    assert(sim.setupDone, 'First step completes setup()');
    assert(sim.pins['13']?.mode === 'OUTPUT', 'Pin 13 configured as OUTPUT');
    assert(sim.baudRate === 9600, 'Serial baud rate configured to 9600');

    // Next step: pin 13 write high
    sim = stepHardwareSimulator(sim);
    assert(sim.pins['13']?.digital === true, 'Pin 13 is HIGH after first loop instruction');

    // Next step: serial println "LED_ON"
    sim = stepHardwareSimulator(sim);
    assert(sim.serialLog.includes('LED_ON'), 'Serial monitor logs LED_ON');

    // Complete rest of loop cycle
    sim = runHardwareLoopCycle(sim);
    assert(sim.elapsedMs >= 500, `Simulated clock advanced (${sim.elapsedMs}ms)`);
    assert(sim.serialLog.includes('LED_OFF'), 'Serial monitor logs LED_OFF');

    // RP2040 peripheral test (Servo + Buzzer + NeoPixel)
    const picoSource = `
board "pico" {
  void setup() {
    myServo.attach(9);
    tone(8, 880);
    strip.setPixelColor(0, 255, 64, 32);
  }
  void loop() {
    myServo.write(135);
    analogWrite(25, 128);
  }
}
`;
    let picoSim = createHardwareSimState(picoSource);
    assert(picoSim.builtinLedPin === 25, 'RP2040 Pico built-in LED is GP25');
    picoSim = runHardwareLoopCycle(picoSim);
    assert(picoSim.servoAngle === 135, `Servo moved to 135° (got ${picoSim.servoAngle})`);
    assert(picoSim.activeToneHz === 880, `Piezo buzzer active at 880 Hz (got ${picoSim.activeToneHz})`);
    assert(
      picoSim.neopixels[0].r === 255 && picoSim.neopixels[0].g === 64,
      'NeoPixel #0 set to RGB(255, 64, 32)'
    );
    assert(picoSim.pins['25']?.pwm === 128, 'GP25 PWM set to 128/255');
  }

  console.log('\n=== 2. Time-Travel Visual Debugger Tests ===');
  {
    const v1Code = `
canvas(200, 200)
forge total be 0
within n be [10, 20, 30] ::
  total be total + n
  circle(total, 100, 15)
  speak(total)
;;
`;
    const resV1 = runStudioCode(v1Code, { runtime: 'v1' });
    assert(resV1.success, 'v1 traced execution succeeds');
    assert(resV1.chrono.length >= 8, `Recorded ${resV1.chrono.length} Chrono time-travel steps`);
    const stepWithTotal10 = resV1.chrono.find((s) => s.variables.total === '10');
    const stepWithTotal30 = resV1.chrono.find((s) => s.variables.total === '30');
    const stepWithTotal60 = resV1.chrono.find((s) => s.variables.total === '60');
    assert(Boolean(stepWithTotal10 && stepWithTotal30 && stepWithTotal60), 'Scrubber captures intermediate variable states (10 -> 30 -> 60)');
    assert(
      (stepWithTotal10?.canvasSnapshot?.length ?? 0) < (stepWithTotal60?.canvasSnapshot?.length ?? 0),
      'Canvas snapshots grow progressively across time-travel steps'
    );

    // v2 Prism dialect code traced through Time-Travel Debugger
    const v2PrismCode = `
set score to 5
set bonus to 15
set finalScore to score + bonus
say finalScore
`;
    const resV2 = runStudioCode(v2PrismCode, { runtime: 'v2' });
    assert(resV2.success, 'v2 Prism dialect code traces cleanly');
    assert(resV2.output.includes('20'), 'v2 Prism output is 20');
    assert(
      resV2.chrono.some((s) => s.variables.finalScore === '20'),
      'v2 Prism variables captured in Chrono timeline'
    );
  }

  console.log('\n=== 3. Sub-50MB Pre-Baked WebGPU Micro-Brain Tests ===');
  {
    const stats = getMicroBrainStats();
    assert(
      stats.weightBytes > 0 && stats.weightBytes < 50 * 1024 * 1024,
      `Pre-baked weights under 50MB (${stats.weightBytes} bytes)`
    );

    const intentPrint = classifyLineIntent('print "hello world"');
    assert(intentPrint.intent === 'PRINT', `Classifies print intent (${intentPrint.intent})`);

    const foreignSnippet = `
# Calculate factorial and print
def compute_sum(limit):
  let acc = 0
  for i from 1 to limit:
    acc += i
  return acc

let answer = compute_sum(5)
console.log(answer)
`;
    const translated = runMicroBrainTranslation(foreignSnippet);
    assert(translated.changed, 'Micro-Brain translates foreign/natural code to canonical sdev');
    const execRes = execute(translated.canonical);
    assert(
      execRes.success && execRes.output[0] === '15',
      `Translated canonical sdev executes and outputs 15 (got ${JSON.stringify(execRes.output)})`
    );

    const brainReply = await callMicroBrain({
      source: foreignSnippet,
      draft: foreignSnippet,
      unresolved: [1, 2, 3],
      vocabulary: {},
    });
    assert(brainReply !== null && brainReply.canonical.includes('conjure compute_sum'), 'callMicroBrain returns valid canonical reply');
  }

  console.log('\n=== 4. WASI 0.2 Component Model Export Tests ===');
  {
    const mathModule = `
conjure add(a, b) ::
  yield a + b
;;

conjure hipotSq(x, y) ::
  yield x * x + y * y
;;
`;
    const bundle = buildWasiComponentBundle(mathModule, 'math_ops.sdev');
    assert(bundle.packageName === 'sdev:math-ops@0.2.0', `Package name is ${bundle.packageName}`);
    assert(bundle.exports.length === 2, 'Extracts both exported functions (add, hipotSq)');
    assert(bundle.wit.includes('add: func(a: f64, b: f64) -> f64;'), 'WIT specification contains typed add signature');
    assert(bundle.wit.includes('hipot-sq: func(x: f64, y: f64) -> f64;'), 'WIT specification contains kebab-case hipot-sq signature');
    assert(bundle.bindings.rust.includes('wasmtime'), 'Generates Rust host bindings');
    assert(bundle.bindings.python.includes('wasmtime'), 'Generates Python host bindings');
    assert(bundle.bindings.go.includes('wazero'), 'Generates Go host bindings');

    // Instantiate the emitted binary .wasm directly in V8/Node WebAssembly engine!
    const { instance } = await WebAssembly.instantiate(bundle.wasmBytes, {});
    const addFn = instance.exports.add as (a: number, b: number) => number;
    const hipotSqFn = instance.exports.hipotSq as (x: number, y: number) => number;
    assert(typeof addFn === 'function', 'Compiled .wasm exports callable add() function');
    assert(addFn(12, 30) === 42, `WASM add(12, 30) === 42 (got ${addFn(12, 30)})`);
    assert(hipotSqFn(3, 4) === 25, `WASM hipotSq(3, 4) === 25 (got ${hipotSqFn(3, 4)})`);
  }

  console.log('\n=== 5. Multiplayer Classroom & Pair-Programming CRDT Tests ===');
  {
    const code = generateRoomCode();
    assert(code.length === 6, `Generated 6-char room code: ${code}`);

    const docA = new CrdtDocument('peer-a', 'forge x be 1', 'main.sdev');
    const docB = new CrdtDocument('peer-b', 'forge x be 1', 'main.sdev');

    const snapA = docA.applyLocalEdit('forge x be 10');
    assert(snapA.clock === 1, 'Lamport clock increments on local edit');

    const mergedAtB = docB.mergeRemoteSnapshot(snapA);
    assert(mergedAtB && docB.getState().content === 'forge x be 10', 'Peer B converges to Peer A edit');

    // Concurrent edit tie-breaking (same clock, peer-b > peer-a lexicographically)
    const snapA2 = docA.applyLocalEdit('forge x be 100'); // clock 2, peer-a
    const docC = new CrdtDocument('peer-z', 'forge x be 1', 'main.sdev');
    docC.applyLocalEdit('forge x be 50'); // clock 1
    const snapC2 = docC.applyLocalEdit('forge x be 999'); // clock 2, peer-z

    docA.mergeRemoteSnapshot(snapC2);
    docC.mergeRemoteSnapshot(snapA2);
    assert(
      docA.getState().content === docC.getState().content &&
        docA.getState().content === 'forge x be 999',
      'Concurrent CRDT edits converge deterministically across peers'
    );

    // Teacher broadcast override test
    let receivedByStudent = '';
    const studentRoom = new LiveRoomSession(
      'CLASS1',
      'student',
      'forge old be 0',
      'lesson.sdev',
      {
        onRemoteDocument: (snap, isTeacher) => {
          if (isTeacher) receivedByStudent = snap.content;
        },
      }
    );
    studentRoom.handlePacket({
      type: 'crdt_sync',
      snapshot: {
        clock: 1,
        authorPeerId: 'teacher-1',
        fileName: 'lesson.sdev',
        content: 'speak("Welcome to class!")',
        timestampMs: Date.now(),
      },
      isTeacherBroadcast: true,
    });
    assert(
      receivedByStudent === 'speak("Welcome to class!")',
      'Student session receives and applies teacher broadcast'
    );
    studentRoom.disconnect();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
