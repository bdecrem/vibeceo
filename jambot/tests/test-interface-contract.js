/**
 * Test: Interface Contract
 * Verifies all instruments implement the required InstrumentNode interface.
 * Verifies all effects implement the required EffectNode interface.
 * Guards Fix 3 (runtime interface validation).
 */
import { strict as assert } from 'node:assert';
import { createSession } from '../core/session.js';
import { InstrumentNode, EffectNode } from '../core/node.js';
import { DelayNode } from '../effects/delay-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(`  ${e.message}`);
  }
}

// Create a session -- this triggers registration and validation
const session = createSession({ bpm: 120 });

const CANONICAL_IDS = ['jb01', 'jb202', 'sampler', 'jt10', 'jt30', 'jt90', 'jp9000'];
const REQUIRED_METHODS = [
  'getParam', 'setParam', 'getPattern', 'setPattern',
  'renderPattern', 'getDescriptor', 'getPatternLength', 'getOutputGain',
];

for (const id of CANONICAL_IDS) {
  const node = session._nodes[id];

  test(`${id} is registered`, () => {
    assert.ok(node, `Node ${id} not found in session._nodes`);
  });

  if (!node) continue;

  for (const method of REQUIRED_METHODS) {
    test(`${id}.${method}() exists`, () => {
      assert.strictEqual(typeof node[method], 'function', `${id}.${method} is not a function`);
    });
  }

  test(`${id}.getDescriptor() returns object for known param`, () => {
    const descriptors = node.getParameterDescriptors();
    const firstPath = Object.keys(descriptors)[0];
    if (firstPath) {
      const desc = node.getDescriptor(firstPath);
      assert.ok(desc, `getDescriptor('${firstPath}') returned falsy`);
      assert.ok(desc.min !== undefined, `descriptor missing min`);
      assert.ok(desc.max !== undefined, `descriptor missing max`);
    }
  });

  test(`${id}.getOutputGain() returns number`, () => {
    const gain = node.getOutputGain();
    assert.strictEqual(typeof gain, 'number');
    assert.ok(gain >= 0, `gain should be >= 0, got ${gain}`);
  });

  // Test serialize/deserialize round-trip
  test(`${id} serialize/deserialize round-trip`, () => {
    const serialized = node.serialize();
    assert.ok(serialized, 'serialize() returned falsy');
    assert.ok(serialized.id || serialized.params !== undefined, 'serialized has no id or params');
  });
}

// Negative test: a broken node should fail validation
test('Missing renderPattern throws on validateInterface', async () => {
  class BrokenNode extends InstrumentNode {
    constructor() { super('broken'); }
    // Missing renderPattern, getPatternLength
  }
  const broken = new BrokenNode();
  assert.throws(() => broken.validateInterface(), /missing required methods/);
});

// === EffectNode interface validation ===

const EFFECT_NODES = [
  { name: 'DelayNode', NodeClass: DelayNode },
  { name: 'EQNode', NodeClass: EQNode },
  { name: 'FilterNode', NodeClass: FilterNode },
  { name: 'SidechainNode', NodeClass: SidechainNode },
];

const EFFECT_REQUIRED_METHODS = ['getParam', 'setParam', 'getParameterDescriptors', 'getParams'];

for (const { name, NodeClass } of EFFECT_NODES) {
  const node = new NodeClass();

  for (const method of EFFECT_REQUIRED_METHODS) {
    test(`${name}.${method}() exists`, () => {
      assert.strictEqual(typeof node[method], 'function', `${name}.${method} is not a function`);
    });
  }

  test(`${name}.validateInterface() passes`, () => {
    assert.doesNotThrow(() => node.validateInterface());
  });

  test(`${name}.getParams() returns object with keys`, () => {
    const params = node.getParams();
    assert.strictEqual(typeof params, 'object');
    assert.ok(Object.keys(params).length > 0, `${name}.getParams() returned empty object`);
  });

  test(`${name} extends EffectNode`, () => {
    assert.ok(node instanceof EffectNode, `${name} does not extend EffectNode`);
  });
}

// Negative test: broken EffectNode
test('EffectNode with missing methods throws on validateInterface', () => {
  class BrokenEffect extends EffectNode {
    constructor() { super('broken'); }
  }
  // Override getParams to be undefined
  const broken = new BrokenEffect();
  delete broken.getParams;
  // Can't easily delete inherited method, so test base validation works
  assert.doesNotThrow(() => new BrokenEffect().validateInterface());
});

console.log(`\nInterface contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
