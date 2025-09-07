import { Request, Response } from 'express';
import { CallService } from '../services/CallService';
import { logger } from '../../shared/logger';
import { Server as SocketIOServer } from 'socket.io';

export class CallController {
  private callService: CallService;
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.callService = new CallService(io);
  }

  async initiateCall(req: Request, res: Response): Promise<void> {
    try {
      const { fromPhone, toPhone, callMode = 'bridge', provider = 'telnyx' } = req.body;
      const result = await this.callService.initiateCall(fromPhone, toPhone, callMode, provider);
      
      
      res.json({
        success: true,
        callId: result.callId,
        message: 'Call initiated successfully'
      });
    } catch (error) {
      logger.error('Error initiating call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate call'
      });
    }
  }

  async endCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      await this.callService.endCall(callId);
      
      res.json({
        success: true,
        message: 'Call ended successfully'
      });
    } catch (error) {
      logger.error('Error ending call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end call'
      });
    }
  }

  async getCallStatus(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const status = await this.callService.getCallStatus(callId);
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      logger.error('Error getting call status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get call status'
      });
    }
  }

  async getAllCalls(req: Request, res: Response): Promise<void> {
    try {
      const calls = await this.callService.getAllCalls();
      
      res.json({
        success: true,
        calls
      });
    } catch (error) {
      logger.error('Error getting all calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get calls'
      });
    }
  }

  async clearAllCalls(req: Request, res: Response): Promise<void> {
    try {
      await this.callService.clearAllCalls();
      
      res.json({
        success: true,
        message: 'All call statuses cleared'
      });
    } catch (error) {
      logger.error('Error clearing calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear calls'
      });
    }
  }
}
