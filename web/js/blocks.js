'use strict';

// Blockly blocks, toolbox and a custom flat/dark theme for the game engine.
// Blocks compile to JavaScript that drives the `game` API (see engine.js).
// The theme swaps Scratch-style rainbow colours for a muted, cohesive palette.

// ---- custom theme (flat, dark, not-Scratch) ----
const gameTheme = Blockly.Theme.defineTheme('studio', {
  base: Blockly.Themes.Classic,
  blockStyles: {
    event_blocks:   { colourPrimary: '#3d4a76', colourSecondary: '#54618f', colourTertiary: '#2b3354' },
    action_blocks:  { colourPrimary: '#6b4ea0', colourSecondary: '#8368b8', colourTertiary: '#523a7d' },
    control_blocks: { colourPrimary: '#3f7a66', colourSecondary: '#579480', colourTertiary: '#2f5c4c' },
    logic_blocks:   { colourPrimary: '#7a6a3f', colourSecondary: '#93864f', colourTertiary: '#5c4f2e' },
    math_blocks:    { colourPrimary: '#3f6a80', colourSecondary: '#568699', colourTertiary: '#2f5060' },
    object_blocks:  { colourPrimary: '#a24a4a', colourSecondary: '#ba6363', colourTertiary: '#7d3737' }
  },
  categoryStyles: {
    cat_events:  { colour: '#3d4a76' },
    cat_actions: { colour: '#6b4ea0' },
    cat_control: { colour: '#3f7a66' },
    cat_logic:   { colour: '#7a6a3f' },
    cat_math:    { colour: '#3f6a80' },
    cat_objects: { colour: '#a24a4a' }
  },
  componentStyles: {
    workspaceBackgroundColour: '#15161a',
    toolboxBackgroundColour: '#1b1d23',
    toolboxForegroundColour: '#9aa0ab',
    flyoutBackgroundColour: '#22252c',
    flyoutForegroundColour: '#e6e7ea',
    flyoutOpacity: 1,
    scrollbarColour: '#3a3d47',
    scrollbarOpacity: 0.9,
    blockShadowColour: '#000000',
    insertionMarkerColour: '#4f8cff',
    insertionMarkerOpacity: 0.4,
    markerColour: '#4f8cff',
    cursorColour: '#4f8cff',
    selectionColour: '#4f8cff',
    selectionOpacity: 0.25
  }
});

function setupBlocks(engine) {
  const JS = Blockly.JavaScript;

  const KEYS = [
    ['any', '*'], ['space', 'Space'], ['up arrow', 'ArrowUp'], ['down arrow', 'ArrowDown'],
    ['left arrow', 'ArrowLeft'], ['right arrow', 'ArrowRight'], ['W', 'KeyW'],
    ['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['enter', 'Enter']
  ];

  const SHAPES = [['box', 'box'], ['sphere', 'sphere'], ['cylinder', 'cylinder']];

  // ---- value: an object (dropdown, live from the scene) ----
  Blockly.Blocks['value_object'] = {
    init() {
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown(() => {
          const names = Object.keys(engine.byName).map((n) => [n, n]);
          return names.length ? names.concat([['this (first)', 'this']]) : [['this (first)', 'this']];
        }), 'OBJ');
      this.setOutput(true, 'Object');
      this.setStyle('object_blocks');
    }
  };
  JS['value_object'] = (block) => {
    const n = block.getFieldValue('OBJ');
    return [n === 'this' ? 'game.this' : 'game.find(' + JSON.stringify(n) + ')', JS.ORDER_ATOMIC];
  };

  // ---- events ----
  Blockly.Blocks['event_when_started'] = {
    init() {
      this.appendDummyInput().appendField('when game starts');
      this.appendStatementInput('DO');
      this.setNextStatement(false);
      this.setStyle('event_blocks');
    }
  };
  JS['event_when_started'] = (block) =>
    'game.onStart(async function () {\n' + JS.statementToCode(block, 'DO') + '});\n';

  Blockly.Blocks['event_when_key'] = {
    init() {
      this.appendDummyInput().appendField('when key')
        .appendField(new Blockly.FieldDropdown(KEYS), 'KEY').appendField('pressed');
      this.appendStatementInput('DO');
      this.setNextStatement(false);
      this.setStyle('event_blocks');
    }
  };
  JS['event_when_key'] = (block) =>
    'game.onKey(' + JSON.stringify(block.getFieldValue('KEY')) + ', async function () {\n' +
    JS.statementToCode(block, 'DO') + '});\n';

  Blockly.Blocks['event_when_event'] = {
    init() {
      this.appendDummyInput().appendField('when I receive')
        .appendField(new Blockly.FieldTextInput('go'), 'NAME');
      this.appendStatementInput('DO');
      this.setNextStatement(false);
      this.setStyle('event_blocks');
    }
  };
  JS['event_when_event'] = (block) =>
    'game.on(' + JSON.stringify(block.getFieldValue('NAME')) + ', async function () {\n' +
    JS.statementToCode(block, 'DO') + '});\n';

  Blockly.Blocks['event_broadcast'] = {
    init() {
      this.appendDummyInput().appendField('broadcast')
        .appendField(new Blockly.FieldTextInput('go'), 'NAME');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('event_blocks');
    }
  };
  JS['event_broadcast'] = (block) => 'game.broadcast(' + JSON.stringify(block.getFieldValue('NAME')) + ');\n';

  // ---- actions ----
  function actionDef(label, fields) {
    return {
      init() {
        const row = this.appendValueInput('OBJ').setCheck('Object').appendField(label);
        for (const f of fields) row.appendField(f.name).appendField(new Blockly.FieldNumber(f.init, -1000, 1000, f.step || 0.1), f.id);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('action_blocks');
      }
    };
  }

  Blockly.Blocks['action_move'] = actionDef('move', [
    { id: 'DX', name: 'x', init: 0 }, { id: 'DY', name: 'y', init: 0 }, { id: 'DZ', name: 'z', init: 0 }
  ]);
  JS['action_move'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.move(' + [block.getFieldValue('DX'), block.getFieldValue('DY'), block.getFieldValue('DZ')].join(', ') + ');\n';
  };

  Blockly.Blocks['action_rotate'] = actionDef('rotate', [
    { id: 'RX', name: 'x', init: 0 }, { id: 'RY', name: 'y', init: 0 }, { id: 'RZ', name: 'z', init: 0 }
  ]);
  JS['action_rotate'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.rotate(' + [block.getFieldValue('RX'), block.getFieldValue('RY'), block.getFieldValue('RZ')].join(', ') + ');\n';
  };

  Blockly.Blocks['action_scale'] = {
    init() {
      this.appendValueInput('OBJ').setCheck('Object').appendField('set scale of');
      this.appendDummyInput().appendField('to').appendField(new Blockly.FieldNumber(1, 0.1, 100, 0.1), 'S');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('action_blocks');
    }
  };
  JS['action_scale'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.scaleTo(' + block.getFieldValue('S') + ');\n';
  };

  Blockly.Blocks['action_setcolor'] = {
    init() {
      this.appendValueInput('OBJ').setCheck('Object').appendField('set color of');
      this.appendDummyInput().appendField('to').appendField(new Blockly.FieldColour('#ff4444'), 'COLOR');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('action_blocks');
    }
  };
  JS['action_setcolor'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.setColor(' + JSON.stringify(block.getFieldValue('COLOR')) + ');\n';
  };

  Blockly.Blocks['action_setvelocity'] = actionDef('set velocity of', [
    { id: 'VX', name: 'x', init: 0 }, { id: 'VY', name: 'y', init: 0 }, { id: 'VZ', name: 'z', init: 0 }
  ]);
  JS['action_setvelocity'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.velocity = { x: ' + block.getFieldValue('VX') + ', y: ' + block.getFieldValue('VY') +
      ', z: ' + block.getFieldValue('VZ') + ' };\n';
  };

  Blockly.Blocks['action_spawn'] = {
    init() {
      this.appendDummyInput().appendField('spawn').appendField(new Blockly.FieldDropdown(SHAPES), 'TYPE')
        .appendField('named').appendField(new Blockly.FieldTextInput('rock'), 'NAME')
        .appendField('color').appendField(new Blockly.FieldColour('#ff4444'), 'COLOR');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('action_blocks');
    }
  };
  JS['action_spawn'] = (block) =>
    'game.spawn({ type: ' + JSON.stringify(block.getFieldValue('TYPE')) + ', name: ' +
    JSON.stringify(block.getFieldValue('NAME')) + ', color: ' + JSON.stringify(block.getFieldValue('COLOR')) + ', y: 3 });\n';

  Blockly.Blocks['action_destroy'] = {
    init() {
      this.appendValueInput('OBJ').setCheck('Object').appendField('destroy');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('action_blocks');
    }
  };
  JS['action_destroy'] = (block) => {
    const o = JS.valueToCode(block, 'OBJ', JS.ORDER_NONE) || 'game.this';
    return o + '.destroy();\n';
  };

  // ---- control ----
  Blockly.Blocks['control_wait'] = {
    init() {
      this.appendDummyInput().appendField('wait')
        .appendField(new Blockly.FieldNumber(1, 0, 100, 0.1), 'SECS').appendField('seconds');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('control_blocks');
    }
  };
  JS['control_wait'] = (block) => 'await game.wait(' + block.getFieldValue('SECS') + ');\n';

  Blockly.Blocks['control_forever'] = {
    init() {
      this.appendDummyInput().appendField('forever');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('control_blocks');
    }
  };
  JS['control_forever'] = (block) =>
    'while (true) {\n  await game._yield();\n' + JS.statementToCode(block, 'DO') + '}\n';

  Blockly.Blocks['control_repeat'] = {
    init() {
      this.appendDummyInput().appendField('repeat')
        .appendField(new Blockly.FieldNumber(10, 0, 100000), 'TIMES').appendField('times');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('control_blocks');
    }
  };
  JS['control_repeat'] = (block) =>
    'for (var i$ = 0; i$ < ' + block.getFieldValue('TIMES') + '; i$++) {\n  await game._yield();\n' +
    JS.statementToCode(block, 'DO') + '}\n';

  let currentWorkspace = null;
  return {
    setWorkspace(w) { currentWorkspace = w; },
    blocksToCode() { return JS.workspaceToCode(currentWorkspace); }
  };
}

function gameToolbox() {
  return `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display:none">
  <category name="Events" colour="3d4a76">
    <block type="event_when_started"></block>
    <block type="event_when_key"></block>
    <block type="event_when_event"></block>
    <block type="event_broadcast"></block>
  </category>
  <category name="Actions" colour="6b4ea0">
    <block type="action_move"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_rotate"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_scale"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_setcolor"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_setvelocity"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_spawn"></block>
    <block type="action_destroy"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
  </category>
  <category name="Control" colour="3f7a66">
    <block type="control_repeat"></block>
    <block type="control_forever"></block>
    <block type="control_wait"></block>
    <block type="controls_if"></block>
  </category>
  <category name="Logic" colour="7a6a3f">
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="Math" colour="3f6a80">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
  </category>
  <category name="Objects" colour="a24a4a">
    <block type="value_object"></block>
  </category>
</xml>`;
}
