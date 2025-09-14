import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ProviderFactory } from './providers/ProviderFactory';
import { CallStatus } from '../shared/types';
import { logger } from '../shared/logger';
import createCallRoutes from './routes/callRoutes';

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

app.use('/api/calls', createCallRoutes(io));


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
    
    let internalCallId = event.data.call_control_id; // Default to Telnyx call ID
    if (event.data.client_state) {
      try {
        const clientState = JSON.parse(event.data.client_state);
        if (clientState.callId) {
          internalCallId = clientState.callId;
        }
      } catch (e) {
        logger.warn('Failed to parse client state:', e);
      }
    }
    
    let callMode = 'bridge';
    if (event.data.client_state) {
      try {
        const clientState = JSON.parse(event.data.client_state);
        if (clientState.headsetMode) {
          callMode = 'headset';
        } else if (clientState.bridgeMode) {
          callMode = 'bridge';
        }
      } catch (e) {
        logger.warn('Failed to parse client state for call mode:', e);
      }
    }
    
    switch (event.event_type) {
      case 'call.initiated':
        logger.info('Call initiated:', event.data.call_control_id);
        const initStatus: any = {
          callId: internalCallId,
          status: 'initiating',
          toPhone: event.data.to,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        };
        
        if (callMode === 'bridge' && event.data.from) {
          initStatus.fromPhone = event.data.from;
        }
        
        io.emit('callStatusUpdate', initStatus);
        break;
        
      case 'call.answered':
        logger.info('Call answered:', event.data.call_control_id);
        const answerStatus: any = {
          callId: internalCallId,
          status: 'answered',
          toPhone: event.data.to,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        };
        
        if (callMode === 'bridge' && event.data.from) {
          answerStatus.fromPhone = event.data.from;
        }
        
        io.emit('callStatusUpdate', answerStatus);
        break;
        
      case 'call.hangup':
        logger.info('Call ended:', event.data.call_control_id);
        const hangupStatus: any = {
          callId: internalCallId,
          status: 'ended',
          toPhone: event.data.to,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        };
        
        if (callMode === 'bridge' && event.data.from) {
          hangupStatus.fromPhone = event.data.from;
        }
        
        io.emit('callStatusUpdate', hangupStatus);
        break;
        
      case 'call.ringing':
        logger.info('Call ringing:', event.data.call_control_id);
        const ringingStatus: any = {
          callId: internalCallId,
          status: 'ringing',
          toPhone: event.data.to,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        };
        
        if (callMode === 'bridge' && event.data.from) {
          ringingStatus.fromPhone = event.data.from;
        }
        
        io.emit('callStatusUpdate', ringingStatus);
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





io.on('connection', (socket) => {
  logger.info('Client connected');
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

server.listen(PORT, () => {
});
