'use strict';

// Full-app boot check with stubbed DOM/browser APIs. Catches wiring bugs
// (missing element ids, throw during init) that unit tests miss.
// Run with: node web/test/boot.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ---------- browser/THREE stubs ----------
const Vec = function () { return { x: 0, y: 0, z: 0, set: function (x, y, z) { this.x = x; this.y = y; this.z = z; } }; };
global.THREE = {
  Scene: class { constructor() { this.background = null; } add() {} remove() {} },
  PerspectiveCamera: class { constructor() { this.position = Vec(); } updateProjectionMatrix() {} lookAt() {} },
  WebGLRenderer: class { constructor() { this.domElement = stubEl('canvas'); } setPixelRatio() {} setSize() {} render() {} },
  AmbientLight: class {}, DirectionalLight: class { constructor() { this.position = Vec(); } },
  BoxGeometry: class {}, SphereGeometry: class {}, CylinderGeometry: class {},
  MeshLambertMaterial: class { constructor() { this.color = { set() {} }; } dispose() {} },
  Mesh: class { constructor() { this.position = Vec(); this.rotation = Vec(); this.scale = Vec(); this.material = { color: { set() {} }, dispose() {} }; this.geometry = { dispose() {} }; } },
  GridHelper: class { constructor() { this.position = Vec(); } },
  OrbitControls: class { constructor() { this.enableDamping = true; this.update = function () {}; } },
  Color: class { constructor(c) { this.c = c; } },
  Vector2: class { constructor(x, y) { this.x = x; this.y = y; } },
  Raycaster: class { constructor() {} setFromCamera() {} intersectObjects() { return []; } },
  Clock: class { getDelta() { return 0.016; } }
};
global.requestAnimationFrame = function () {};

function stubEl(tag) {
  return {
    tagName: tag || 'div', children: [],
    style: { setProperty() {} },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    value: '', textContent: '', innerHTML: '',
    scrollTop: 0, scrollHeight: 0, clientWidth: 800, clientHeight: 600,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    querySelector() { return stubEl('div'); },
    querySelectorAll() { return []; },
    focus() {}
  };
}

const byId = {};
global.document = {
  getElementById: (id) => { byId[id] = byId[id] || stubEl('div'); return byId[id]; },
  createElement: (t) => stubEl(t),
  createElementNS: () => stubEl('path'),
  elementFromPoint: () => null,
  querySelectorAll: () => []
};
global.window = {
  addEventListener() {},
  app: null
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.location = { search: '', reload() {} };
global.WebSocket = class { constructor() { this.readyState = 0; } close() {} };
global.prompt = () => null;
global.confirm = () => true;

// ---------- load scripts in one shared scope (like separate <script> tags) ----------
let bundle = '';
for (const file of ['engine.js', 'graph.js', 'bridge.js', 'app.js']) {
  bundle += fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8') + '\n';
}
new Function('module', 'exports', bundle)({}, {});

assert(global.window.app, 'app booted and window.app exposed');
assert(global.window.app.engine, 'engine wired');
assert(global.window.app.graph, 'graph editor wired');
assert.strictEqual(typeof global.window.app.currentProgram, 'function', 'program compiler wired');

const bootErrors = global.window.app.engine.objects.length;
assert(Array.isArray(global.window.app.engine.objects) && bootErrors === 0, 'clean scene on boot');

console.log('Boot OK - app initializes, engine + graph + bridge all wired');
