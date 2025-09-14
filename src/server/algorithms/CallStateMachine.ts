import { CallStatus } from '../../shared/types';
import { logger } from '../../shared/logger';

export type CallState = 
  | 'idle'
  | 'initiating'
  | 'ringing_first'
  | 'answered_first'
  | 'calling_second'
  | 'ringing_second'
  | 'answered_second'
  | 'bridging'
  | 'bridged'
  | 'ending'
  | 'ended'
  | 'error'
  | 'timeout'
  | 'cancelled';

export type CallEvent = 
  | 'initiate'
  | 'first_call_started'
  | 'first_call_ringing'
  | 'first_call_answered'
  | 'second_call_started'
  | 'second_call_ringing'
  | 'second_call_answered'
  | 'bridge_started'
  | 'bridge_completed'
  | 'call_ended'
  | 'error_occurred'
  | 'timeout_reached'
  | 'call_cancelled'
  | 'retry_attempt';

export interface CallStateTransition {
  from: CallState;
  to: CallState;
  event: CallEvent;
  condition?: (call: CallStatus) => boolean;
  action?: (call: CallStatus) => Promise<void>;
}

export class CallStateMachine {
  private currentState: CallState = 'idle';
  private call: CallStatus;
  private transitions: CallStateTransition[] = [];
  private stateHistory: { state: CallState; timestamp: Date; event: CallEvent }[] = [];

  constructor(call: CallStatus) {
    this.call = call;
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    this.transitions = [
      { from: 'idle', to: 'initiating', event: 'initiate' },
      
      { from: 'initiating', to: 'ringing_first', event: 'first_call_started' },
      { from: 'ringing_first', to: 'answered_first', event: 'first_call_answered' },
      { from: 'ringing_first', to: 'error', event: 'error_occurred' },
      { from: 'ringing_first', to: 'timeout', event: 'timeout_reached' },
      
      { from: 'answered_first', to: 'calling_second', event: 'second_call_started' },
      { from: 'calling_second', to: 'ringing_second', event: 'second_call_ringing' },
      { from: 'ringing_second', to: 'answered_second', event: 'second_call_answered' },
      { from: 'ringing_second', to: 'error', event: 'error_occurred' },
      { from: 'ringing_second', to: 'timeout', event: 'timeout_reached' },
      
      { from: 'answered_second', to: 'bridging', event: 'bridge_started' },
      { from: 'bridging', to: 'bridged', event: 'bridge_completed' },
      { from: 'bridging', to: 'error', event: 'error_occurred' },
      
      { from: 'initiating', to: 'answered_first', event: 'first_call_answered', 
        condition: (call) => call.callMode === 'headset' },
      
      { from: 'bridged', to: 'ending', event: 'call_ended' },
      { from: 'answered_first', to: 'ending', event: 'call_ended', 
        condition: (call) => call.callMode === 'headset' },
      { from: 'ending', to: 'ended', event: 'call_ended' },
      
      { from: 'initiating', to: 'error', event: 'error_occurred' },
      { from: 'calling_second', to: 'error', event: 'error_occurred' },
      { from: 'bridging', to: 'error', event: 'error_occurred' },
      
      { from: 'initiating', to: 'timeout', event: 'timeout_reached' },
      { from: 'calling_second', to: 'timeout', event: 'timeout_reached' },
      { from: 'bridging', to: 'timeout', event: 'timeout_reached' },
      
      { from: 'initiating', to: 'cancelled', event: 'call_cancelled' },
      { from: 'ringing_first', to: 'cancelled', event: 'call_cancelled' },
      { from: 'answered_first', to: 'cancelled', event: 'call_cancelled' },
      { from: 'calling_second', to: 'cancelled', event: 'call_cancelled' },
      { from: 'ringing_second', to: 'cancelled', event: 'call_cancelled' },
      { from: 'answered_second', to: 'cancelled', event: 'call_cancelled' },
      { from: 'bridging', to: 'cancelled', event: 'call_cancelled' },
      { from: 'bridged', to: 'cancelled', event: 'call_cancelled' },
      
      { from: 'error', to: 'initiating', event: 'retry_attempt' },
      { from: 'timeout', to: 'initiating', event: 'retry_attempt' }
    ];
  }

  async transition(event: CallEvent, call?: Partial<CallStatus>): Promise<boolean> {
    if (call) {
      this.call = { ...this.call, ...call };
    }

    const validTransition = this.transitions.find(t => 
      t.from === this.currentState && 
      t.event === event && 
      (!t.condition || t.condition(this.call))
    );

    if (!validTransition) {
      logger.warn(`Invalid transition from ${this.currentState} on event ${event}`);
      return false;
    }

    const previousState = this.currentState;
    this.currentState = validTransition.to;
    
    this.stateHistory.push({
      state: this.currentState,
      timestamp: new Date(),
      event
    });

    logger.info(`Call ${this.call.callId} transitioned from ${previousState} to ${this.currentState} on event ${event}`);

    if (validTransition.action) {
      try {
        await validTransition.action(this.call);
      } catch (error) {
        logger.error(`Error executing transition action for call ${this.call.callId}:`, error);
        this.currentState = 'error';
        return false;
      }
    }

    return true;
  }

  getCurrentState(): CallState {
    return this.currentState;
  }

  getStateHistory(): { state: CallState; timestamp: Date; event: CallEvent }[] {
    return [...this.stateHistory];
  }

  canTransition(event: CallEvent): boolean {
    return this.transitions.some(t => 
      t.from === this.currentState && 
      t.event === event && 
      (!t.condition || t.condition(this.call))
    );
  }

  getValidEvents(): CallEvent[] {
    return this.transitions
      .filter(t => t.from === this.currentState && (!t.condition || t.condition(this.call)))
      .map(t => t.event);
  }

  isTerminalState(): boolean {
    return ['ended', 'error', 'timeout', 'cancelled'].includes(this.currentState);
  }

  isActiveState(): boolean {
    return !this.isTerminalState() && this.currentState !== 'idle';
  }

  getCallStatus(): CallStatus {
    return {
      ...this.call,
      status: this.mapStateToStatus(this.currentState)
    };
  }

  private mapStateToStatus(state: CallState): CallStatus['status'] {
    const stateMap: { [key in CallState]: CallStatus['status'] } = {
      'idle': 'initiating',
      'initiating': 'initiating',
      'ringing_first': 'ringing',
      'answered_first': 'answered',
      'calling_second': 'answered',
      'ringing_second': 'answered',
      'answered_second': 'answered',
      'bridging': 'bridging',
      'bridged': 'bridged',
      'ending': 'ended',
      'ended': 'ended',
      'error': 'error',
      'timeout': 'error',
      'cancelled': 'ended'
    };

    return stateMap[state] || 'error';
  }

  getStateDescription(): string {
    const descriptions: { [key in CallState]: string } = {
      'idle': 'Call not started',
      'initiating': 'Starting call process',
      'ringing_first': 'Calling first number',
      'answered_first': 'First number answered',
      'calling_second': 'Starting second call',
      'ringing_second': 'Calling second number',
      'answered_second': 'Second number answered',
      'bridging': 'Connecting both calls',
      'bridged': 'Calls connected',
      'ending': 'Ending call',
      'ended': 'Call completed',
      'error': 'Call failed',
      'timeout': 'Call timed out',
      'cancelled': 'Call cancelled'
    };

    return descriptions[this.currentState] || 'Unknown state';
  }
}
