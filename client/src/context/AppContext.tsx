import React, { createContext, useReducer, ReactNode } from 'react';
import { CallStatus } from '../types';

interface AppState {
  calls: CallStatus[];
  activeCallId: string | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_ACTIVE_CALL'; payload: string | null }
  | { type: 'ADD_CALL'; payload: CallStatus }
  | { type: 'UPDATE_CALL'; payload: CallStatus }
  | { type: 'CLEAR_CALLS' }
  | { type: 'SET_CALLS'; payload: CallStatus[] };

const initialState: AppState = {
  calls: [],
  activeCallId: null,
  isLoading: false,
  error: null,
  isConnected: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    
    case 'SET_ACTIVE_CALL':
      return { ...state, activeCallId: action.payload };
    
    case 'ADD_CALL':
      return {
        ...state,
        calls: [...state.calls, action.payload],
      };
    
    case 'UPDATE_CALL':
      return {
        ...state,
        calls: state.calls.map(call =>
          call.callId === action.payload.callId ? action.payload : call
        ),
      };
    
    case 'CLEAR_CALLS':
      return { ...state, calls: [], activeCallId: null };
    
    case 'SET_CALLS':
      return { ...state, calls: action.payload };
    
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

