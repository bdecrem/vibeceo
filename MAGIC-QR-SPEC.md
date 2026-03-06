# Magic QR: One-Scan Server Setup

## What the user experiences
1. They open Claudio
2. They tap "Scan QR Code"
3. They point their phone at a QR code on their computer screen
4. They're chatting with their agent. Done.

No typing URLs. No copying tokens. No "device not approved" errors. One scan, connected.

## The QR Code

OpenClaw servers generate a QR code via `openclaw qr`. It encodes a base64 JSON string:

```
eyJ1cmwiOiJ3czovLzE5Mi4xNjguNy41MDoxODc4OSIsInRva2VuIjoiOTUzNDdhNDJiNmRjNThkZWI1ZjQ5YzgyODk5OTVlOGE3MWVjNWI4NGI5Y2JmMWE1In0
```

Which decodes to:
```json
{
  "url": "ws://192.168.7.50:18789",
  "token": "95347a42b6dc58deb5f49c8289995e8a71ec5b84b9cbf1a5"
}
```

That's it — just a URL and a bearer token.

## What Claudio needs to do

### 1. QR Scanner (iOS side)

Add a "Scan QR Code" button on the server setup screen (or as a first-run onboarding option).

- Use `AVCaptureSession` with `AVMetadataObjectTypeQRCode`
- Or use the simpler `DataScannerViewController` (iOS 16+, VisionKit)
- When a QR is detected:
  - Base64-decode the string
  - Parse the JSON to extract `url` and `token`
  - If the URL starts with `ws://` on a private IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x), keep it as-is (user is on same LAN as server)
  - Save as a new server config

### 2. Connect + Auto-Approve (the magic part)

This is the critical piece. Today, first-time connections get rejected with WebSocket close code `1008` ("pairing required"). The device shows up as "pending" on the server and someone has to manually run `openclaw devices approve`.

To make it instant, the **Claudio Server** (Go backend on Railway) handles auto-approval:

#### Flow:
1. Claudio (iPhone) connects to OpenClaw server → gets rejected with code 1008
2. Claudio (iPhone) tells the Claudio Server: "I just got rejected by this server, here's the URL and token"
3. Claudio Server connects to the OpenClaw server as an operator (it's already paired)
4. Claudio Server calls the devices API to list pending devices and approve the new one
5. Claudio (iPhone) auto-retries the connection → succeeds
6. User is chatting

Total time: 2-3 seconds. User sees a brief "Connecting..." then they're in.

#### Claudio Server API for auto-approve:

The Go server needs a new endpoint:

```
POST /devices/approve
{
  "serverUrl": "ws://192.168.7.50:18789",
  "serverToken": "95347a42...",
  "devicePublicKey": "abc123..."  // optional, to approve specific device
}
```

The server connects to the OpenClaw instance via WebSocket, authenticates as operator, and sends:

```json
{"type": "req", "id": "approve-1", "method": "devices.list"}
```

Then for each pending device:
```json
{"type": "req", "id": "approve-2", "method": "devices.approve", "params": {"requestId": "171e70c1-..."}}
```

#### Alternative: Direct approval from Claudio (simpler)

If the iPhone itself connects as an operator (the token gives operator access), it could potentially approve its own device. But this is a chicken-and-egg problem — it can't connect because it's not approved yet.

The simplest approach: **have OpenClaw auto-approve devices that present a valid gateway token.** If they have the token, they're authorized. The pairing step is redundant.

This could be a config option in `openclaw.json`:
```json
{
  "gateway": {
    "devices": {
      "autoApproveWithValidToken": true
    }
  }
}
```

If OpenClaw supports this (or adds it), no Claudio Server involvement needed at all. Check the OpenClaw docs/source for this option. If it doesn't exist, request it — it's the cleanest solution.

### 3. UX Flow

```
┌─────────────────────┐
│                     │
│   Welcome to        │
│   Claudio           │
│                     │
│  ┌───────────────┐  │
│  │ Scan QR Code  │  │
│  └───────────────┘  │
│                     │
│  Or enter manually  │
│                     │
└─────────────────────┘
         │
         ▼ (scan)
┌─────────────────────┐
│                     │
│   📷 Camera         │
│   Point at QR code  │
│   on your computer  │
│                     │
└─────────────────────┘
         │
         ▼ (detected)
┌─────────────────────┐
│                     │
│   Connecting...     │
│   ●●●               │
│                     │
└─────────────────────┘
         │
         ▼ (2-3 sec)
┌─────────────────────┐
│                     │
│   ✅ Connected to   │
│   My Server         │
│                     │
│   💬 Start chatting │
│                     │
└─────────────────────┘
```

### 4. Edge Cases

- **Invalid QR**: Show "This doesn't look like an OpenClaw QR code. Make sure you're scanning the code from `openclaw qr`."
- **Server unreachable**: Show "Can't reach your server. Make sure it's running and you're on the same network."
- **Approval takes too long (>10s)**: Show "Waiting for server approval... You may need to run `openclaw devices approve` on your computer." (fallback to manual flow)
- **User already has this server**: Ask "Update connection?" or just reconnect with new token.

## Files to modify

### Claudio (iOS)
- New: `QRScannerView.swift` — camera + QR detection + base64 decode
- Modified: `ServerSetupView.swift` (or equivalent) — add "Scan QR" button
- Modified: `ChatService.swift` — on 1008 close code, trigger auto-approve flow then retry

### Claudio Server (Go)
- New endpoint: `POST /devices/approve` — connects to OpenClaw, approves pending devices
- Or: poll for pending devices when a client reports a 1008 rejection

## Summary

The QR contains URL + token. Claudio scans it, connects, gets auto-approved (via Claudio Server or OpenClaw config), and the user is chatting. One scan, done.
