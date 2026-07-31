#!/usr/bin/env node
'use strict';

// WebStruckd MCP server.
//
// Two transports in one process:
//   1. stdio  - speaks the MCP protocol (newline-delimited JSON-RPC) so AI
//               agents (Claude, opencode, ...) can call game tools.
//   2. WebSocket - a relay (default port 8080) that the game page connects to.
//               Every MCP tool call is forwarded to the connected browser
//               game; replies come back and are returned to the agent.
//
// Usage:
//   npm install            (once)
//   node server.js         (then open web/index.html in a browser)
// Add the stdio command to your MCP client, e.g. in opencode.json:
//   { "mcp": { "webstruckd": { "type": "local", "command": ["node", "<repo>/mcp/server.js"] } } }

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = +(process.env.MCP_WS_PORT || 8080);
const PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'spawn_object',
    description: 'Spawn a 3D object in the game scene.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['box', 'sphere', 'cylinder'], description: 'Shape' },
        name: { type: 'string', description: 'Optional object name (defaults to auto)' },
        x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' },
        color: { type: 'string', description: 'Hex color, e.g. #ff4444' },
        scale: { type: 'number', description: 'Uniform scale' }
      }
    }
  },
  {
    name: 'remove_object',
    description: 'Remove an object from the scene by name.',
    inputSchema: {
      type: 'object',
      properties: { object: { type: 'string', description: 'Object name' } },
      required: ['object']
    }
  },
  {
    name: 'set_property',
    description: 'Set a property of an object (x, y, z, rx, ry, rz, sx, sy, sz, color, velocity).',
    inputSchema: {
      type: 'object',
      properties: {
        object: { type: 'string', description: 'Object name' },
        prop: { type: 'string', description: 'Property name' },
        value: { description: 'New value (number, hex color string, or {x,y,z} for velocity)' }
      },
      required: ['object', 'prop', 'value']
    }
  },
  {
    name: 'get_scene',
    description: 'List all objects in the scene with their properties.'
  },
  {
    name: 'run_script',
    description: 'Run a JavaScript snippet against the game API. `game` is the engine API: game.spawn({type, name, x, y, z, color}), game.find(name), game.onKey(key, fn), game.onStart(fn), game.broadcast(name), game.log(msg).',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'JavaScript source' } },
      required: ['code']
    }
  },
  {
    name: 'start_game',
    description: 'Start the game loop (physics, input, block code and scripts).'
  },
  {
    name: 'stop_game',
    description: 'Stop the game loop.'
  },
  {
    name: 'set_background',
    description: 'Set the sky color.',
    inputSchema: {
      type: 'object',
      properties: { color: { type: 'string', description: 'Hex color' } },
      required: ['color']
    }
  },
  {
    name: 'set_gravity',
    description: 'Set the gravity strength.',
    inputSchema: {
      type: 'object',
      properties: { value: { type: 'number', description: 'Gravity value (default 18)' } },
      required: ['value']
    }
  }
];

// ---------- WebSocket relay to the browser ----------

let relaySeq = 0;
const pendingRelay = new Map();
const wss = new WebSocketServer({ port: PORT });
let bridge = null;

wss.on('connection', (ws) => {
  bridge = ws;
  notify('notifications/game/event', { name: 'bridge_connected' });
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    if (m.id && pendingRelay.has(m.id)) {
      const p = pendingRelay.get(m.id);
      pendingRelay.delete(m.id);
      m.ok ? p.resolve(m.data) : p.reject(new Error(m.error || 'engine error'));
    } else if (m.event) {
      notify('notifications/game/event', { name: m.event, payload: m.payload });
    }
  });
  ws.on('close', () => { if (bridge === ws) bridge = null; });
});

function relay(cmd, args) {
  return new Promise((resolve, reject) => {
    if (!bridge || bridge.readyState !== 1) {
      return reject(new Error('No game connected to the bridge. Open web/index.html in a browser, then retry.'));
    }
    const id = ++relaySeq;
    pendingRelay.set(id, { resolve, reject });
    bridge.send(JSON.stringify({ cmd, id, args: args || {} }));
    setTimeout(() => {
      if (pendingRelay.has(id)) { pendingRelay.delete(id); reject(new Error('Bridge timeout')); }
    }, 8000);
  });
}

// ---------- MCP stdio ----------

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
let notifyCount = 0;
function notify(method, params) {
  send({ jsonrpc: '2.0', method, params: Object.assign({ seq: ++notifyCount }, params) });
}

async function callTool(name, args) {
  switch (name) {
    case 'spawn_object':
      return relay('spawn', {
        type: args.type || 'box', name: args.name, x: args.x, y: args.y, z: args.z,
        color: args.color, scale: args.scale
      });
    case 'remove_object':
      return relay('remove', { object: args.object });
    case 'set_property':
      return relay('setProperty', { object: args.object, prop: args.prop, value: args.value });
    case 'get_scene':
      return relay('getScene');
    case 'run_script':
      return relay('runScript', { code: args.code });
    case 'start_game':
      return relay('start');
    case 'stop_game':
      return relay('stop');
    case 'set_background':
      return relay('setBackground', { color: args.color });
    case 'set_gravity':
      return relay('setGravity', { value: args.value });
    default:
      throw new Error('Unknown tool: ' + name);
  }
}

async function handleRequest(m) {
  switch (m.method) {
    case 'initialize':
      send({
        jsonrpc: '2.0', id: m.id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'webstruckd-mcp', version: '0.1.0' }
        }
      });
      break;
    case 'ping':
      send({ jsonrpc: '2.0', id: m.id, result: {} });
      break;
    case 'tools/list':
      send({ jsonrpc: '2.0', id: m.id, result: { tools: TOOLS } });
      break;
    case 'tools/call':
      try {
        const result = await callTool(m.params.name, m.params.arguments || {});
        send({
          jsonrpc: '2.0', id: m.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        });
      } catch (e) {
        send({
          jsonrpc: '2.0', id: m.id,
          result: { content: [{ type: 'text', text: String(e && e.message || e) }], isError: true }
        });
      }
      break;
    default:
      send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'Method not found: ' + m.method } });
  }
}

let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch (e) { continue; }
    if (m.method && m.method.startsWith('notifications/')) continue;
    if (m.id !== undefined) handleRequest(m).catch(() => {});
  }
});
process.stdin.on('end', () => process.exit(0));

console.error('[webstruckd-mcp] stdio MCP server ready; WebSocket relay on ws://localhost:' + PORT);
