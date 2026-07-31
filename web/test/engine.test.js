'use strict';

// Runnable check for the engine core (physics, collisions, API) with Three.js
// stubbed out. Run with: node web/test/engine.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const Vec = function () { return { x: 0, y: 0, z: 0, set: function (x, y, z) { this.x = x; this.y = y; this.z = z; } }; };
global.THREE = {
  Scene: class { constructor() { this.background = null; } add() {} remove() {} },
  PerspectiveCamera: class { constructor() { this.position = Vec(); } updateProjectionMatrix() {} lookAt() {} },
  WebGLRenderer: class { constructor() { this.domElement = {}; } setPixelRatio() {} setSize() {} render() {} },
  AmbientLight: class {}, DirectionalLight: class { constructor() { this.position = Vec(); } },
  BoxGeometry: class {}, SphereGeometry: class {}, CylinderGeometry: class {},
  MeshLambertMaterial: class { constructor() { this.color = { set() {} }; } dispose() {} },
  Mesh: class { constructor() { this.position = Vec(); this.rotation = Vec(); this.scale = Vec(); this.material = { color: { set() {} }, dispose() {} }; this.geometry = { dispose() {} }; } },
  GridHelper: class { constructor() { this.position = Vec(); } },
  OrbitControls: class { constructor() { this.enableDamping = true; this.update = function () {}; } },
  Color: class { constructor(c) { this.c = c; } },
  Vector2: class { constructor(x, y) { this.x = x; this.y = y; } },
  Raycaster: class { constructor() { this.objects = []; } setFromCamera() {} intersectObjects() { return []; } },
  Clock: class { getDelta() { return 0.016; } }
};
global.window = { addEventListener: function () {}, devicePixelRatio: 1 };
global.requestAnimationFrame = function () {};

let src = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', src + '\nmodule.exports = GameEngine;')(mod, mod.exports);
const GameEngine = mod.exports;

const engine = new GameEngine({ appendChild() {}, clientWidth: 800, clientHeight: 600 });

const box = engine.spawn({ type: 'box', name: 'hero', x: 0, y: 5, z: 0 });
assert.strictEqual(engine.find('hero'), box, 'find by name');
assert.strictEqual(engine.find('this'), box, 'find("this") -> first object');
assert.strictEqual(engine.objects.length, 1, 'one object');

box.velocity.y = 5;
engine._step(0.1);
assert.ok(box.y > 5, 'velocity moves object up (' + box.y + ')');

const falling = engine.spawn({ type: 'box', name: 'fall', x: 0, y: 0.5, z: 0 });
falling.velocity.y = -5;
engine._step(0.1);
assert.strictEqual(falling.y, 0.5, 'ground clamp');
assert.strictEqual(falling.velocity.y, 0, 'landed, no bounce');

let touched = 0;
engine.api.on('touch', (a, b) => { touched++; assert.ok(a && b, 'touch gives two objects'); });
box.y = 1; box.velocity.y = 0;
engine._step(0.1);
assert.ok(touched > 0, 'overlapping objects emit touch');

box.move(1, 0, 0);
assert.strictEqual(box.x, 1, 'move');
box.rotate(0, 1, 0);
assert.strictEqual(box.ry, 1, 'rotate');
box.scaleTo(3);
assert.strictEqual(box.sx, 3, 'scaleTo');

const j = box.toJSON();
assert.strictEqual(j.name, 'hero', 'toJSON');

let started = 0;
global.startedCounter = 0;
engine.start('game.onStart(function(){ startedCounter++ }); game.onKey("Space", function(){}); game.log("program ran");');
assert.strictEqual(global.startedCounter, 1, 'start handler fired once');
assert.strictEqual(box.y, box.spawn.y, 'positions reset on start');

engine.remote('setProperty', { object: 'hero', prop: 'x', value: 42 });
assert.strictEqual(box.x, 42, 'MCP set_property');
const scene = engine.remote('getScene');
assert.strictEqual(scene.objects.length, 2, 'MCP get_scene');
engine.remote('remove', { object: 'fall' });
assert.strictEqual(engine.find('fall'), null, 'MCP remove');

console.log('Engine OK - physics, collisions, api, start/reset, MCP remote all pass');
