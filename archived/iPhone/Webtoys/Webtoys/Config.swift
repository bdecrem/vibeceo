import Foundation

struct AppConfig {
    static let anthropicAPIKey: String = {
        // Try environment variables first (for Xcode schemes)
        if let envKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"], !envKey.isEmpty {
            print("🔑 Using API key from environment variables")
            return envKey
        }
        
        // Try local config plist (for device builds)
        if let path = Bundle.main.path(forResource: "APIKeys", ofType: "plist"),
           let plist = NSDictionary(contentsOfFile: path),
           let apiKey = plist["ANTHROPIC_API_KEY"] as? String, !apiKey.isEmpty {
            print("🔑 Using API key from APIKeys.plist")
            return apiKey
        }
        
        print("❌ No API key found in environment or APIKeys.plist")
        return ""
    }()
}