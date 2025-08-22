import Foundation

// MARK: - WebtToyType Enum
enum WebtToyType: String, CaseIterable, Codable {
    case webpage = "webpage"
    case game = "game"
    case app = "app"
    case meme = "meme"
    
    var displayName: String {
        switch self {
        case .webpage: return "Web Page"
        case .game: return "Game"
        case .app: return "App"
        case .meme: return "Meme"
        }
    }
    
    var iconName: String {
        switch self {
        case .webpage: return "safari"
        case .game: return "gamecontroller"
        case .app: return "app"
        case .meme: return "face.smiling"
        }
    }
}

// MARK: - WebtToy Model
struct WebtToy: Identifiable, Codable {
    let id: UUID
    let title: String
    let description: String
    let creator: String
    let createdAt: Date
    let likes: Int
    let shares: Int
    let type: WebtToyType
    let url: String?
    let htmlContent: String? // For generated widgets
    
    init(title: String, description: String, creator: String, createdAt: Date, likes: Int, shares: Int, type: WebtToyType, url: String?, htmlContent: String? = nil) {
        self.id = UUID()
        self.title = title
        self.description = description
        self.creator = creator
        self.createdAt = createdAt
        self.likes = likes
        self.shares = shares
        self.type = type
        self.url = url
        self.htmlContent = htmlContent
    }
    
    // Convenience initializer for generated widgets
    init(title: String, description: String, htmlContent: String) {
        self.id = UUID()
        self.title = title
        self.description = description
        self.creator = "You"
        self.createdAt = Date()
        self.likes = 0
        self.shares = 0
        self.type = .app
        self.url = nil
        self.htmlContent = htmlContent
    }
    
    // Mock data for development
    static let mockData: [WebtToy] = [
        WebtToy(
            title: "Beat Metronome",
            description: "Professional metronome with customizable tempo and beautiful design",
            creator: "MusicMaker",
            createdAt: Date().addingTimeInterval(-7200),
            likes: 89,
            shares: 15,
            type: .app,
            url: "https://webtoys.ai/public/beat-metronome"
        ),
        WebtToy(
            title: "Cosmic Screensaver",
            description: "Mesmerizing space-themed screensaver with floating particles and nebula effects",
            creator: "StarGazer",
            createdAt: Date().addingTimeInterval(-10800),
            likes: 203,
            shares: 56,
            type: .app,
            url: "https://webtoys.ai/public/cosmic-screensaver"
        )
    ]
}

// MARK: - WebtToy Store
class WebtToyStore: ObservableObject {
    @Published var webtoys: [WebtToy] = WebtToy.mockData
    
    static let shared = WebtToyStore()
    
    private init() {}
    
    func addWebtToy(_ webtoy: WebtToy) {
        webtoys.insert(webtoy, at: 0) // Add to top of feed
    }
    
    func removeWebtToy(_ webtoy: WebtToy) {
        webtoys.removeAll { $0.id == webtoy.id }
    }
}