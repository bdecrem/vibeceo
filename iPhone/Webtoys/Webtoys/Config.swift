import Foundation

struct AppConfig {
    static let anthropicAPIKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? ""
}