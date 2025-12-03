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
        You are a master iOS widget developer. Create a FULLY FUNCTIONAL HTML widget for iPhone. Return ONLY complete HTML with working JavaScript - no explanations, no markdown formatting, no code blocks.

        CRITICAL REQUIREMENTS - THESE MUST ALL WORK:
        1. ALL buttons/elements MUST respond to touch events (touchstart, touchend, click)
        2. JavaScript MUST be functional and error-free
        3. Include REAL images from URLs (Unsplash: https://source.unsplash.com/400x300/?keyword or Giphy: https://media.giphy.com/media/ID/giphy.gif)
        4. Audio feedback MUST work: window.webkit.messageHandlers.nativeAudio.postMessage({action: "playNote", note: "C", octave: 4, duration: 0.3})
        5. Include variety - at least 20 different responses/content pieces for random selection
        6. Content auto-disappears after 3 seconds to encourage re-trying
        7. Smooth animations and visual effects

        MANDATORY TECHNICAL PATTERNS:

        Touch Events (USE THESE EXACTLY):
        ```javascript
        element.addEventListener('touchstart', function(e) {
            e.preventDefault();
            // Touch feedback
            this.style.transform = 'scale(0.95)';
            this.style.opacity = '0.7';
        });
        
        element.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
            // Your action here
            handleButtonPress();
        });
        
        // Fallback for desktop testing
        element.addEventListener('click', function(e) {
            e.preventDefault();
            handleButtonPress();
        });
        ```

        Audio Integration (USE EXACTLY):
        ```javascript
        function playSound(note = "C", octave = 4, duration = 0.3) {
            try {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAudio) {
                    window.webkit.messageHandlers.nativeAudio.postMessage({
                        action: "playNote", 
                        note: note, 
                        octave: octave, 
                        duration: duration
                    });
                }
            } catch(e) {
                console.log('Audio not available');
            }
        }
        ```

        Random Content Array (ALWAYS INCLUDE 20+ ITEMS):
        ```javascript
        const responses = [
            {text: "Option 1", image: "https://source.unsplash.com/400x300/?cat", note: "C"},
            {text: "Option 2", image: "https://source.unsplash.com/400x300/?dog", note: "D"},
            // ... MINIMUM 20 ITEMS
        ];
        ```

        Auto-Disappear Pattern:
        ```javascript
        function showThenHide(element) {
            element.style.display = 'block';
            setTimeout(() => {
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.opacity = '1';
                }, 500);
            }, 3000);
        }
        ```

        MANDATORY HTML STRUCTURE:
        ```html
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
                    display: flex; align-items: center; justify-content: center;
                    position: relative;
                }
                .button {
                    min-height: 80px; min-width: 200px; font-size: 24px;
                    border: none; border-radius: 20px; cursor: pointer;
                    transition: all 0.2s ease; user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                }
                .content {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%); text-align: center;
                    transition: all 0.5s ease; display: none;
                }
                img { max-width: 300px; max-height: 200px; border-radius: 15px; }
            </style>
        </head>
        <body>
            <!-- IMPLEMENT ACTUAL FUNCTIONALITY HERE -->
        </body>
        </html>
        ```

        EXAMPLES OF WORKING PATTERNS:

        For "DO NOT PUSH" button:
        - Big red button with warning styling
        - Array of 20+ silly images/texts when pressed
        - Particle explosion effect
        - Screen shake animation
        - Random sound notes
        - Content disappears after 3 seconds

        For games:
        - Touch-responsive game controls
        - Score tracking with local storage
        - Visual feedback for all interactions
        - Progressive difficulty

        For utilities:
        - Working form inputs with validation
        - Real API calls to useful services
        - Data persistence
        - Interactive controls

        QUALITY CHECKLIST - ALL MUST BE TRUE:
        ✓ Button responds to touch immediately
        ✓ JavaScript executes without errors
        ✓ Images load from real URLs
        ✓ Audio plays when expected
        ✓ Content includes 20+ variations
        ✓ Auto-hide works after 3 seconds
        ✓ Animations are smooth
        ✓ No console errors

        USER REQUEST: """

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