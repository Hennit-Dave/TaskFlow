/**
 * WebSocket client for real-time features.
 *
 * Future usage:
 *   const ws = new WebSocketClient();
 *   ws.connect(token);
 *   ws.on('task_assigned', (data) => { showNotification(data); });
 *   ws.on('notification', (data) => { showToast(data.body, 'info'); });
 *
 * Will connect to the Socket.IO server started in server.js.
 * Requires: <script src="/socket.io/socket.io.js"></script> in the HTML.
 */
class WebSocketClient {
  constructor() {
    this.socket = null;
    this.handlers = {};
  }

  connect(token) {
    if (typeof io === 'undefined') {
      console.log('[WS] Socket.IO client not loaded');
      return;
    }
    this.socket = io({ auth: { token } });

    this.socket.on('connect', function() {
      console.log('[WS] Connected');
    });

    this.socket.on('disconnect', function() {
      console.log('[WS] Disconnected');
    });

    var self = this;
    this.socket.onAny(function(event, data) {
      if (self.handlers[event]) {
        self.handlers[event].forEach(function(fn) { fn(data); });
      }
    });
  }

  on(event, fn) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }
}
