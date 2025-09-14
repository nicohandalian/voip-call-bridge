# voip-call-bridge

## Description
A comprehensive VoIP call bridging solution using Telnyx. Features TypeScript client libraries, Node.js REST API, and React web interface with real-time call management and WebRTC headset support.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
```env
TELNYX_API_KEY=your_api_key_here
TELNYX_CONNECTION_ID=your_connection_id_here
```

### 3. Run the Application
```bash
# Run both server and client
npm run dev

# Or run separately:
# Terminal 1 - Server (port 3001)
npm run dev:server

# Terminal 2 - Client (port 3000)
npm run dev:client
```

### 4. Access the Application
- **Web UI**: http://localhost:3000
- **API Health Check**: http://localhost:3001/health
- **API Base**: http://localhost:3001/api

### 5. Configure Webhooks
For local development, use ngrok:
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3001

# Use the ngrok URL in Telnyx webhook settings
```

### Demo Mode
If Telnyx credentials are not configured, the application runs in demo mode, simulating the call flow for testing purposes.

## Telnyx Trial Account Limitations

### WebRTC Headset Issues
**Problem**: Telnyx trial accounts have significant limitations for WebRTC functionality:
- **SIP Registration**: Trial accounts cannot register SIP connections, which is required for WebRTC authentication
- **WebRTC Access**: Full WebRTC functionality requires a paid account with proper SIP connection setup
- **Authentication Errors**: You'll see "Authentication failed" and "WebSocket closed abnormally" errors
- **Demo Mode**: The app automatically falls back to demo mode for WebRTC calls when credentials fail

**Solution**: Upgrade to a paid Telnyx account.

### Bridge Calling Limitations
**Problem**: Trial accounts have restrictions on phone number purchasing:
- **Geographic Restrictions**: Trial accounts can only purchase numbers in your account's registered country (e.g., Uruguay)
- **Verification Required**: Worldwide number coverage requires account verification
- **Limited Features**: Some advanced calling features may not be available

**Current Workaround**: The app uses demo mode for testing when real API calls fail, allowing you to test the UI and call flow without actual phone calls.

### Recommended Setup
1. **For Development**: Use demo mode to test UI and functionality
2. **For Production**: Upgrade to paid Telnyx account with proper SIP connection setup

## Sinch Trial Account Limitations

**Sinch Voice API** also has limitations with free trial accounts:

### Trial Limitations:
- **Duration**: 14-day trial period only
- **Phone Numbers**: Limited to test numbers only (no real phone number purchases)
- **Call Credits**: Limited number of outbound call minutes
- **Geographic Restrictions**: May be limited to certain countries/regions
- **API Rate Limits**: Lower rate limits compared to paid accounts

### Issues You May Encounter:
- **Authentication Errors**: Trial accounts may have restricted API access
- **Phone Number Validation**: May not accept real phone numbers for outbound calls
- **Call Bridging**: Advanced features like call bridging may not work properly
- **Webhook Delivery**: Webhook endpoints may not be fully supported

### For Testing:
- **Demo Mode**: The application automatically falls back to demo mode when Sinch credentials are not properly configured
- **Simulated Calls**: Demo mode provides realistic call flow simulation for UI testing
- **No Real Calls**: Demo mode doesn't make actual phone calls, perfect for development

### Recommended Setup
1. **For Development**: Use demo mode to test UI and functionality
2. **For Production**: Upgrade to paid Sinch account for real API access

## Challenge
Pick one of the following VoIP providers  
-Telnyx  
-Sinch  
-Infobip  
  
Then perform the following tasks. The more items that you can complete, the better.  
  
1. Provide a Typescript client to initiate an outbound call  
  a. Two parameters: fromPhone and toPhone, two phone numbers  
  b. Initiate a call to fromPhone  
  c. Once the call to fromPhone is answered, then dial toPhone  
  d. If and when call to toPhone is answered, connect it with the call to fromNumber so they are both on the same call and they can talk to each other  
2. Expose a REST API on Node with one operation to initiate an outbound call (params fromPhone and toPhone)  
3. Provide a React web UI with the following two UI controls  
  a. From Phone Number and To Phone Number - Two text fields  
  b. Dial - A button to initiate the call  
4. Update the UI in real time, providing updates. E.g.: call ringing, call answered, call terminated, etc.  
5. Provide an option to dial using your headset/mic as calling device  
  a. Instead of dialing a fromPhone, the initiating party connects to the call using their headset, via a JS client in the browser  
  b. Once the JS client is connected, dial the toPhone  
  c. Once the toPhone answers, connect both legs so the user can talk on their headset and communicate with somebody on their phone  
  d. Provide a UI control to finish the call, once initiated  
  
Do the same thing using the other two VoIP providers.  
  
And feel free to iterate on/improve the UI.
