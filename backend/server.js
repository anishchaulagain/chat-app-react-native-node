require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const connectDB = require('./src/config/db');

// Routes
const authRoutes = require('./src/routes/auth');
const messagesRoutes = require('./src/routes/messages');
const adminRoutes = require('./src/routes/admin');

// WebSocket
const setupWebSocket = require('./src/websocket');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Secure Chat API is running');
});

// Setup WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
