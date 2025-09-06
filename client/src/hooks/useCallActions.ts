import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { callService } from '../services/CallService';
import { CallInitiateRequest } from '../types';

export const useCallActions = () => {
  const { dispatch } = useAppContext();

  const initiateCall = useCallback(async (request: CallInitiateRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await callService.initiateCall(request);
      
      if (response.success && response.callId) {
        dispatch({ type: 'SET_ACTIVE_CALL', payload: response.callId });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to initiate call' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to initiate call' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const endCall = useCallback(async (callId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await callService.endCall(callId);
      dispatch({ type: 'SET_ACTIVE_CALL', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to end call' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const clearAllCalls = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await callService.clearAllCalls();
      dispatch({ type: 'CLEAR_CALLS' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to clear history' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  return {
    initiateCall,
    endCall,
    clearAllCalls,
    clearMessages,
  };
};
