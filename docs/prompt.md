 I need you to help me transform all our components in this project into Gluestack UI to make it more appear professional. then as for the bottom navigation, make the selected highlight black in color, and the other unselected as faded gray. 

 as for the steps, do the bottom navigator first, then as for the other components we'll proceed one by one.





I need you to make the alerts page simpler but still modern, remove awaiting response text. fix the spacing and hierarchy, remove these texts: "active and archive, because we already have active and history tabs.

I also need you to change the icon set of home, alerts, analytics and settings in the bottom navigation, use solar icon pack

Now I need you to make the generate AI button functional (no need to further change the UI and skeleton loading) and it will send a formatted payload of the co-readings linked to that session. and it must have a system prompt in place to provide accurate insights.

the model that it will be using is this. 
x-ai/grok-code-fast-1



Brainstorm, make a plan, and give me your options and recommendations first. Use context7MCP, sequential think and spawn multiple suabgents for research, diagnosing and planning. Don't overcomplicate things as sometimes solutions are right in front of us. Review our credentials in here:
.env

You may also use Supabase MCP to check the schema directly.



I need you to read and study this original library:
docs/ESPSupabaseLibrary/ESPSupabase
Read Claude.md for reference and context.

These are the files we changed (note that if you want the files change the ones here, don't change the ones in the original library)
docs/arduino-code/supabase-library

Basically the files that we have consistently modified to attempt this fix are the only ones as follows, review others but focus on these:
docs/arduino-code/supabase-library/WebSocketsClient.cpp
docs/arduino-code/supabase-library/Realtime.cpp

Note that the two above are the edited versions of their counterparts here:

docs/ESPSupabaseLibrary/ESPSupabase/src

And we also directly modified this: docs/ESPSupabaseLibrary/ESPSupabase/src/ESPSupabaseRealtime.h


This is our latest arduino code:
docs/arduino-code/revised-code/CO_SAFE_Monitor-enhanced 1.83.ino

Read this also to understand the gist:
docs/arduino-code/arduino-code-final.md (disclaimer some parts maybe outdated)

So far my biggest concern is this (this is what i need you to fix):
✅ NTP time synced: 05:59:50
✅ Supabase REST API initialized
Free heap before WebSocket: 32352 bytes
⚠️ WARNING: Low memory! Attempting cleanup...
Free heap after cleanup: 32352 bytes
[Realtime] Initialized for hostname: naadaumxaglqzucacexb.supabase.co
[Realtime] WARNING: Low heap memory: 31776 bytes (need 35KB+)
[Realtime] WebSocket connection parameters:
  Hostname: naadaumxaglqzucacexb.supabase.co
  Port: 443 (WSS)
[Realtime] ========== FULL WEBSOCKET URL ==========
wss://naadaumxaglqzucacexb.supabase.co:443/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bcY&vsn=1.0.0
[Realtime] =======================================
  API Key Length: 208 chars
  API Key Preview: eyJhbGciOiJIUzI1NiIs...
  Path length: 248 chars
  Free Heap: 28128 bytes
[Realtime] Phoenix message prepared (will send after connection)
[Realtime] Set Origin header: https://naadaumxaglqzucacexb.supabase.co
[Realtime] Set User-Agent: Mozilla/5.0 (Chrome browser)
Connecting to WebSocket...
[WS-Client] clientIsConnected: No TCP object
[WS-Client] 🔄 Attempting reconnection (last fail: 11833 ms ago, interval: 3000 ms)
[WS-Client] ✅ connectedCb() called for naadaumxaglqzucacexb.supabase.co:443
[WS-Client] Free heap in connectedCb: 24488 bytes
[WS-Client] Using custom User-Agent from extraHeaders
[WS-Client] Sending HTTP upgrade request:
GET /realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bcY&vsn=1.0.0 HTTP/1.1
Host: naadaumxaglqzucacexb.supabase.co:443
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: UJIP1SriqGlnLqeARKCKXQ==
Origin: https://naadaumxaglqzucacexb.supabase.co
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
WS-Client] Handshake length: 599 bytes
[WS-Client] Bytes actually written: 599
[WS-Client] ✅ Connection still alive after send
[WS-Client] Header sent successfully (246679 us)
[WS-Client] Free heap after header send: 23568 bytes
[WS-Client] Waiting for server response...
[WS-Client] handleClientData() called, status=1, connected=1, available=0
[WS-Client] clientIsConnected: Connection lost! status=1
[WSc] ❌ Disconnected!
[WSc] Disconnect at heap: 29480 bytes
[WSc] TIP: Check if HTTP 101 Switching Protocols was received
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object
[WS-Client] clientIsConnected: No TCP object



This is from version 1.83:
WiFi connected: 192.168.1.196
NTP time synced: 14:07:09
Supabase REST API initialized
Free heap before WebSocket: 35056 bytes
[Realtime] Initialized for hostname: naadaumxaglqzucacexb.supabase.co
[Realtime] WARNING: Low heap memory: 34480 bytes (need 35KB+)
[Realtime] WebSocket connection parameters:
  Hostname: naadaumxaglqzucacexb.supabase.co
  Port: 443 (WSS)
  Path: /realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6I (first 100 chars)
  Free Heap: 30832 bytes
[Realtime] Phoenix message prepared (will send after connection)
Connecting to WebSocket...
[WSc] Disconnected!
[WSc] Disconnected!
WebSocket connection timeout after 10 seconds!
Final heap: 25112 bytes
[WSc] Disconnected!
[WSc] Disconnected!
WebSocket disconnected, reconnecting...
Attempting WebSocket reconnection...
[Realtime] Initialized for hostname: naadaumxaglqzucacexb.supabase.co
[Realtime] WARNING: Low heap memory: 30888 bytes (need 35KB+)
[Realtime] WebSocket connection parameters:
  Hostname: naadaumxaglqzucacexb.supabase.co
  Port: 443 (WSS)
  Path: /realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6I (first 100 chars)
  Free Heap: 28512 bytes
[Realtime] Phoenix message prepared (will send after connection)
Waiting for WebSocket reconnection...
[WSc] Disconnected!
WebSocket reconnected
[WSc] Disconnected!
[WSc] Disconnected!






for additional reference, this is the problem we have in previous versions:

So far in version 1.7. this is the logs:
[WSc] Disconnected!
[WSc] Disconnected!
........
✅ WiFi connected: 192.168.1.196
✅ NTP time synced: 09:21:33
✅ Supabase REST API initialized
✅ Supabase Realtime WebSocket initialized
[WSc] Disconnected!
[WSc] Disconnected!

In 1.8 :
Reconnecting WiFi (attempt 4/5)...
.............
✅ WiFi connected: 192.168.1.196
⚠️ NTP sync failed, using millis() fallback
✅ Supabase REST API initialized
⏳ Connecting to WebSocket...
✅ Supabase Realtime WebSocket initialized
[WSc] Disconnected!
[WSc] Disconnected!



I need you to read Claude.md for reference

and each of thse files here:
final-arduino-code (these ones are already good)

docs/ESPSupabaseLibrary (just for context)

I need you to study this: final-arduino-code/Final.ino check if its calibrated properly because it fluctuates up to 1001 and if they needed to be merged with: 
final-arduino-code/CO_SAFE_Monitor_HTTP_Polling.ino

Also I noticed that the app itself our speedometer is only steady at 1001, is it because of the app, or in supabase or because of the arduino code itself. i need you to study everything for clear context and so u havea full understand, you may use supabase MCP to help you out, review logs and etc. and table data


Now i need you to immerse yourself in this codebase and in the supabase use yuor MCP. i need you to write a detailed but concise documentation of how this entire app works, explained to non technical person but include also technical terms like React and etc. and just explain what it is, routing, file strucutre, and also how the supabase interacts with the arduino code here:

final-arduino-code/CO_SAFE_Monitor_MERGED_1.0.ino

Explain HTTP request and polling and include also a diagram map etc. export in .md documentation with diagrams if possible and the supabase schema architecture and explain the relational database, just make it 5 pages max for everything. include an introduction also. spawn multiple specialist subagents to help you out
