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
        Create a simple, beautiful HTML widget for iPhone. Return ONLY complete HTML - no explanations.

        Requirements:
        - Full-screen widget (width: 100%, height: 100%, no margins)
        - Beautiful colors and smooth animations
        - Large, touch-friendly buttons (minimum 60px)
        - Include real images from Unsplash or Giphy when relevant
        - Add satisfying audio feedback using: window.webkit.messageHandlers.nativeAudio.postMessage({action: "playNote", note: "C", octave: 4, duration: 0.3})
        - Content should auto-disappear after 3 seconds to encourage re-trying

        Template structure:
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
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex; align-items: center; justify-content: center;
                }
            </style>
        </head>
        <body>
            <!-- Your widget content here -->
            <script>
                function playSound() {
                    try {
                        window.webkit?.messageHandlers?.nativeAudio?.postMessage({
                            action: "playNote", note: "C", octave: 4, duration: 0.3
                        });
                    } catch(e) {}
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