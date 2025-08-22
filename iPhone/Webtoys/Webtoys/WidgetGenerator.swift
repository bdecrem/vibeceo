import Foundation

class WidgetGenerator {
    private let apiKey: String
    private let apiURL = URL(string: "https://api.anthropic.com/v1/messages")!
    
    init() {
        // Try to get API key from environment
        if let envKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] {
            self.apiKey = envKey
        } else {
            // For development, you'll need to set ANTHROPIC_API_KEY in your environment
            // or in your Xcode scheme's environment variables
            self.apiKey = ""
            print("⚠️ ANTHROPIC_API_KEY not found in environment. Widget generation will fail.")
            print("💡 Add ANTHROPIC_API_KEY to your Xcode scheme's environment variables")
        }
    }
    
    func generateWidget(prompt: String) async throws -> String {
        let systemPrompt = """
        Create an interactive mini-app widget in HTML/CSS/JS that fits a 3:2 portrait aspect ratio and works like a mobile app widget.

        REQUIREMENTS:
        - Return ONLY complete HTML (no markdown, no explanations)
        - Use inline CSS/JS (no external dependencies)
        - Make it 3:2 portrait aspect ratio (width:height = 2:3)
        - Add smooth animations and touch interactions
        - Use beautiful modern styling with gradients and glass morphism
        - Make it highly interactive and engaging
        - Include real functionality (not just decorative)
        - Auto-play animations or live updates when possible
        - Make it touch-friendly for mobile with proper button sizes

        WIDGET IDEAS TO INSPIRE YOU:
        - Live clocks with animated hands or digital displays
        - Interactive counters, calculators, or timers
        - Animated progress bars or data visualizations
        - Mini games (tap games, simple puzzles)
        - Live weather displays with animated weather effects
        - Music players with visualizers
        - Habit trackers with progress rings
        - Quick polls or surveys
        - Color pickers or palette generators
        - Random quote generators with beautiful typography

        TEMPLATE:
        ```html
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Widget</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 0; padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    width: 100vw; height: 100vh;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden; touch-action: manipulation;
                }
                .widget {
                    width: 100%; max-width: 300px; aspect-ratio: 2/3;
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(20px); border-radius: 24px; padding: 24px;
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
            throw WidgetGeneratorError.networkError
        }
        
        print("📡 API Response Status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            if let errorData = String(data: data, encoding: .utf8) {
                print("❌ API Error Response: \(errorData)")
            }
            throw WidgetGeneratorError.networkError
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

enum WidgetGeneratorError: Error {
    case networkError
    case parseError
}