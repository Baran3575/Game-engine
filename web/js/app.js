'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const engine = new GameEngine($('scene-container'));

  // ---------- logging ----------
  const logEl = $('log');
  function log(msg) {
    const line = document.createElement('div');
    line.textContent = '> ' + msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
  engine.onLog = log;
  window.addEventListener('error', (e) => log('[error] ' + e.message));
  window.addEventListener('unhandledrejection', (e) => log('[error] ' + (e.reason && e.reason.message || e.reason)));

  // ---------- blocks ----------
  const blocks = setupBlocks(engine);
  const workspace = Blockly.inject($('blocklyDiv'), {
    toolbox: gameToolbox(),
    theme: gameTheme,
    media: 'https://cdn.jsdelivr.net/npm/blockly@9.3.3/media/',
    trashcan: true,
    scrollbars: true,
    zoom: { controls: true, wheel: true },
    grid: { spacing: 20, length: 3, colour: '#2a2c33', snap: true }
  });
  blocks.setWorkspace(workspace);
  const blocksToCode = blocks.blocksToCode;

  // ---------- project state ----------
  const STORE = 'webstruckd-projects';
  const CURRENT = 'webstruckd-current';
  const scriptInput = $('script-input');
  const projectSelect = $('project-select');
  let currentName = null;

  function sceneJSON() { return engine.objects.map((o) => o.toJSON()); }
  function currentProgram() { return blocksToCode() + '\n\n' + scriptInput.value; }

  function saveCurrent() {
    if (!currentName) return;
    const projects = JSON.parse(localStorage.getItem(STORE) || '{}');
    projects[currentName] = {
      blocks: Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace)),
      script: scriptInput.value,
      scene: sceneJSON()
    };
    localStorage.setItem(STORE, JSON.stringify(projects));
    localStorage.setItem(CURRENT, currentName);
    refreshProjectSelect();
    log('Saved "' + currentName + '"');
  }

  function loadProject(name) {
    const projects = JSON.parse(localStorage.getItem(STORE) || '{}');
    const p = projects[name];
    if (!p) return;
    engine.clear();
    for (const d of p.scene) engine.spawn(d);
    scriptInput.value = p.script || '';
    workspace.clear();
    if (p.blocks) Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(p.blocks), workspace);
    currentName = name;
    localStorage.setItem(CURRENT, name);
    log('Loaded "' + name + '"');
  }

  function refreshProjectSelect() {
    const projects = JSON.parse(localStorage.getItem(STORE) || '{}');
    projectSelect.innerHTML = '';
    for (const name of Object.keys(projects)) {
      const opt = document.createElement('option');
      opt.value = opt.textContent = name;
      projectSelect.appendChild(opt);
    }
    if (currentName) projectSelect.value = currentName;
  }

  function newProject() {
    engine.clear();
    scriptInput.value = '';
    workspace.clear();
    currentName = 'Untitled';
    refreshProjectSelect();
    log('New project');
  }

  $('btn-save').onclick = saveCurrent;
  $('btn-new').onclick = () => { if (confirm('Start a new project? Unsaved changes are lost.')) newProject(); };
  $('btn-delete').onclick = () => {
    if (!currentName || !confirm('Delete "' + currentName + '"?')) return;
    const projects = JSON.parse(localStorage.getItem(STORE) || '{}');
    delete projects[currentName];
    localStorage.setItem(STORE, JSON.stringify(projects));
    localStorage.removeItem(CURRENT);
    newProject();
  };
  projectSelect.onchange = () => loadProject(projectSelect.value);

  // ---------- scene inspector ----------
  const objListEl = $('obj-list');
  const propsEl = $('props');
  const propsTitle = $('props-title');
  let selected = null;

  engine.onSceneChange = () => {
    renderObjectList();
    renderProps();
  };

  function renderObjectList() {
    objListEl.innerHTML = '';
    for (const o of engine.objects) {
      const b = document.createElement('button');
      b.className = 'obj' + (o === selected ? ' sel' : '');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = o.color;
      b.appendChild(sw);
      b.appendChild(document.createTextNode(o.name + '  (' + o.type + ')'));
      b.onclick = () => { selected = o; renderObjectList(); renderProps(); };
      objListEl.appendChild(b);
    }
    if (!engine.objects.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No objects yet - add one below.';
      empty.style.color = 'var(--muted)';
      empty.style.fontSize = '12px';
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

  // ---------- tabs ----------
  const tabs = document.querySelectorAll('.tab');
  for (const tab of tabs) {
    tab.onclick = () => {
      for (const t of tabs) t.classList.toggle('active', t === tab);
      for (const p of document.querySelectorAll('.panel')) p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab);
      if (tab.dataset.tab === 'blocks') {
        engine.resize();
        Blockly.svgResize(workspace);
      } else engine.resize();
    };
  }

  // ---------- play / stop ----------
  $('btn-play').onclick = () => {
    saveCurrent();
    engine.start(currentProgram());
    log('Playing "' + (currentName || 'untitled') + '"');
  };
  $('btn-stop').onclick = () => { engine.stop(); log('Stopped'); };
  $('btn-run-script').onclick = () => {
    try { new Function('game', scriptInput.value)(engine.api); log('Script ran'); }
    catch (e) { log('[error] ' + (e.message || e)); }
  };

  // ---------- MCP bridge ----------
  initBridge(engine, $('bridge-status'));
  $('btn-bridge-settings').onclick = () => {
    const url = prompt('MCP bridge WebSocket URL:', localStorage.getItem('webstruckd-bridge') || 'ws://localhost:8080');
    if (!url) return;
    localStorage.setItem('webstruckd-bridge', url);
    location.reload();
  };

  // ---------- defaults / boot ----------
  scriptInput.value = localStorage.getItem('webstruckd-script') || '// Scripts run on Play, together with your block code.\n// `game` is your engine API.\n\ngame.onStart(function () {\n  game.log("Game started!");\n});\n\ngame.onKey("Space", function () {\n  const p = game.find("this");\n  if (p) p.velocity.y = 8;\n});\n\ngame.on("touch", function (a, b) {\n  game.log(a.name + " touched " + b.name);\n});\n';
  scriptInput.oninput = () => localStorage.setItem('webstruckd-script', scriptInput.value);

  const savedName = localStorage.getItem(CURRENT);
  const projects = JSON.parse(localStorage.getItem(STORE) || '{}');
  if (savedName && projects[savedName]) loadProject(savedName);
  else newProject();

  window.app = {
    engine: engine,
    currentProgram: currentProgram,
    loadBlocksXml: (xml) => {
      workspace.clear();
      Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), workspace);
    }
  };
})();
