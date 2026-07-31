'use strict';

// Custom Blueprint-style node-graph editor (Unreal/Struckd vibe).
// Drag nodes, wire outputs to inputs, and the graph compiles to JavaScript
// that drives the same `game` API as the script editor.

const KEYS = [
  ['any', '*'], ['space', 'Space'], ['up', 'ArrowUp'], ['down', 'ArrowDown'],
  ['left', 'ArrowLeft'], ['right', 'ArrowRight'], ['W', 'KeyW'],
  ['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['enter', 'Enter']
];
const SHAPES = [['box', 'box'], ['sphere', 'sphere'], ['cylinder', 'cylinder']];

const CATEGORIES = ['Events', 'Actions', 'Control', 'Math', 'Objects'];

const GRAPH_NODES = {
  event_start: {
    title: 'On Game Start', category: 'Events', color: '#3d4a76',
    fields: [],
    inputs: [], outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  event_key: {
    title: 'On Key Pressed', category: 'Events', color: '#3d4a76',
    fields: [{ id: 'KEY', label: 'key', widget: 'dropdown', options: KEYS }],
    inputs: [], outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  event_receive: {
    title: 'On Event Received', category: 'Events', color: '#3d4a76',
    fields: [{ id: 'NAME', label: 'event', widget: 'text', def: 'go' }],
    inputs: [], outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },

  action_move: {
    title: 'Move', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' },
      { id: 'X', kind: 'data', type: 'number', label: 'x', def: 0 },
      { id: 'Y', kind: 'data', type: 'number', label: 'y', def: 0 },
      { id: 'Z', kind: 'data', type: 'number', label: 'z', def: 0 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_rotate: {
    title: 'Rotate', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' },
      { id: 'RX', kind: 'data', type: 'number', label: 'x', def: 0 },
      { id: 'RY', kind: 'data', type: 'number', label: 'y', def: 0 },
      { id: 'RZ', kind: 'data', type: 'number', label: 'z', def: 0 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_scale: {
    title: 'Set Scale', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' },
      { id: 'S', kind: 'data', type: 'number', label: 'scale', def: 1 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_setcolor: {
    title: 'Set Color', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' },
      { id: 'COLOR', kind: 'data', type: 'color', label: 'color', def: '#ff4444' }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_setvelocity: {
    title: 'Set Velocity', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' },
      { id: 'VX', kind: 'data', type: 'number', label: 'x', def: 0 },
      { id: 'VY', kind: 'data', type: 'number', label: 'y', def: 0 },
      { id: 'VZ', kind: 'data', type: 'number', label: 'z', def: 0 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_spawn: {
    title: 'Spawn Object', category: 'Actions', color: '#6b4ea0',
    fields: [
      { id: 'TYPE', label: 'shape', widget: 'dropdown', options: SHAPES },
      { id: 'NAME', label: 'name', widget: 'text', def: 'rock' },
      { id: 'COLOR', label: 'color', widget: 'color', def: '#ff4444' }
    ],
    inputs: [{ id: 'in', kind: 'flow' },
      { id: 'X', kind: 'data', type: 'number', label: 'x', def: 0 },
      { id: 'Y', kind: 'data', type: 'number', label: 'y', def: 3 },
      { id: 'Z', kind: 'data', type: 'number', label: 'z', def: 0 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_destroy: {
    title: 'Destroy', category: 'Actions', color: '#6b4ea0',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'OBJ', kind: 'data', type: 'object', label: 'object' }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  action_broadcast: {
    title: 'Broadcast Event', category: 'Actions', color: '#6b4ea0',
    fields: [{ id: 'NAME', label: 'event', widget: 'text', def: 'go' }],
    inputs: [{ id: 'in', kind: 'flow' }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },

  control_wait: {
    title: 'Wait', category: 'Control', color: '#3f7a66',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'SECS', kind: 'data', type: 'number', label: 'seconds', def: 1 }],
    outputs: [{ id: 'out', kind: 'flow', label: '' }]
  },
  control_repeat: {
    title: 'Repeat', category: 'Control', color: '#3f7a66',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'TIMES', kind: 'data', type: 'number', label: 'times', def: 10 }],
    outputs: [{ id: 'body', kind: 'flow', label: 'loop body' }, { id: 'after', kind: 'flow', label: 'then' }]
  },
  control_forever: {
    title: 'Forever', category: 'Control', color: '#3f7a66',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }],
    outputs: [{ id: 'body', kind: 'flow', label: 'loop body' }]
  },
  control_if: {
    title: 'If', category: 'Control', color: '#3f7a66',
    fields: [],
    inputs: [{ id: 'in', kind: 'flow' }, { id: 'COND', kind: 'data', type: 'boolean', label: 'condition', def: true }],
    outputs: [{ id: 'body', kind: 'flow', label: 'then' }, { id: 'after', kind: 'flow', label: 'else' }]
  },

  value_number: {
    title: 'Number', category: 'Math', color: '#3f6a80',
    fields: [{ id: 'V', label: '', widget: 'number', def: 0 }],
    inputs: [], outputs: [{ id: 'out', kind: 'data', type: 'number', label: '' }]
  },
  value_compare: {
    title: 'Compare', category: 'Math', color: '#3f6a80',
    fields: [{ id: 'OP', label: '', widget: 'dropdown', options: [['=', '==='], ['\u2260', '!=='], ['<', '<'], ['>', '>'], ['\u2264', '<='], ['\u2265', '>=']] }],
    inputs: [{ id: 'A', kind: 'data', type: 'number', label: 'a', def: 0 },
      { id: 'B', kind: 'data', type: 'number', label: 'b', def: 0 }],
    outputs: [{ id: 'out', kind: 'data', type: 'boolean', label: '' }]
  },

  value_object: {
    title: 'Object', category: 'Objects', color: '#a24a4a',
    fields: [{ id: 'OBJ', label: '', widget: 'objectdropdown' }],
    inputs: [], outputs: [{ id: 'out', kind: 'data', type: 'object', label: '' }]
  }
};

// ---------- pure compile (testable without DOM) ----------

const OP_FIELD = { '===': '==', '!==': '!=', '<': '<', '>': '>', '<=': '<=', '>=': '>=' };

function compileGraph(nodes, wires) {
  const byId = {};
  for (const n of nodes) byId[n.id] = n;
  const wiresFrom = {};
  for (const w of wires) {
    (wiresFrom[w.fromNode] = wiresFrom[w.fromNode] || []).push(w);
    (wiresFrom[w.toNode] = wiresFrom[w.toNode] || []).push(w);
  }
  const wireTo = (nodeId, portId) =>
    (wiresFrom[nodeId] || []).find((w) => w.toNode === nodeId && w.toPort === portId);
  const wireFrom = (nodeId, portId) =>
    (wiresFrom[nodeId] || []).find((w) => w.fromNode === nodeId && w.fromPort === portId);

  function num(node, port, fallback) {
    const w = wireTo(node.id, port);
    if (w) return dataExpr(byId[w.fromNode], w.fromPort, 0);
    return node.values && node.values[port] !== undefined ? node.values[port] : fallback;
  }
  function obj(node, port) {
    const w = wireTo(node.id, port);
    if (w) return dataExpr(byId[w.fromNode], w.fromPort, 0);
    return 'game.this';
  }
  function color(node, port) {
    const w = wireTo(node.id, port);
    if (w) return dataExpr(byId[w.fromNode], w.fromPort, 0);
    return JSON.stringify((node.values && node.values[port]) || '#ff4444');
  }
  function bool(node, port) {
    const w = wireTo(node.id, port);
    if (w) return dataExpr(byId[w.fromNode], w.fromPort, 0);
    return node.values && node.values[port] ? 'true' : 'false';
  }

  function dataExpr(node, port, depth) {
    if (depth > 20) return '0';
    const v = node.values || {};
    switch (node.type) {
      case 'value_number': return String(Number(v.V) || 0);
      case 'value_object': return v.OBJ === 'this' || !v.OBJ ? 'game.this' : 'game.find(' + JSON.stringify(v.OBJ) + ')';
      case 'value_compare': {
        const op = (OP_FIELD[v.OP] || '==');
        return '(' + num(node, 'A', 0) + ' ' + op + ' ' + num(node, 'B', 0) + ')';
      }
      default:
        return obj(node, port, depth + 1);
    }
  }

  function statement(node) {
    switch (node.type) {
      case 'action_move':
        return obj(node, 'OBJ') + '.move(' + num(node, 'X', 0) + ', ' + num(node, 'Y', 0) + ', ' + num(node, 'Z', 0) + ');';
      case 'action_rotate':
        return obj(node, 'OBJ') + '.rotate(' + num(node, 'RX', 0) + ', ' + num(node, 'RY', 0) + ', ' + num(node, 'RZ', 0) + ');';
      case 'action_scale':
        return obj(node, 'OBJ') + '.scaleTo(' + num(node, 'S', 1) + ');';
      case 'action_setcolor':
        return obj(node, 'OBJ') + '.setColor(' + color(node, 'COLOR') + ');';
      case 'action_setvelocity':
        return obj(node, 'OBJ') + '.velocity = { x: ' + num(node, 'VX', 0) + ', y: ' + num(node, 'VY', 0) + ', z: ' + num(node, 'VZ', 0) + ' };';
      case 'action_spawn':
        return 'game.spawn({ type: ' + JSON.stringify(node.values.TYPE) + ', name: ' + JSON.stringify(node.values.NAME) +
          ', color: ' + JSON.stringify(node.values.COLOR) + ', x: ' + num(node, 'X', 0) + ', y: ' + num(node, 'Y', 3) + ', z: ' + num(node, 'Z', 0) + ' });';
      case 'action_destroy':
        return obj(node, 'OBJ') + '.destroy();';
      case 'action_broadcast':
        return 'game.broadcast(' + JSON.stringify(node.values.NAME) + ');';
      case 'control_wait':
        return 'await game.wait(' + num(node, 'SECS', 1) + ');';
      case 'control_repeat':
        return 'for (var i$ = 0; i$ < ' + num(node, 'TIMES', 10) + '; i$++) {\n  await game._yield();\n' + indent(body(node)) + '}';
      case 'control_forever':
        return 'while (true) {\n  await game._yield();\n' + indent(body(node)) + '}';
      case 'control_if':
        return 'if (' + bool(node, 'COND') + ') {\n  await game._yield();\n' + indent(body(node)) + '}';
      default:
        return '';
    }
  }

  function body(node) {
    const w = wireFrom(node.id, 'body');
    return w ? chain(byId[w.toNode], 1) : '';
  }
  function chain(node, depth) {
    if (!node || depth > 40) return '';
    let out = statement(node);
    const after = wireFrom(node.id, 'after') || wireFrom(node.id, 'out');
    if (after && byId[after.toNode]) out += '\n' + chain(byId[after.toNode], depth + 1);
    return out;
  }
  function indent(s) { return s.split('\n').map((l) => '  ' + l).join('\n'); }

  const handlers = [];
  for (const n of nodes) {
    const bodyCode = (id) => {
      const w = wireFrom(id, 'out');
      return indent(chain(w ? byId[w.toNode] : null, 0)) + '\n';
    };
    if (n.type === 'event_start') {
      handlers.push('game.onStart(async function () {\n' + bodyCode(n.id) + '});');
    } else if (n.type === 'event_key') {
      handlers.push('game.onKey(' + JSON.stringify(n.values.KEY) + ', async function () {\n' + bodyCode(n.id) + '});');
    } else if (n.type === 'event_receive') {
      handlers.push('game.on(' + JSON.stringify(n.values.NAME) + ', async function () {\n' + bodyCode(n.id) + '});');
    }
  }
  return handlers.join('\n\n');
}

// ---------- interactive editor ----------

let _uid = 0;
function freshId() { return 'n' + (++_uid); }

class NodeEditor {
  constructor(container) {
    this.container = container;
    this.nodes = [];
    this.wires = [];
    this.selected = null;      // node id or wire id
    this.camera = { x: 40, y: 40, zoom: 1 };
    this.active = false;       // pointer over viewport
    this._drag = null;

    container.innerHTML =
      '<div class="graph-palette"></div>' +
      '<div class="graph-viewport">' +
      '<svg class="graph-wires"></svg>' +
      '<div class="graph-nodes"></div>' +
      '<div class="graph-hint">drag from a \u25cf port to wire nodes</div>' +
      '</div>';

    this.paletteEl = container.querySelector('.graph-palette');
    this.viewport = container.querySelector('.graph-viewport');
    this.wiresSvg = container.querySelector('.graph-wires');
    this.nodesLayer = container.querySelector('.graph-nodes');
    this.hintEl = container.querySelector('.graph-hint');

    this._buildPalette();
    this._bindEvents();
    this._applyCamera();
  }

  // ---------- palette ----------

  _buildPalette() {
    for (const cat of CATEGORIES) {
      const h = document.createElement('div');
      h.className = 'gp-cat';
      h.textContent = cat;
      this.paletteEl.appendChild(h);
      for (const [type, def] of Object.entries(GRAPH_NODES)) {
        if (def.category !== cat) continue;
        const b = document.createElement('button');
        b.className = 'gp-item';
        b.style.setProperty('--nc', def.color);
        b.textContent = def.title;
        b.onclick = () => this.addNode(type, this.camera.x + 40, this.camera.y + 40);
        this.paletteEl.appendChild(b);
      }
    }
  }

  // ---------- node ops ----------

  addNode(type, x, y) {
    const def = GRAPH_NODES[type];
    const node = { id: freshId(), type: type, x: x || 0, y: y || 0, values: {} };
    for (const f of def.fields) node.values[f.id] = f.def !== undefined ? f.def : (f.options ? f.options[0][1] : '');
    for (const p of def.inputs) {
      if (p.def !== undefined) node.values[p.id] = p.def;
    }
    this.nodes.push(node);
    this.selected = node.id;
    this.render();
    return node;
  }

  _node(id) { return this.nodes.find((n) => n.id === id); }
  _nodeEl(id) { return this.nodesLayer.querySelector('[data-node="' + id + '"]'); }
  _wire(id) { return this.wires.find((w) => w.id === id); }

  deleteSelection() {
    if (!this.selected) return;
    if (typeof this.selected === 'string' && this.selected[0] === 'w') {
      this.wires = this.wires.filter((w) => w.id !== this.selected);
    } else {
      this.nodes = this.nodes.filter((n) => n.id !== this.selected);
      this.wires = this.wires.filter((w) => w.fromNode !== this.selected && w.toNode !== this.selected);
    }
    this.selected = null;
    this.render();
  }

  clear() { this.nodes = []; this.wires = []; this.selected = null; this.render(); }

  // ---------- rendering ----------

  _applyCamera() {
    this.nodesLayer.style.transform =
      'translate(' + this.camera.x + 'px,' + this.camera.y + 'px) scale(' + this.camera.zoom + ')';
    this._drawWires();
  }

  _worldToScreen(x, y) {
    return { x: x * this.camera.zoom + this.camera.x, y: y * this.camera.zoom + this.camera.y };
  }

  render() {
    this.nodesLayer.innerHTML = '';
    for (const node of this.nodes) this._renderNode(node);
    this._drawWires();
  }

  _renderNode(node) {
    const def = GRAPH_NODES[node.type];
    const el = document.createElement('div');
    el.className = 'graph-node' + (this.selected === node.id ? ' selected' : '');
    el.dataset.node = node.id;
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    el.style.setProperty('--nc', def.color);

    const title = document.createElement('div');
    title.className = 'gn-title';
    title.textContent = def.title;
    el.appendChild(title);

    const fields = document.createElement('div');
    fields.className = 'gn-fields';
    for (const f of def.fields) {
      const row = document.createElement('label');
      row.className = 'gn-field';
      if (f.label) {
        const sp = document.createElement('span');
        sp.textContent = f.label;
        row.appendChild(sp);
      }
      row.appendChild(this._makeWidget(f, node));
      fields.appendChild(row);
    }
    if (def.fields.length) el.appendChild(fields);

    const ports = document.createElement('div');
    ports.className = 'gn-ports';

    const inCol = document.createElement('div');
    inCol.className = 'gn-col gn-in';
    for (const p of def.inputs) {
      const row = this._makePort(node, p, 'in');
      inCol.appendChild(row);
    }
    const outCol = document.createElement('div');
    outCol.className = 'gn-col gn-out';
    for (const p of def.outputs) {
      const row = this._makePort(node, p, 'out');
      outCol.appendChild(row);
    }
    ports.appendChild(inCol);
    ports.appendChild(outCol);
    el.appendChild(ports);

    this.nodesLayer.appendChild(el);
  }

  _makeWidget(f, node) {
    if (f.widget === 'objectdropdown') {
      const sel = document.createElement('select');
      const refresh = () => {
        const names = this.objectNames ? this.objectNames() : [];
        const opts = names.length ? names.concat(['this']) : ['this'];
        const cur = node.values[f.id] || 'this';
        sel.innerHTML = '';
        for (const n of opts) {
          const opt = document.createElement('option');
          opt.value = n; opt.textContent = n;
          sel.appendChild(opt);
        }
        sel.value = opts.includes(cur) ? cur : 'this';
        node.values[f.id] = sel.value;
      };
      refresh();
      sel.onmousedown = refresh;
      sel.onchange = () => { node.values[f.id] = sel.value; this._maybeRecompile(); };
      return sel;
    }
    const input = document.createElement('input');
    if (f.widget === 'dropdown') {
      const sel = document.createElement('select');
      for (const [lab, val] of f.options) {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = lab;
        sel.appendChild(opt);
      }
      sel.value = node.values[f.id];
      sel.onchange = () => { node.values[f.id] = sel.value; this._maybeRecompile(); };
      return sel;
    }
    if (f.widget === 'number') {
      input.type = 'number'; input.step = '0.1'; input.className = 'w-number';
    } else if (f.widget === 'color') {
      input.type = 'color'; input.className = 'w-color';
    } else {
      input.type = 'text'; input.className = 'w-text';
    }
    input.value = node.values[f.id];
    input.oninput = () => {
      node.values[f.id] = f.widget === 'number' ? (parseFloat(input.value) || 0) : input.value;
      this._maybeRecompile();
    };
    return input;
  }

  _makePort(node, p, dir) {
    const row = document.createElement('div');
    row.className = 'port ' + p.kind + ' ' + (p.type || '') + ' ' + dir;
    row.dataset.node = node.id;
    row.dataset.port = p.id;
    row.dataset.kind = p.kind;
    row.dataset.dir = dir;
    row.dataset.ptype = p.type || '';
    const dot = document.createElement('span');
    dot.className = 'dot';
    row.appendChild(dot);
    const label = document.createElement('span');
    label.className = 'pl';
    label.textContent = p.label || (p.kind === 'flow' && dir === 'out' ? '' : '');
    row.appendChild(label);
    if (dir === 'in' && p.kind === 'data' && p.type === 'number') {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.step = '0.1'; inp.className = 'pin-default';
      inp.value = node.values[p.id] !== undefined ? node.values[p.id] : p.def;
      inp.oninput = () => { node.values[p.id] = parseFloat(inp.value) || 0; this._maybeRecompile(); };
      row.appendChild(inp);
    } else if (dir === 'in' && p.kind === 'data' && p.type === 'boolean') {
      const sel = document.createElement('select');
      sel.className = 'pin-default';
      for (const [lab, val] of [['true', 'true'], ['false', 'false']]) {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = lab;
        sel.appendChild(opt);
      }
      sel.value = node.values[p.id] !== undefined ? String(node.values[p.id]) : String(p.def);
      sel.onchange = () => { node.values[p.id] = sel.value === 'true'; this._maybeRecompile(); };
      row.appendChild(sel);
    }
    return row;
  }

  _portPos(nodeId, portId) {
    const nodeEl = this._nodeEl(nodeId);
    const node = this._node(nodeId);
    if (!nodeEl || !node) return null;
    const portEl = nodeEl.querySelector('[data-port="' + portId + '"]');
    if (!portEl) return null;
    return this._worldToScreen(node.x + portEl.offsetLeft + portEl.offsetWidth / 2, node.y + portEl.offsetTop + 6);
  }

  _drawWires() {
    this.wiresSvg.innerHTML = '';
    for (const w of this.wires) this._drawWire(w, false);
    if (this._temp) this._drawTemp(this._temp);
  }

  _drawWire(w, selected) {
    const p1 = this._portPos(w.fromNode, w.fromPort);
    const p2 = this._portPos(w.toNode, w.toPort);
    if (!p1 || !p2) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this._bezier(p1, p2));
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'graph-wire' + (selected ? ' selected' : ''));
    path.dataset.wire = w.id;
    path.addEventListener('click', (e) => { e.stopPropagation(); this.selected = w.id; this.render(); });
    this.wiresSvg.appendChild(path);
  }

  _bezier(p1, p2) {
    const dx = Math.max(24, Math.abs(p2.x - p1.x) * 0.5);
    return 'M ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) +
      ' C ' + (p1.x + dx).toFixed(1) + ' ' + p1.y.toFixed(1) +
      ', ' + (p2.x - dx).toFixed(1) + ' ' + p2.y.toFixed(1) +
      ', ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
  }

  _drawTemp(t) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this._bezier(t.p1, t.p2));
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'graph-wire temp');
    this.wiresSvg.appendChild(path);
  }

  // ---------- interaction ----------

  _bindEvents() {
    const vp = this.viewport;
    const rect = () => vp.getBoundingClientRect();
    const toWorld = (cx, cy) => ({ x: (cx - rect().left - this.camera.x) / this.camera.zoom, y: (cy - rect().top - this.camera.y) / this.camera.zoom });

    vp.addEventListener('pointerenter', () => { this.active = true; this.hintEl.style.opacity = 0; });
    vp.addEventListener('pointerleave', () => { this.active = false; });

    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('input, select')) return;
      const el = e.target.closest('.port, .graph-node, .gn-title');
      if (e.target.closest('.graph-wire')) return;
      if (el && el.classList.contains('port')) return this._portDown(e, el, rect());
      if (el) return this._nodeDown(e, el, rect());
      this.selected = null;
      this.render();
      this._drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: this.camera.x, cy: this.camera.y };
      vp.setPointerCapture(e.pointerId);
    });

    vp.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      if (this._drag.mode === 'pan') {
        this.camera.x = this._drag.cx + (e.clientX - this._drag.sx);
        this.camera.y = this._drag.cy + (e.clientY - this._drag.sy);
        this._applyCamera();
      } else if (this._drag.mode === 'node') {
        const w = toWorld(e.clientX, e.clientY);
        const node = this._node(this._drag.nodeId);
        if (node) { node.x = w.x - this._drag.ox; node.y = w.y - this._drag.oy; this._applyCamera(); }
      } else if (this._drag.mode === 'wire') {
        this._temp.p2 = { x: e.clientX - rect().left, y: e.clientY - rect().top };
        this._drawWires();
      }
    });

    vp.addEventListener('pointerup', (e) => {
      if (!this._drag) return;
      const drag = this._drag;
      this._drag = null;
      if (drag.mode === 'wire') {
        this._temp = null;
        this._drawWires();
        const over = document.elementFromPoint(e.clientX, e.clientY);
        const port = over && over.closest('.port');
        if (port && port.dataset.dir === 'in' && this._canConnect(drag.srcNode, drag.srcPort, port)) {
          this.wires = this.wires.filter((w) => !(w.toNode === port.dataset.node && w.toPort === port.dataset.port));
          this.wires.push({ id: 'w' + freshId(), fromNode: drag.srcNode, fromPort: drag.srcPort, toNode: port.dataset.node, toPort: port.dataset.port });
        }
        this.render();
      } else if (drag.mode === 'node') {
        this._maybeRecompile();
      }
    });

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const z = Math.min(1.6, Math.max(0.4, this.camera.zoom * factor));
      const r = rect();
      const wx = (e.clientX - r.left - this.camera.x) / this.camera.zoom;
      const wy = (e.clientY - r.top - this.camera.y) / this.camera.zoom;
      this.camera.zoom = z;
      this.camera.x = e.clientX - r.left - wx * z;
      this.camera.y = e.clientY - r.top - wy * z;
      this._applyCamera();
    }, { passive: false });

    vp.addEventListener('dblclick', (e) => {
      const w = toWorld(e.clientX, e.clientY);
      this.addNode('action_move', w.x - 60, w.y - 20);
    });

    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.deleteSelection(); }
      if (e.key === 'Escape') { this.selected = null; this.render(); }
    });
  }

  _nodeDown(e, el, rect) {
    const nodeEl = el.closest('.graph-node');
    const id = nodeEl.dataset.node;
    const node = this._node(id);
    if (!node) return;
    this.selected = id;
    this.render();
    const w = { x: (e.clientX - rect.left - this.camera.x) / this.camera.zoom, y: (e.clientY - rect.top - this.camera.y) / this.camera.zoom };
    this._drag = { mode: 'node', nodeId: id, ox: w.x - node.x, oy: w.y - node.y };
    this.viewport.setPointerCapture(e.pointerId);
  }

  _portDown(e, portEl, rect) {
    e.stopPropagation();
    const dir = portEl.dataset.dir;
    const nodeId = portEl.dataset.node;
    const portId = portEl.dataset.port;
    this.selected = null;
    this.render();
    if (dir === 'out') {
      const p1 = this._portPos(nodeId, portId);
      if (p1) {
        this._temp = { p1: p1, p2: { x: p1.x, y: p1.y }, srcNode: nodeId, srcPort: portId };
        this._drag = { mode: 'wire', srcNode: nodeId, srcPort: portId };
        this.viewport.setPointerCapture(e.pointerId);
      }
    } else {
      const existing = this.wires.find((w) => w.toNode === nodeId && w.toPort === portId);
      if (existing) this.wires = this.wires.filter((w) => w !== existing);
      const p1 = this._portPos(nodeId, portId);
      if (p1) {
        this._temp = { p1: p1, p2: { x: p1.x, y: p1.y }, srcNode: null };
        this._drag = { mode: 'wire', srcNode: null };
        this.viewport.setPointerCapture(e.pointerId);
      }
      this.render();
    }
  }

  _canConnect(fromNodeId, fromPort, targetPortEl) {
    if (!fromNodeId) return false;
    if (targetPortEl.dataset.node === fromNodeId) return false;
    if (targetPortEl.dataset.dir !== 'in') return false;
    const srcPortEl = this._nodeEl(fromNodeId) && this._nodeEl(fromNodeId).querySelector('[data-port="' + fromPort + '"]');
    if (!srcPortEl) return false;
    if (srcPortEl.dataset.kind !== targetPortEl.dataset.kind) return false;
    if (srcPortEl.dataset.kind === 'data' && srcPortEl.dataset.ptype !== targetPortEl.dataset.ptype) return false;
    return true;
  }

  _maybeRecompile() {
    if (this.onChange) this.onChange();
  }

  // ---------- persistence & compile ----------

  toJSON() {
    return { camera: this.camera, nodes: this.nodes, wires: this.wires.map((w) => ({ fromNode: w.fromNode, fromPort: w.fromPort, toNode: w.toNode, toPort: w.toPort })) };
  }

  loadJSON(json) {
    if (!json) return;
    if (json.camera) this.camera = json.camera;
    this.nodes = json.nodes || [];
    this.wires = (json.wires || []).map((w, i) => Object.assign({ id: 'w' + (i + 1), fromNode: w.fromNode, fromPort: w.fromPort, toNode: w.toNode, toPort: w.toPort }, {}));
    this.selected = null;
    this.render();
    this._applyCamera();
  }

  toCode() { return compileGraph(this.nodes, this.wires); }
}

if (typeof module !== 'undefined') module.exports = { NodeEditor, compileGraph, GRAPH_NODES };
