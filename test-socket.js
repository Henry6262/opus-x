const { io } = require('socket.io-client');

const socket = io('http://localhost:4001', {
  path: '/ws/tokens',
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected to socket.io server!', socket.id);
});

socket.on('message', (data) => {
  console.log('📨 Message received:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

console.log('🔄 Attempting to connect to http://localhost:4001/ws/tokens...');

// Keep the script running
setTimeout(() => {
  socket.close();
  console.log('Test complete');
  process.exit(0);
}, 5000);
