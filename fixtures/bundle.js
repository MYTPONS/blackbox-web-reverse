const api = {
  list: '/api/examples',
  detail: '/api/examples/:id',
  search: '/api/search?q=',
};
const socketUrl = 'wss://app.example.test/ws';
const headers = { 'x-request-id': 'example', authorization: 'Bearer <redacted>' };
fetch('/api/examples?page=1');
new WebSocket(socketUrl);
