'use strict';

// Runnable check for the MCP stdio protocol. Spawns server.js, talks
// line-delimited JSON-RPC, asserts the initialize + tools/list handshake.
const { spawn } = require('child_process');
const path = require('path');

const child = spawn('node', [path.join(__dirname, 'server.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
let lineBuf = '';
let seq = 0;

function request(method, params) {
  const id = ++seq;
  return new Promise((resolve) => {
    const check = (data) => {
      lineBuf += data.toString();
      let i;
      while ((i = lineBuf.indexOf('\n')) >= 0) {
        const line = lineBuf.slice(0, i).trim();
        lineBuf = lineBuf.slice(i + 1);
        if (!line) continue;
        const m = JSON.parse(line);
        if (m.id === id) { child.stdout.off('data', check); resolve(m); }
      }
    };
    child.stdout.on('data', check);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

(async () => {
  const init = await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  if (!init.result || !init.result.capabilities || !init.result.capabilities.tools) throw new Error('initialize failed: ' + JSON.stringify(init));
  const list = await request('tools/list', {});
  const names = list.result.tools.map((t) => t.name);
  for (const expected of ['spawn_object', 'remove_object', 'set_property', 'get_scene', 'run_script', 'start_game', 'stop_game', 'set_background', 'set_gravity']) {
    if (!names.includes(expected)) throw new Error('missing tool: ' + expected);
  }
  const call = await request('tools/call', { name: 'get_scene', arguments: {} });
  if (!call.result || !call.result.isError) throw new Error('get_scene without a bridge should report isError: ' + JSON.stringify(call));
  child.kill();
  console.log('MCP protocol OK - initialize, ' + names.length + ' tools, error path works');
})().catch((e) => { console.error('FAIL: ' + e.message); child.kill(); process.exit(1); });
