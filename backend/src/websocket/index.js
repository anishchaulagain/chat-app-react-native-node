const jwt = require('jsonwebtoken');
const Message = require('../models/Message');

const setupWebSocket = (wss) => {
  const clients = new Map(); // map user_id to ws connection

  wss.on('connection', (ws, req) => {
    // Simple query param auth: ?token=xyz
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const userId = decoded.id;
      clients.set(userId, ws);
      
      console.log(`User connected: ${userId}`);

      ws.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'SEND_MESSAGE') {
            const { receiver_id, encrypted_message, auth_tag, iv, encrypted_session_key_user, encrypted_session_key_admin, mode } = parsed.payload;
            
            const messageData = {
              sender_id: userId,
              receiver_id,
              encrypted_message,
              auth_tag,
              iv,
              encrypted_session_key_user,
              encrypted_session_key_admin,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days TTL
            };

            let broadcastMessage = { ...messageData };
            // Assign a temporary ID for instant broadcast
            broadcastMessage._id = Math.random().toString(36).substring(7);

            if (mode === 'PRIVATE') {
              broadcastMessage.isPrivate = true;
            }

            // Broadcast to receiver IMMEDIATELY if active
            const receiverWs = clients.get(receiver_id);
            if (receiverWs && receiverWs.readyState === 1) { // OPEN
              receiverWs.send(JSON.stringify({
                type: 'NEW_MESSAGE',
                payload: broadcastMessage
              }));
            }
            
            // Send Ack to sender IMMEDIATELY
            ws.send(JSON.stringify({
              type: 'MESSAGE_SENT',
              payload: broadcastMessage
            }));

            // Save to DB asynchronously in the background
            if (mode === 'SECURE') {
              Message.create(messageData).catch(err => {
                console.error('Failed to save asynchronous message to DB:', err);
              });
            }
          }
        } catch (error) {
          console.error('WS MSG Error:', error);
        }
      });

      ws.on('close', () => {
        clients.delete(userId);
        console.log(`User disconnected: ${userId}`);
      });
      
    } catch (error) {
      ws.close(4001, 'Unauthorized');
    }
  });
};

module.exports = setupWebSocket;
