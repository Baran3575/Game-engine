'use strict';

// Struckd-style 3D game engine for the browser, built on Three.js.
// The `api` object (the `game` global in user scripts / blocks) is a thin,
// friendly wrapper around this class.

class GameEngine {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(9, 8, 9);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);

    this.ground = new THREE.Mesh(
      new THREE.BoxGeometry(40, 1, 40),
      new THREE.MeshLambertMaterial({ color: 0x6db36d })
    );
    this.ground.position.y = -0.5;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(40, 20, 0x444444, 0x999999);
    this.grid.position.y = 0.01;
    this.scene.add(this.grid);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.raycaster = new THREE.Raycaster();

    this.objects = [];
    this.byName = {};
    this.idc = 0;
    this.running = false;
    this.keys = new Set();
    this.gravity = 18;
    this.handlers = { start: [], stop: [], touch: [], key: [], custom: {} };
    this.timers = [];
    this.clock = new THREE.Clock();
    this.selected = null;
    this.onSceneChange = null;
    this.onLog = null;
    this.onRemoteEvent = null;
    this.setBackground(0x87ceeb);
    this.setGravity(18);

    this._bindInput();
    this._bindRemoteEvent();
    this._loop();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ---------- scene objects ----------

  spawn(d) {
    d = d || {};
    const o = {
      id: ++this.idc,
      name: d.name || 'obj' + this.idc,
      type: d.type || 'box',
      x: d.x || 0, y: d.y || 0, z: d.z || 0,
      rx: d.rx || 0, ry: d.ry || 0, rz: d.rz || 0,
      sx: d.sx || 1, sy: d.sy || 1, sz: d.sz || 1,
      color: d.color || '#ff4444',
      velocity: { x: 0, y: 0, z: 0 },
      gravity: d.gravity !== false,
      solid: d.solid !== false,
      spawn: null,
      _mesh: this._buildMesh(d.type || 'box', d.color || '#ff4444')
    };
    o._mesh._gameObj = o;
    o.spawn = { x: o.x, y: o.y, z: o.z, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz };
    o.destroy = () => this._remove(o);
    o.move = (dx, dy, dz) => { o.x += dx; o.y += dy; o.z += dz; };
    o.rotate = (dx, dy, dz) => { o.rx += dx; o.ry += dy; o.rz += dz; };
    o.scaleTo = (s) => { o.sx = o.sy = o.sz = s; };
    o.setColor = (c) => { o.color = c; o._mesh.material.color.set(c); };
    o.toJSON = () => ({
      id: o.id, name: o.name, type: o.type,
      x: o.x, y: o.y, z: o.z, rx: o.rx, ry: o.ry, rz: o.rz,
      sx: o.sx, sy: o.sy, sz: o.sz, color: o.color,
      velocity: { x: o.velocity.x, y: o.velocity.y, z: o.velocity.z },
      solid: o.solid
    });
    this.objects.push(o);
    this.byName[o.name] = o;
    if (this.onSceneChange) this.onSceneChange();
    return o;
  }

  _buildMesh(type, color) {
    let geo;
    if (type === 'sphere') geo = new THREE.SphereGeometry(0.5, 24, 24);
    else if (type === 'cylinder') geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    else geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: this._hex(color) }));
    this.scene.add(mesh);
    return mesh;
  }

  _hex(c) { return typeof c === 'number' ? c : (parseInt(String(c).replace('#', ''), 16) || 0xff4444); }

  _remove(o) {
    this.scene.remove(o._mesh);
    o._mesh.geometry.dispose();
    o._mesh.material.dispose();
    this.objects = this.objects.filter(x => x !== o);
    if (this.byName[o.name] === o) delete this.byName[o.name];
    if (this.selected === o) this.selected = null;
    if (this.onSceneChange) this.onSceneChange();
  }

  find(name) {
    if (!name || name === 'this') return this.objects[0] || null;
    return this.byName[name] || null;
  }

  clear() {
    const all = this.objects.slice();
    for (const o of all) this._remove(o);
  }

  // ---------- input ----------

  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.objects.map((o) => o._mesh));
    return hit.length ? hit[0].object._gameObj : null;
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      for (const h of this.handlers.key) {
        if (h.key === '*' || h.key === e.code) {
          try { h.fn({ code: e.code, key: e.key }); } catch (err) { this.log('key error: ' + err); }
        }
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  _bindRemoteEvent() {
    const push = (name, payload) => { if (this.onRemoteEvent) this.onRemoteEvent(name, payload); };
    this._wrapFire = (name, payload) => {
      const list = this.handlers[name];
      if (list) for (const fn of list.slice()) {
        try { Array.isArray(payload) ? fn(...payload) : fn(payload); }
        catch (err) { this.log(name + ' error: ' + err); }
      }
      push(name, payload);
    };
  }

  // ---------- game loop ----------

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.running) this._step(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _half(o) { return Math.max(o.sx, o.sy, o.sz) * 0.5; }

  _step(dt) {
    for (const o of this.objects) {
      if (o.gravity) o.velocity.y -= this.gravity * dt;
      o.x += o.velocity.x * dt;
      o.y += o.velocity.y * dt;
      o.z += o.velocity.z * dt;
      const half = this._half(o);
      if (o.y - half < 0 && o.velocity.y <= 0) { o.y = half; o.velocity.y = 0; }
      o._mesh.position.set(o.x, o.y, o.z);
      o._mesh.rotation.set(o.rx, o.ry, o.rz);
      o._mesh.scale.set(o.sx, o.sy, o.sz);
    }
    for (let i = 0; i < this.objects.length; i++) {
      const a = this.objects[i];
      if (!a.solid) continue;
      for (let j = i + 1; j < this.objects.length; j++) {
        const b = this.objects[j];
        if (!b.solid) continue;
        if (this._overlap(a, b)) this._wrapFire('touch', [a, b]);
      }
    }
    for (const t of this.timers) {
      t.acc += dt;
      while (t.acc >= t.interval) { t.acc -= t.interval; try { t.fn(); } catch (err) { this.log('timer error: ' + err); } }
    }
  }

  _overlap(a, b) {
    const ha = this._half(a), hb = this._half(b);
    return Math.abs(a.x - b.x) < ha + hb &&
           Math.abs(a.y - b.y) < ha + hb &&
           Math.abs(a.z - b.z) < ha + hb;
  }

  // ---------- control ----------

  start(programCode) {
    this.stop();
    this.running = true;
    for (const o of this.objects) {
      o.x = o.spawn.x; o.y = o.spawn.y; o.z = o.spawn.z;
      o.rx = o.spawn.rx; o.ry = o.spawn.ry; o.rz = o.spawn.rz;
      o.sx = o.spawn.sx; o.sy = o.spawn.sy; o.sz = o.spawn.sz;
      o.velocity = { x: 0, y: 0, z: 0 };
      if (o.color) o._mesh.material.color.set(this._hex(o.color));
    }
    if (programCode) {
      try { new Function('game', programCode)(this.api); }
      catch (err) { this.log(err); }
    }
    this._wrapFire('start');
  }

  stop() {
    this.running = false;
    this._wrapFire('stop');
    this.handlers = { start: [], stop: [], touch: [], key: [], custom: {} };
    this.timers = [];
    this.keys.clear();
  }

  setGravity(v) { this.gravity = v; }
  setBackground(c) { this.scene.background = new THREE.Color(this._hex(c)); }
  log(msg) { if (this.onLog) this.onLog(String(msg)); }

  // ---------- user script API ----------

  get api() {
    const e = this;
    const api = {
      get this() { return e.objects[0] || null; },
      get objects() { return e.objects; },
      get running() { return e.running; },
      spawn: (d) => e.spawn(d),
      find: (n) => e.find(n),
      each: (fn) => e.objects.slice().forEach(fn),
      clear: () => e.clear(),
      log: (m) => e.log(m),
      onStart: (fn) => e.handlers.start.push(fn),
      onStop: (fn) => e.handlers.stop.push(fn),
      onKey: (key, fn) => e.handlers.key.push({ key, fn }),
      on: (name, fn) => {
        if (name === 'start' || name === 'stop' || name === 'touch') e.handlers[name].push(fn);
        else (e.handlers.custom[name] = e.handlers.custom[name] || []).push(fn);
      },
      broadcast: (name, ...args) => {
        for (const fn of (e.handlers.custom[name] || []).slice()) { try { fn(...args); } catch (err) { e.log('event error: ' + err); } }
      },
      wait: (sec) => new Promise((r) => setTimeout(r, sec * 1000)),
      _yield: () => new Promise((r) => requestAnimationFrame(r)),
      every: (sec, fn) => { e.timers.push({ interval: sec, acc: 0, fn }); },
      setGravity: (v) => e.setGravity(v),
      setBackground: (c) => e.setBackground(c),
      gravity: 18
    };
    Object.defineProperty(api, 'gravity', {
      get: () => e.gravity,
      set: (v) => e.setGravity(v)
    });
    return api;
  }

  // ---------- MCP remote control ----------

  remote(cmd, args) {
    args = args || {};
    switch (cmd) {
      case 'spawn': return this.spawn({
        type: args.type, name: args.name, x: args.x, y: args.y, z: args.z,
        color: args.color, sx: args.scale, sy: args.scale, sz: args.scale
      }).toJSON();
      case 'remove': { const o = this.find(args.object); if (o) o.destroy(); return { ok: !!o }; }
      case 'setProperty': {
        const o = this.find(args.object);
        if (!o) throw new Error('object not found: ' + args.object);
        if (args.prop === 'color') o.setColor(args.value);
        else if (args.prop === 'velocity' && typeof args.value === 'object') Object.assign(o.velocity, args.value);
        else if (args.prop in o) o[args.prop] = args.value;
        else throw new Error('no such property: ' + args.prop);
        return o.toJSON();
      }
      case 'getScene': return { objects: this.objects.map((o) => o.toJSON()), running: this.running };
      case 'runScript': { new Function('game', args.code)(this.api); return { ok: true }; }
      case 'start': this.start(args.program || null); return { running: true };
      case 'stop': this.stop(); return { running: false };
      case 'setBackground': this.setBackground(args.color); return { ok: true };
      case 'setGravity': this.setGravity(args.value); return { ok: true };
      case 'clear': this.clear(); return { ok: true };
      default: throw new Error('unknown command: ' + cmd);
    }
  }
}
