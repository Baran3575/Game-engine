'use strict';

// Blockly blocks and toolbox for the game engine.
// Blocks compile to JavaScript that drives the `game` API (see engine.js).

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
      this.setColour(200);
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
      this.setColour(120);
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
      this.setColour(120);
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
      this.setColour(120);
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
      this.setColour(120);
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
        this.setColour(290);
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
      this.setColour(290);
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
      this.setColour(290);
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
      this.setColour(290);
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
      this.setColour(290);
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
      this.setColour(60);
    }
  };
  JS['control_wait'] = (block) => 'await game.wait(' + block.getFieldValue('SECS') + ');\n';

  Blockly.Blocks['control_forever'] = {
    init() {
      this.appendDummyInput().appendField('forever');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(60);
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
      this.setColour(60);
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
  <category name="Events" colour="120">
    <block type="event_when_started"></block>
    <block type="event_when_key"></block>
    <block type="event_when_event"></block>
    <block type="event_broadcast"></block>
  </category>
  <category name="Actions" colour="290">
    <block type="action_move"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_rotate"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_scale"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_setcolor"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_setvelocity"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
    <block type="action_spawn"></block>
    <block type="action_destroy"><value name="OBJ"><shadow type="value_object"></shadow></value></block>
  </category>
  <category name="Control" colour="60">
    <block type="control_repeat"></block>
    <block type="control_forever"></block>
    <block type="control_wait"></block>
    <block type="controls_if"></block>
  </category>
  <category name="Logic" colour="210">
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="Math" colour="230">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
  </category>
  <category name="Objects" colour="200">
    <block type="value_object"></block>
  </category>
</xml>`;
}
