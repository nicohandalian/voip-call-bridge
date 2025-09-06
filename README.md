# voip-call-bridge

## Description
A comprehensive VoIP call bridging solution supporting multiple providers (Telnyx, Sinch, Infobip). Features TypeScript client libraries, Node.js REST API, and React web interface with real-time call management and WebRTC headset support.

## Challenge
Pick one of the following VoIP providers
-Telnyx
-Sinch
-Infobip

Then perform the following tasks. The more items that you can complete, the better.

1. Provide a Typescript client to initiate an outbound call
  a.Two parameters: fromPhone and toPhone, two phone numbers
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
