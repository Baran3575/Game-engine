'use strict';

// Runnable check for the block-code layer with Blockly stubbed out:
// the theme defines all styles we reference, every registered block appears
// in the toolbox, and setupBlocks produces a usable API.
// Run with: node web/test/blocks.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.Blockly = {
  Themes: { Classic: {} },
  Theme: { defineTheme: (name, obj) => obj },
  Blocks: {},
  JavaScript: {}
};

let src = fs.readFileSync(path.join(__dirname, '..', 'js', 'blocks.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', src + '\nmodule.exports = { setupBlocks, gameToolbox, gameTheme };')(mod, mod.exports);
const { setupBlocks, gameToolbox, gameTheme } = mod.exports;

const styles = ['event_blocks', 'action_blocks', 'control_blocks', 'logic_blocks', 'math_blocks', 'object_blocks'];
for (const s of styles) {
  assert(gameTheme.blockStyles[s], 'theme defines block style ' + s);
}
assert(gameTheme.componentStyles.workspaceBackgroundColour, 'theme sets workspace background');
assert(gameTheme.componentStyles.toolboxBackgroundColour, 'theme sets toolbox background');

const api = setupBlocks({ byName: {} });
assert.strictEqual(typeof api.blocksToCode, 'function', 'blocksToCode available');

const registered = Object.keys(global.Blockly.Blocks);
assert(registered.length >= 10, 'custom blocks registered (' + registered.length + ')');

const toolboxXml = gameToolbox();
for (const name of registered) {
  assert(toolboxXml.includes('type="' + name + '"'), 'toolbox includes ' + name);
}

console.log('Blocks OK - ' + registered.length + ' blocks, theme styles, toolbox all consistent');
