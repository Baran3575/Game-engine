'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  // ---------- fatal error surface ----------
  const logEl = $('log');
  const consoleEl = $('console');
  function log(msg, isErr) {
    const line = document.createElement('div');
    if (isErr) line.className = 'err';
    line.textContent = '> ' + msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    if (isErr) consoleEl.classList.add('open');
  }
  window.addEventListener('error', (e) => log('[error] ' + e.message, true));
  window.addEventListener('unhandledrejection', (e) => log('[error] ' + (e.reason && e.reason.message || e.reason), true));

  // ---------- engine + blueprint graph ----------
  const engine = new GameEngine($('scene-container'));
  engine.onLog = log;
  const graph = new NodeEditor($('graphDiv'));
  graph.objectNames = () => engine.objects.map((o) => o.name);
  graph.onChange = () => {};

  // ---------- project state ----------
  const STORE = 'webstruckd-projects';
  const CURRENT = 'webstruckd-current';
  const scriptInput = $('script-input');
  const projectNameInput = $('project-name');
  const sideProjects = $('side-projects');
  let currentName = null;

  function sceneJSON() { return engine.objects.map((o) => o.toJSON()); }
  function currentProgram() { return graph.toCode() + '\n\n' + scriptInput.value; }

  function allProjects() { return JSON.parse(localStorage.getItem(STORE) || '{}'); }

  function saveCurrent() {
    if (!currentName) return;
    const projects = allProjects();
    projects[currentName] = { graph: graph.toJSON(), script: scriptInput.value, scene: sceneJSON() };
    localStorage.setItem(STORE, JSON.stringify(projects));
    localStorage.setItem(CURRENT, currentName);
    refreshProjects();
    log('Saved "' + currentName + '"');
  }

  function loadProject(name) {
    const p = allProjects()[name];
    if (!p) return;
    engine.clear();
    for (const d of p.scene) engine.spawn(d);
    scriptInput.value = p.script || '';
    graph.loadJSON(p.graph);
    currentName = name;
    projectNameInput.value = name;
    localStorage.setItem(CURRENT, name);
    refreshProjects();
    log('Loaded "' + name + '"');
  }

  function refreshProjects() {
    sideProjects.innerHTML = '';
    for (const name of Object.keys(allProjects())) {
      const row = document.createElement('div');
      row.className = 'proj' + (name === currentName ? ' active' : '');
      const btn = document.createElement('button');
      btn.className = 'proj-name';
      btn.textContent = name;
      btn.onclick = () => loadProject(name);
      const del = document.createElement('button');
      del.className = 'proj-del';
      del.textContent = '\u00d7';
      del.title = 'Delete project';
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm('Delete "' + name + '"?')) return;
        const projects = allProjects();
        delete projects[name];
        localStorage.setItem(STORE, JSON.stringify(projects));
        if (name === currentName) {
          localStorage.removeItem(CURRENT);
          newProject();
        } else refreshProjects();
      };
      row.appendChild(btn);
      row.appendChild(del);
      sideProjects.appendChild(row);
    }
  }

  function newProject() {
    engine.clear();
    scriptInput.value = '';
    graph.clear();
    currentName = 'Untitled';
    projectNameInput.value = 'Untitled';
    refreshProjects();
    log('New project');
  }

  $('btn-save').onclick = saveCurrent;
  $('btn-new').onclick = () => { if (confirm('Start a new project? Unsaved changes are lost.')) newProject(); };
  projectNameInput.onchange = () => {
    const name = projectNameInput.value.trim() || 'Untitled';
    if (name === currentName) return;
    const projects = allProjects();
    if (currentName && projects[currentName]) {
      projects[name] = projects[currentName];
      delete projects[currentName];
    }
    localStorage.setItem(STORE, JSON.stringify(projects));
    currentName = name;
    localStorage.setItem(CURRENT, name);
    refreshProjects();
  };

  // ---------- navigation ----------
  const navBtns = document.querySelectorAll('.nav-btn');
  function switchTab(tab) {
    for (const b of navBtns) b.classList.toggle('active', b.dataset.tab === tab);
    for (const p of document.querySelectorAll('.panel')) p.classList.toggle('active', p.id === 'panel-' + tab);
    engine.resize();
  }
  for (const b of navBtns) b.onclick = () => switchTab(b.dataset.tab);

  // ---------- scene inspector ----------
  const objListEl = $('obj-list');
  const propsEl = $('props');
  const propsTitle = $('props-title');
  let selected = null;

  engine.onSceneChange = () => { renderObjectList(); renderProps(); };

  function renderObjectList() {
    objListEl.innerHTML = '';
    for (const o of engine.objects) {
      const b = document.createElement('button');
      b.className = 'obj' + (o === selected ? ' sel' : '');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = o.color;
      b.appendChild(sw);
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = o.name;
      b.appendChild(name);
      const badge = document.createElement('span');
      badge.className = 'type-badge';
      badge.textContent = o.type;
      b.appendChild(badge);
      b.onclick = () => { selected = o; renderObjectList(); renderProps(); };
      objListEl.appendChild(b);
    }
    if (!engine.objects.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No objects yet. Add one above, or spawn from the Blueprint graph.';
      objListEl.appendChild(empty);
    }
  }

  const PROP_FIELDS = [
    ['x', 'X'], ['y', 'Y'], ['z', 'Z'],
    ['rx', 'Rot X'], ['ry', 'Rot Y'], ['rz', 'Rot Z'],
    ['sx', 'Scale X'], ['sy', 'Scale Y'], ['sz', 'Scale Z']
  ];

  function renderProps() {
    propsEl.innerHTML = '';
    propsTitle.classList.toggle('hidden', !selected);
    if (!selected) return;
    const g1 = document.createElement('div');
    g1.className = 'group'; g1.textContent = 'Transform';
    propsEl.appendChild(g1);
    for (const [prop, label] of PROP_FIELDS) {
      const lab = document.createElement('span');
      lab.className = 'label';
      lab.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.1';
      input.value = selected[prop];
      input.oninput = () => { selected[prop] = parseFloat(input.value) || 0; };
      propsEl.appendChild(lab);
      propsEl.appendChild(input);
    }
    const g2 = document.createElement('div');
    g2.className = 'group'; g2.textContent = 'Appearance';
    propsEl.appendChild(g2);
    const labColor = document.createElement('span');
    labColor.className = 'label';
    labColor.textContent = 'Color';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = selected.color;
    colorInput.oninput = () => selected.setColor(colorInput.value);
    propsEl.appendChild(labColor);
    propsEl.appendChild(colorInput);
    const labName = document.createElement('span');
    labName.className = 'label';
    labName.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = selected.name;
    nameInput.onchange = () => {
      const old = selected.name;
      delete engine.byName[old];
      selected.name = nameInput.value || old;
      engine.byName[selected.name] = selected;
      renderObjectList();
    };
    propsEl.appendChild(labName);
    propsEl.appendChild(nameInput);
  }

  function addObject(type) {
    const count = engine.objects.filter((o) => o.type === type).length;
    const o = engine.spawn({ type: type, name: type + (count + 1), x: Math.random() * 4 - 2, y: 3, z: Math.random() * 4 - 2, color: '#ff4444' });
    selected = o;
    renderObjectList();
    renderProps();
  }
  $('add-box').onclick = () => addObject('box');
  $('add-sphere').onclick = () => addObject('sphere');
  $('add-cylinder').onclick = () => addObject('cylinder');
  $('btn-dup').onclick = () => {
    if (!selected) return;
    const d = selected.toJSON();
    d.x += 1.5;
    d.name += '-copy';
    engine.spawn(d);
    renderObjectList();
  };
  $('btn-del').onclick = () => { if (selected) { selected.destroy(); selected = null; renderObjectList(); renderProps(); } };

  // click an object in the 3D view to select it
  (function wirePick() {
    const canvas = engine.renderer.domElement;
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const dist = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
      down = null;
      if (dist > 6) return;
      const o = engine.pick(e.clientX, e.clientY);
      selected = o;
      renderObjectList();
      renderProps();
    });
  })();

  // ---------- play / stop ----------
  $('btn-play').onclick = () => {
    saveCurrent();
    engine.start(currentProgram());
    log('Playing "' + (currentName || 'untitled') + '"');
  };
  $('btn-stop').onclick = () => { engine.stop(); log('Stopped'); };
  $('btn-run-script').onclick = () => {
    try { new Function('game', scriptInput.value)(engine.api); log('Script ran'); }
    catch (e) { log('[error] ' + (e.message || e), true); }
  };

  // ---------- console drawer ----------
  $('btn-console').onclick = () => consoleEl.classList.toggle('open');

  // ---------- MCP bridge ----------
  initBridge(engine, $('bridge-status'));
  $('btn-bridge-settings').onclick = () => {
    const url = prompt('MCP bridge WebSocket URL:', localStorage.getItem('webstruckd-bridge') || 'ws://localhost:8080');
    if (!url) return;
    localStorage.setItem('webstruckd-bridge', url);
    location.reload();
  };

  // ---------- defaults / boot ----------
  scriptInput.value = localStorage.getItem('webstruckd-script') || '// Scripts run on Play, together with your Blueprint graph.\n// `game` is your engine API.\n\ngame.onStart(function () {\n  game.log("Game started!");\n});\n\ngame.onKey("Space", function () {\n  const p = game.find("this");\n  if (p) p.velocity.y = 8;\n});\n\ngame.on("touch", function (a, b) {\n  game.log(a.name + " touched " + b.name);\n});\n';
  scriptInput.oninput = () => localStorage.setItem('webstruckd-script', scriptInput.value);

  const savedName = localStorage.getItem(CURRENT);
  const projects = allProjects();
  if (savedName && projects[savedName]) loadProject(savedName);
  else newProject();

  window.app = {
    engine: engine,
    graph: graph,
    currentProgram: currentProgram,
    loadGraph: (json) => graph.loadJSON(json),
    switchTab: switchTab
  };
})();
