import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { TelnyxCallBridge } from './client/TelnyxCallBridge';
import { CallStatus } from '../shared/types';
import { logger } from '../shared/logger';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const telnyxClient = new TelnyxCallBridge({
  apiKey: process.env.TELNYX_API_KEY || '',
});

telnyxClient.setStatusCallback((status: CallStatus) => {
  console.log('📡 Broadcasting call status update:', status);
  io.emit('callStatusUpdate', status);
});

telnyxClient.connect().catch((error) => console.error('❌ Failed to connect to Telnyx:', error));

const activeCalls = new Map<string, CallStatus>();
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/webhooks/telnyx', (req, res) => {
  res.status(200).json({ status: 'Webhook endpoint ready' });
});

app.post('/webhooks/telnyx', (req, res) => {
  try {
    const event = req.body;
    logger.debug('Received Telnyx webhook event:', JSON.stringify(event, null, 2));
    
    switch (event.event_type) {
      case 'call.initiated':
        logger.info('Call initiated:', event.data.call_control_id);
        io.emit('callStatusUpdate', {
          callId: event.data.call_control_id,
          status: 'initiating',
          fromPhone: event.data.from,
          toPhone: event.data.to,
          timestamp: new Date(),
        });
        break;
        
      case 'call.answered':
        logger.info('Call answered:', event.data.call_control_id);
        io.emit('callStatusUpdate', {
          callId: event.data.call_control_id,
          status: 'answered',
          fromPhone: event.data.from,
          toPhone: event.data.to,
          timestamp: new Date(),
        });
        break;
        
      case 'call.hangup':
        logger.info('Call ended:', event.data.call_control_id);
        io.emit('callStatusUpdate', {
          callId: event.data.call_control_id,
          status: 'ended',
          fromPhone: event.data.from,
          toPhone: event.data.to,
          timestamp: new Date(),
        });
        break;
        
      case 'call.ringing':
        logger.info('Call ringing:', event.data.call_control_id);
        io.emit('callStatusUpdate', {
          callId: event.data.call_control_id,
          status: 'ringing',
          fromPhone: event.data.from,
          toPhone: event.data.to,
          timestamp: new Date(),
        });
        break;
        
      default:
        logger.warn('Unhandled event type:', event.event_type);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.post('/api/calls/initiate', async (req, res) => {
  try {
    const { fromPhone, toPhone } = req.body;

    if (!fromPhone || !toPhone) {
      return res.status(400).json({
        error: 'Both fromPhone and toPhone are required'
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(fromPhone) || !phoneRegex.test(toPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Please use international format (e.g., +1234567890)'
      });
    }

    const callId = await telnyxClient.initiateCall(fromPhone, toPhone);
    
    res.json({
      success: true,
      callId,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    logger.error('Error initiating call:', error);
    res.status(500).json({
      error: 'Failed to initiate call',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/calls/:callId/end', async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callId) {
      return res.status(400).json({
        error: 'Call ID is required'
      });
    }

    await telnyxClient.endCall(callId);
    
    res.json({
      success: true,
      message: 'Call ended successfully'
    });

  } catch (error) {
    logger.error('Error ending call:', error);
    res.status(500).json({
      error: 'Failed to end call',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/calls/:callId/status', (req, res) => {
  try {
    const { callId } = req.params;
    const status = telnyxClient.getCallStatus(callId);

    if (!status) {
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    logger.error('Error getting call status:', error);
    res.status(500).json({
      error: 'Failed to get call status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/calls', (req, res) => {
  try {
    const allStatuses = telnyxClient.getAllCallStatuses();
    
    res.json({
      success: true,
      calls: allStatuses
    });

  } catch (error) {
    logger.error('Error getting all calls:', error);
    res.status(500).json({
      error: 'Failed to get calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/calls', (req, res) => {
  try {
    telnyxClient.clearAllCallStatuses();
    io.emit('callStatusUpdate', []);
    res.json({ success: true, message: 'All call statuses cleared' });
  } catch (error) {
    console.error('❌ Error clearing calls:', error);
    res.status(500).json({ success: false, error: 'Failed to clear calls' });
  }
});


io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  const allStatuses = telnyxClient.getAllCallStatuses();
  socket.emit('callStatusUpdate', allStatuses);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', error.message);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});
process.on('SIGINT', () => {
  console.log('🔌 Shutting down server...');
  telnyxClient.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🔌 Shutting down server...');
  telnyxClient.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
