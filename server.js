const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Create WebSocket server for hot reload
const wss = new WebSocketServer({ server });
const clients = new Set();

// Serve static files (JS, CSS, images, etc.)
app.use(express.static(__dirname));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('🔌 Client connected for hot reload');
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('🔌 Client disconnected');
  });
});

// Function to notify all clients to reload
function notifyReload() {
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify({ type: 'reload' }));
    }
  });
}

// Watch for file changes
const watchedExtensions = ['.html', '.js', '.css'];
const watchedFiles = new Set();

function watchFile(filePath) {
  if (watchedFiles.has(filePath)) return;
  
  fs.watch(filePath, (eventType, filename) => {
    if (eventType === 'change') {
      console.log(`📝 File ${filename} changed, triggering hot reload...`);
      notifyReload();
    }
  });
  
  watchedFiles.add(filePath);
}

// Watch all relevant files in the project
function setupFileWatching() {
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const ext = path.extname(file);
    if (watchedExtensions.includes(ext)) {
      watchFile(filePath);
    }
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Hot reload server running on http://localhost:${PORT}`);
  console.log('📁 Watching for file changes...');
  setupFileWatching();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down hot reload server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
