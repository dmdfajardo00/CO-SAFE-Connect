 I need you to help me transform all our components in this project into Gluestack UI to make it more appear professional. then as for the bottom navigation, make the selected highlight black in color, and the other unselected as faded gray. 

 as for the steps, do the bottom navigator first, then as for the other components we'll proceed one by one.





I need you to make the alerts page simpler but still modern, remove awaiting response text. fix the spacing and hierarchy, remove these texts: "active and archive, because we already have active and history tabs.

I also need you to change the icon set of home, alerts, analytics and settings in the bottom navigation, use solar icon pack

Now I need you to make the generate AI button functional (no need to further change the UI and skeleton loading) and it will send a formatted payload of the co-readings linked to that session. and it must have a system prompt in place to provide accurate insights.

the model that it will be using is this. 
x-ai/grok-code-fast-1

Brainstorm, make a plan, and give me your options and recommendations first.


I need you to read and study this original library:
docs/ESPSupabaseLibrary/ESPSupabase
Read Claude.md for reference

These are the files we changed (note that if you want the files change the ones here, don't change the ones in the original library)
docs/arduino-code/supabase-library

This is our arduino code:
docs/arduino-code/revised-code/CO_SAFE_Monitor-enhanced 1.81.ino

Read this also to understand the gist:
docs/arduino-code/arduino-code-final.md (disclaimer some parts maybe outdated)

So far my biggest concern is this (this is what i need you to fix):

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

In 1.8 (the one you just made):
Reconnecting WiFi (attempt 4/5)...
.............
✅ WiFi connected: 192.168.1.196
⚠️ NTP sync failed, using millis() fallback
✅ Supabase REST API initialized
⏳ Connecting to WebSocket...
✅ Supabase Realtime WebSocket initialized
[WSc] Disconnected!
[WSc] Disconnected!

