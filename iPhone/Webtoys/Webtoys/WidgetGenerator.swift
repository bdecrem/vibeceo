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
        Create a MUSICAL, INTERACTIVE, COLORFUL HTML widget for iPhone. Return complete HTML with embedded CSS and JavaScript for a beautiful 3:2 portrait widget with Web Audio API.

        🎵 NATIVE AUDIO SYSTEM:
        - Use window.webkit.messageHandlers.nativeAudio for beautiful, professional sound
        - Native audio methods available in JavaScript:
          * playNote(note, octave, duration) - Play single note through native bridge
          * playChord(notes, octave, duration) - Play chord through native bridge
          * playScale(root, scaleType, octave) - Play musical scale through native bridge
        - Available notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
        - Available scales: "major", "pentatonic"
        
        MUSICAL GUIDELINES:
        - Use proper musical scales and chord progressions
        - Create harmonic, beautiful sounds - never harsh or experimental
        - Examples: C major (C-D-E-F-G-A-B), C major chord (C-E-G)
        - Pentatonic scales for ambient/meditative sounds
        - Layer multiple notes with slight delays for rich harmony

        🎨 VISUAL & INTERACTION PRIORITY:
        - Extremely colorful with vibrant gradients and dynamic color changes
        - Every touch/drag should create immediate visual and audio feedback
        - Smooth animations that respond to user input in real-time
        - Particle systems, flowing animations, and morphing shapes
        - Colors should change based on interaction, sound frequency, or time
        - Create "playful" experiences - make it fun to just touch and explore

        🎯 HTML WIDGET CONCEPTS (ALL WITH BEAUTIFUL AUDIO):
        - Piano keyboards with clickable keys playing chords
        - Color palettes where each color plays a musical note
        - Animated particle systems with musical sequences
        - Touch-responsive gradient backgrounds that change with music
        - Rhythm makers with visual beat patterns and drum sounds
        - Ambient chord progression generators with flowing animations
        - Musical paint brushes with mouse/touch drawing + sound
        - Pentatonic wind chimes with animated falling elements
        - Interactive musical scales with colorful note visualization
        - Chord progression widgets (C-Am-F-G patterns) with beautiful transitions

        NATIVE AUDIO EXAMPLES:
        - Single note: window.webkit.messageHandlers.nativeAudio.postMessage({action: "playNote", note: "C", octave: 4, duration: 0.5})
        - Beautiful chord: window.webkit.messageHandlers.nativeAudio.postMessage({action: "playChord", notes: ["C", "E", "G"], octave: 4, duration: 1.0})
        - Musical scale: window.webkit.messageHandlers.nativeAudio.postMessage({action: "playScale", root: "C", scaleType: "major", octave: 4})
        - With error handling: try { window.webkit?.messageHandlers?.nativeAudio?.postMessage(...) } catch(e) { console.log(e) }

        REQUIREMENTS:
        - Return ONLY complete HTML document (no markdown, no explanations)
        - Include <!DOCTYPE html>, <html>, <head>, <body> structure
        - 3:2 portrait aspect ratio optimized for iPhone feed
        - IMPORTANT: Use full canvas - NO borders, margins, or frames around content
        - Set html/body to width: 100%, height: 100%, margin: 0, padding: 0
        - Use native audio bridge for all sounds (window.webkit.messageHandlers.nativeAudio)
        - Immediate beautiful audio feedback on touch interactions
        - Embedded CSS in <style> tags for styling
        - Smooth animations with CSS transitions and JavaScript
        - Touch-friendly with large clickable areas
        - Include proper error handling for audio calls (try/catch)

        TEMPLATE:
        ```html
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
            <title>Musical Widget</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; border: none; outline: none; }
                html, body {
                    margin: 0; padding: 0; border: 0;
                    width: 100%; height: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    overflow: hidden; touch-action: manipulation;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    position: relative;
                }
                .title {
                    font-size: 24px; font-weight: bold; color: white; margin-bottom: 30px;
                }
                .button {
                    background: rgba(255,255,255,0.2);
                    padding: 15px 30px; border-radius: 25px;
                    cursor: pointer; transition: all 0.3s ease;
                    border: none; color: white; font-size: 18px; font-weight: 600;
                }
                .button:active { transform: scale(0.95); }
            </style>
        </head>
        <body>
            <div class="title">🎵 Your Widget</div>
            <button class="button" onclick="playSound()">Touch Me</button>
            
            <script>
                function playSound() {
                    try {
                        if (window.webkit?.messageHandlers?.nativeAudio) {
                            window.webkit.messageHandlers.nativeAudio.postMessage({
                                action: "playNote",
                                note: "C",
                                octave: 4,
                                duration: 0.5
                            });
                        }
                    } catch (error) {
                        console.log('Audio error:', error);
                    }
                }
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
    
    private func cleanJSXResponse(_ response: String) -> String {
        var cleaned = response
        
        // Remove code block markers
        cleaned = cleaned.replacingOccurrences(of: "```jsx", with: "")
        cleaned = cleaned.replacingOccurrences(of: "```javascript", with: "")
        cleaned = cleaned.replacingOccurrences(of: "```", with: "")
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Extract JSX component if wrapped in explanatory text
        if !cleaned.hasPrefix("import") {
            if let startRange = cleaned.range(of: "import React") ?? cleaned.range(of: "import {") {
                cleaned = String(cleaned[startRange.lowerBound...])
            }
        }
        
        return cleaned
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