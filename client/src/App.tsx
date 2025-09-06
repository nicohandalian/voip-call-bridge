import React from 'react';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import CallBridge from './components/CallBridge';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="App">
          <CallBridge />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;