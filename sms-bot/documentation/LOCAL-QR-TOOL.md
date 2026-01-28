# Local QR Code Tool

A utility for testing web apps on your phone during local development.

## What It Does

1. Detects your local network IP (e.g., `192.168.x.x`)
2. Generates a QR code pointing to your dev server
3. Opens it in your browser for scanning

## Usage

```bash
# From repo root
./pixelpit/tools/qr [port] [path]

# Examples
./pixelpit/tools/qr                    # http://192.168.x.x:3000
./pixelpit/tools/qr 8080               # http://192.168.x.x:8080
./pixelpit/tools/qr 3000 /pixelpit/arcade  # http://192.168.x.x:3000/pixelpit/arcade
```

Or directly with Python:
```bash
python3 pixelpit/tools/local-qr.py 3000 /pixelpit/arcade
```

## Requirements

- Your phone and computer must be on the same WiFi network
- Your dev server must be running on the specified port
- No Python dependencies required (uses api.qrserver.com for QR generation)

## How It Works

1. Uses a UDP socket trick to detect the local network IP
2. Builds the full URL with your IP, port, and path
3. Creates an HTML file that loads the QR code from a free API
4. Opens the HTML in your default browser
5. Scan with your phone's camera to navigate to the URL

## Files

- `pixelpit/tools/local-qr.py` — Main script
- `pixelpit/tools/qr` — Shell shortcut
- `pixelpit/tools/qr.html` — Generated QR page (gitignored)
