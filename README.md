# Game Engine Studio

A Struckd-style 3D game builder for the web — build a scene by placing blocks,
program it with a custom **Blueprint-style node graph** (Unreal/Struckd vibe) or
plain **JavaScript scripts**, press Play, and let AI agents drive it live over
**MCP**.

No build step, no backend. The app is a static site (Three.js, zero framework)
and is deployed to GitHub Pages.

- **Play it:** `https://baran3575.github.io/Game-engine/`
- **Code:** `web/` (the browser app), `mcp/` (the MCP server)

## Features

- **Scene editor** — add/move box, sphere and cylinder objects; edit position,
  rotation, scale, color and name. Click an object in the 3D view to select it.
- **Blueprint graph** — a custom node editor (no Blockly): drag nodes from the
  palette, wire output ports to inputs, pan/zoom the canvas. *On Game Start*,
  *On Key Pressed*, *On Event Received*; move/rotate/scale, spawn/destroy, set
  color/velocity, broadcast; repeat/forever/if with compare logic. The graph
  compiles to the same `game` API as scripts. Double-click empty space to drop
  a Move node; press Delete to remove the selection.
- **Scripts** — a plain-JS editor with the engine API: `game.spawn`, `game.find`,
  `game.onKey`, `game.on('touch')`, `game.broadcast`, `game.wait`, ... Scripts
  run together with the graph on Play.
- **Projects** — save/load multiple games in your browser (localStorage).
- **MCP bridge** — connect an AI agent to the running game. Spawn objects, move
  them, run scripts, read the scene — live.
- **Physics** — simple gravity, velocity, ground collisions and object touch
  events. Everything runs client-side.

## Run locally

```bash
python3 -m http.server 8000 --directory web
# open http://localhost:8000
```

## MCP connection

The browser page connects to a local WebSocket relay; the MCP server exposes the
connected game to AI agents as tools.

```bash
cd mcp
npm install
node server.js                 # stdio MCP + WebSocket relay on ws://localhost:8080
```

Then open the game in a browser (the page auto-connects to
`ws://localhost:8080`; override with `?bridge=ws://host:port` or the settings
gear). Register the server with your MCP client, e.g. `opencode.json`:

```json
{ "mcp": { "webstruckd": { "type": "local", "command": ["node", "<repo>/mcp/server.js"] } } }
```

**Tools:** `spawn_object`, `remove_object`, `set_property`, `get_scene`,
`run_script`, `start_game`, `stop_game`, `set_background`, `set_gravity`.
Game events (start/stop/touch/key) are pushed to the agent as notifications.

Example agent request:

> Spawn a red box named "bouncer" at x=0, y=5, z=0. Start the game. In a
> script, make it bounce when the space key is pressed.

## Tests

Runs automatically in GitHub Actions (`.github/workflows/test.yml`), or locally:

```bash
node web/test/engine.test.js   # engine core: physics, collisions, API, MCP remote
node web/test/graph.test.js    # Blueprint graph compiler: chains, wires, control flow
cd mcp && npm ci && npm test   # MCP stdio protocol handshake + tools
```

## Deployment

Pushing to `main` builds the site from `web/` and deploys it to GitHub Pages
via `.github/workflows/deploy.yml`.

## Script API cheat-sheet

```js
game.spawn({ type: 'box', name: 'player', x: 0, y: 5, z: 0, color: '#ff4444' })
game.find('player')            // -> object (or null); 'this' = first object
game.each(fn)                  // iterate all objects
game.onStart(fn)               // run when Play is pressed
game.onKey('Space', fn)        // e.code-style key names, or '*' for any
game.on('touch', (a, b) => {}) // two objects overlap (AABB)
game.on('eventName', fn)       // custom events
game.broadcast('eventName')    // fire a custom event
game.every(sec, fn)            // timer
game.wait(sec)                 // awaitable delay
game.setGravity(v)             // default 18
game.setBackground('#87ceeb')

// object: obj.x/y/z, obj.rx/ry/rz, obj.sx/sy/sz, obj.color,
//         obj.velocity = {x,y,z}, obj.solid, obj.destroy(),
//         obj.move(dx,dy,dz), obj.rotate(dx,dy,dz), obj.scaleTo(s)
```

## License

MIT
