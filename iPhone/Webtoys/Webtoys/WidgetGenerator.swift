import Foundation

class WidgetGenerator {
    private let apiKey: String
    private let apiURL = URL(string: "https://api.anthropic.com/v1/messages")!
    
    init() {
        // Try to get API key from environment first
        if let envKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] {
            self.apiKey = envKey
            print("🔑 Using API key from environment variables")
        } else {
            // Fall back to config file
            self.apiKey = AppConfig.anthropicAPIKey
            print("🔑 Using API key from AppConfig")
        }
    }
    
    func generateWidget(prompt: String) async throws -> String {
        print("🔑 Using API key: \(apiKey.isEmpty ? "❌ EMPTY" : "✅ Present (\(apiKey.prefix(10))...)")")
        
        if apiKey.isEmpty {
            throw WidgetGeneratorError.authenticationError("API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.")
        }
        
        let systemPrompt = """
        Create a MUSICAL, INTERACTIVE, COLORFUL mini-app widget for iPhone in HTML/CSS/JS. This is a 3:2 portrait canvas for creating dynamic, playful, sound-rich experiences.

        🎵 BEAUTIFUL SOUND & MUSIC PRIORITY:
        - MOST widgets should include BEAUTIFUL, HARMONIC sound effects and music
        - NEVER create harsh, experimental, or screechy sounds
        - ALWAYS use proper musical scales (major, minor, pentatonic, etc.)
        - ALWAYS apply low-pass filtering to remove harsh high frequencies
        - Use Web Audio API with proper filtering and envelope shaping
        - Create SMOOTH, ROUNDED tones using:
          * Sine waves (smoothest) or filtered sawtooth/square waves
          * Low-pass filters (cutoff around 2000-4000Hz) to remove harshness
          * ADSR envelopes for gentle attack/release
          * Reverb and gentle chorus effects for warmth
        - Musical examples to emulate:
          * Soft piano sounds, warm pad synthesizers
          * Gentle bells and chimes in musical keys
          * Smooth ambient textures, not harsh electronic bleeps
          * Melodic sequences that sound like actual music
        - ALWAYS use musical intervals: octaves, fifths, major/minor thirds
        - NEVER use random frequencies - stick to note frequencies (440Hz = A4, etc.)

        🎨 VISUAL & INTERACTION PRIORITY:
        - Extremely colorful with vibrant gradients and dynamic color changes
        - Every touch/drag should create immediate visual and audio feedback
        - Smooth animations that respond to user input in real-time
        - Particle systems, flowing animations, and morphing shapes
        - Colors should change based on interaction, sound frequency, or time
        - Create "playful" experiences - make it fun to just touch and explore

        🎯 WIDGET CONCEPTS TO PRIORITIZE (ALL WITH BEAUTIFUL SOUND):
        - Soft piano-like paint brushes that play gentle melodies as you draw
        - Touch-sensitive tone generators with warm, filtered sine waves
        - Rhythmic pattern makers with smooth drum sounds (no harsh clicks)
        - Melodic color mapping (C major scale: C-D-E-F-G-A-B across rainbow colors)
        - Ambient pad generators with flowing particles and warm textures
        - Gentle chord progressions (C-Am-F-G, etc.) triggered by touch
        - Sound-reactive animations that pulse with filtered, musical audio  
        - Pentatonic scale sequences you can paint across the screen
        - Soft synthesizer keyboards with reverb and gentle attacks
        - Generative music using only pleasant musical scales and intervals
        
        SOUND FILTERING EXAMPLES:
        - Always create: const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3000;
        - Use gainNode with smooth envelope: gain.gain.setTargetAtTime(0, time + 0.5, 0.1);
        - Prefer sine waves: oscillator.type = 'sine'; over square/sawtooth
        - Add reverb: const convolver = audioCtx.createConvolver(); for warmth

        REQUIREMENTS:
        - Return ONLY complete HTML (no markdown, no explanations)
        - Use inline CSS/JS (no external dependencies except Web Audio API)
        - 3:2 portrait aspect ratio optimized for iPhone feed
        - Initialize Web Audio API on first user touch (iOS requirement)
        - Immediate audio feedback on touch/drag interactions
        - Vibrant colors that change dynamically
        - Smooth 60fps animations
        - Touch-friendly with fluid gesture recognition
        - Use touchstart/touchmove/touchend events for mobile

        TEMPLATE:
        ```html
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Widget</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    width: 100vw; height: 100vh;
                    overflow: hidden; touch-action: manipulation;
                }
                .widget {
                    width: 100vw; height: 100vh;
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: white; text-align: center; position: relative;
                    overflow: hidden;
                }
                .btn {
                    background: rgba(255,255,255,0.2); border: none; border-radius: 12px;
                    padding: 12px 20px; color: white; font-weight: 600;
                    cursor: pointer; transition: all 0.3s ease;
                    backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);
                    min-height: 44px; min-width: 44px;
                }
                .btn:hover, .btn:active {
                    background: rgba(255,255,255,0.3); transform: scale(0.95);
                }
            </style>
        </head>
        <body>
            <div class="widget">
                <!-- Your interactive widget content here -->
            </div>
            <script>
                // Your JavaScript here - make it interactive and engaging!
                // Add event listeners, animations, real-time updates, etc.
            </script>
        </body>
        </html>
        ```

        User request: "{prompt}"
        """

        let requestBody: [String: Any] = [
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2000,
            "messages": [
                ["role": "user", "content": prompt]
            ],
            "system": systemPrompt
        ]

        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid response type")
            throw WidgetGeneratorError.networkError("Invalid response type")
        }
        
        print("📡 API Response Status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            if let errorData = String(data: data, encoding: .utf8) {
                print("❌ API Error Response: \(errorData)")
            }
            
            // Handle specific error codes
            switch httpResponse.statusCode {
            case 401:
                throw WidgetGeneratorError.authenticationError("Invalid API key")
            case 402:
                throw WidgetGeneratorError.quotaExceeded("API quota exceeded or payment required")
            case 429:
                throw WidgetGeneratorError.rateLimitError("Rate limit exceeded")
            default:
                throw WidgetGeneratorError.networkError("HTTP \(httpResponse.statusCode)")
            }
        }

        guard let responseObject = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            print("❌ Failed to parse JSON response")
            throw WidgetGeneratorError.parseError
        }
        
        print("✅ Parsed API response successfully")
        
        guard let content = responseObject["content"] as? [[String: Any]],
              let firstContent = content.first,
              let text = firstContent["text"] as? String else {
            print("❌ Failed to extract content from response")
            print("Response structure: \(responseObject)")
            throw WidgetGeneratorError.parseError
        }

        print("✅ Extracted widget HTML content")
        return cleanHTMLResponse(text)
    }
    
    private func cleanHTMLResponse(_ response: String) -> String {
        var cleaned = response
        cleaned = cleaned.replacingOccurrences(of: "```html", with: "")
        cleaned = cleaned.replacingOccurrences(of: "```", with: "")
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if !cleaned.hasPrefix("<!DOCTYPE") && !cleaned.hasPrefix("<html") {
            if let startRange = cleaned.range(of: "<!DOCTYPE") ?? cleaned.range(of: "<html") {
                cleaned = String(cleaned[startRange.lowerBound...])
            }
        }
        
        return cleaned
    }
}

enum WidgetGeneratorError: Error, LocalizedError {
    case networkError(String = "Network error")
    case parseError
    case authenticationError(String)
    case quotaExceeded(String)
    case rateLimitError(String)
    
    var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return message
        case .parseError:
            return "Failed to parse response"
        case .authenticationError(let message):
            return message
        case .quotaExceeded(let message):
            return message
        case .rateLimitError(let message):
            return message
        }
    }
}