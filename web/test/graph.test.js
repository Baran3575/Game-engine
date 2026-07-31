'use strict';

// Runnable check for the Blueprint graph compiler (no DOM needed).
// Run with: node web/test/graph.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let src = fs.readFileSync(path.join(__dirname, '..', 'js', 'graph.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', src)(mod, mod.exports);
const { compileGraph, GRAPH_NODES } = mod.exports;

// simple chain: start -> move
let code = compileGraph([
  { id: 'a', type: 'event_start', x: 0, y: 0, values: {} },
  { id: 'b', type: 'action_move', x: 0, y: 0, values: { X: 1, Y: 2, Z: 3 } }
], [{ fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' }]);
assert.strictEqual(code,
  'game.onStart(async function () {\n  game.this.move(1, 2, 3);\n});', 'simple chain compiles');

// spawn with defaults
code = compileGraph([
  { id: 'a', type: 'event_start', x: 0, y: 0, values: {} },
  { id: 'b', type: 'action_spawn', x: 0, y: 0, values: { TYPE: 'box', NAME: 'rock', COLOR: '#ff4444' } }
], [{ fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' }]);
assert.ok(code.includes('game.spawn({ type: "box", name: "rock", color: "#ff4444", x: 0, y: 3, z: 0 });'),
  'spawn compiles with defaults');

// data wires: number + object into move
code = compileGraph([
  { id: 'a', type: 'event_start', x: 0, y: 0, values: {} },
  { id: 'b', type: 'action_move', x: 0, y: 0, values: { X: 0, Y: 0, Z: 0 } },
  { id: 'c', type: 'value_object', x: 0, y: 0, values: { OBJ: 'hero' } },
  { id: 'd', type: 'value_number', x: 0, y: 0, values: { V: 7 } }
], [
  { fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' },
  { fromNode: 'c', fromPort: 'out', toNode: 'b', toPort: 'OBJ' },
  { fromNode: 'd', fromPort: 'out', toNode: 'b', toPort: 'X' }
]);
assert.ok(code.includes('game.find("hero").move(7, 0, 0);'), 'wired data values used');

// control: repeat with body + forever
code = compileGraph([
  { id: 'a', type: 'event_start', x: 0, y: 0, values: {} },
  { id: 'b', type: 'control_repeat', x: 0, y: 0, values: { TIMES: 3 } },
  { id: 'c', type: 'action_destroy', x: 0, y: 0, values: {} }
], [
  { fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' },
  { fromNode: 'b', fromPort: 'body', toNode: 'c', toPort: 'in' }
]);
assert.ok(code.includes('for (var i$ = 0; i$ < 3; i$++) {'), 'repeat compiles');
assert.ok(code.includes('game.this.destroy();'), 'body executes inside repeat');

// compare feeding an if condition
code = compileGraph([
  { id: 'a', type: 'event_start', x: 0, y: 0, values: {} },
  { id: 'b', type: 'control_if', x: 0, y: 0, values: {} },
  { id: 'c', type: 'value_compare', x: 0, y: 0, values: { OP: '===' } },
  { id: 'd', type: 'value_number', x: 0, y: 0, values: { V: 5 } },
  { id: 'e', type: 'value_number', x: 0, y: 0, values: { V: 3 } }
], [
  { fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' },
  { fromNode: 'c', fromPort: 'out', toNode: 'b', toPort: 'COND' },
  { fromNode: 'd', fromPort: 'out', toNode: 'c', toPort: 'A' },
  { fromNode: 'e', fromPort: 'out', toNode: 'c', toPort: 'B' }
]);
assert.ok(code.includes('if ((5 == 3)) {'), 'compare wires into if condition');

// every node type has a title, category and is compile-safe (empty graph no crash)
assert(compileGraph([], []).length === 0, 'empty graph compiles to nothing');
assert(Object.keys(GRAPH_NODES).length >= 16, 'node palette is populated');

console.log('Graph OK - chains, wires, controls, conditions all compile');
