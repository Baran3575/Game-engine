'use strict';

// Client half of the MCP bridge. The game page connects to the local MCP server's
// WebSocket relay (ws://localhost:8080 by default). Commands coming from an AI
// agent via MCP tools are routed into the engine; game events are pushed back.
// Override the relay URL with ?bridge=ws://host:port in the page URL.

function initBridge(engine, statusEl) {
  const saved = localStorage.getItem('webstruckd-bridge');
  const url = saved || new URLSearchParams(location.search).get('bridge') || 'ws://localhost:8080';
  let ws = null;
  let seq = 0;
  const pending = new Map();

  function setStatus(text, on) {
    if (!statusEl) return;
    statusEl.classList.toggle('on', !!on);
    const textSpan = statusEl.querySelector('.status-text');
    if (textSpan) textSpan.textContent = text;
  }

  function connect() {
    try { ws = new WebSocket(url); } catch (e) { setStatus('MCP: bad url'); return; }
    ws.onopen = () => setStatus('MCP: connected', true);
    ws.onclose = () => { setStatus('MCP: offline (retrying)'); setTimeout(connect, 3000); };
    ws.onerror = () => ws.close();
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        msg.ok ? p.resolve(msg.data) : p.reject(new Error(msg.error || 'bridge error'));
        return;
      }
      if (msg.cmd) handleRemote(msg);
    };
  }

  function sendRequest(cmd, args) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== 1) return reject(new Error('no bridge connection'));
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ cmd, id, args: args || {} }));
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error('bridge timeout')); }
      }, 8000);
    });
  }

  async function handleRemote(msg) {
    const reply = (ok, data, error) => {
      try { ws.send(JSON.stringify({ id: msg.id, ok, data, error: error || null })); } catch (e) {}
    };
    try {
      const data = await engine.remote(msg.cmd, msg.args || {});
      reply(true, data);
    } catch (e) {
      reply(false, null, String(e && e.message || e));
    }
  }

  // engine events -> bridge -> MCP notifications
  engine.onRemoteEvent = (name, payload) => {
    if (!ws || ws.readyState !== 1) return;
    const safe = name === 'touch'
      ? (Array.isArray(payload) ? payload.map((o) => o.toJSON()) : payload)
      : payload;
    ws.send(JSON.stringify({ event: name, payload: safe }));
  };

  window.__bridge = {
    send: sendRequest,
    url: () => url,
    reconnect: () => { try { ws && ws.close(); } catch (e) {} connect(); }
  };

  connect();
}
