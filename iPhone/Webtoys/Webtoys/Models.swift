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
            title: "Mini Weather",
            description: "Beautiful weather widget with animated clouds and live temperature",
            creator: "WeatherPro",
            createdAt: Date().addingTimeInterval(-1800),
            likes: 156,
            shares: 34,
            type: .app,
            url: "https://webtoys.ai/public/mini-weather"
        ),
        WebtToy(
            title: "Color Palette",
            description: "Interactive color picker with trending palettes and hex codes",
            creator: "DesignStudio",
            createdAt: Date().addingTimeInterval(-3600),
            likes: 289,
            shares: 67,
            type: .app,
            url: "https://webtoys.ai/public/color-palette"
        ),
        WebtToy(
            title: "Focus Timer",
            description: "Minimalist pomodoro timer with breathing animations and zen vibes",
            creator: "ProductivityGuru",
            createdAt: Date().addingTimeInterval(-5400),
            likes: 124,
            shares: 28,
            type: .app,
            url: "https://webtoys.ai/public/focus-timer"
        ),
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
            title: "Tap Counter",
            description: "Satisfying tap counter with ripple effects and smooth animations",
            creator: "CountMaster",
            createdAt: Date().addingTimeInterval(-9000),
            likes: 167,
            shares: 42,
            type: .app,
            url: "https://webtoys.ai/public/tap-counter"
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
    @Published var webtoys: [WebtToy] = []
    
    static let shared = WebtToyStore()
    private let userDefaults = UserDefaults.standard
    private let storageKey = "SavedWebtToys"
    
    private init() {
        loadWebtToys()
    }
    
    func addWebtToy(_ webtoy: WebtToy) {
        webtoys.insert(webtoy, at: 0) // Add to top of feed
        saveWebtToys()
    }
    
    func removeWebtToy(_ webtoy: WebtToy) {
        webtoys.removeAll { $0.id == webtoy.id }
        saveWebtToys()
    }
    
    private func saveWebtToys() {
        do {
            let data = try JSONEncoder().encode(webtoys)
            userDefaults.set(data, forKey: storageKey)
            print("✅ Saved \(webtoys.count) WebtToys to storage")
        } catch {
            print("❌ Failed to save WebtToys: \(error)")
        }
    }
    
    private func loadWebtToys() {
        guard let data = userDefaults.data(forKey: storageKey) else {
            print("📦 No saved WebtToys found, using mock data")
            webtoys = WebtToy.mockData
            saveWebtToys() // Save mock data for next time
            return
        }
        
        do {
            webtoys = try JSONDecoder().decode([WebtToy].self, from: data)
            print("✅ Loaded \(webtoys.count) WebtToys from storage")
        } catch {
            print("❌ Failed to load WebtToys: \(error)")
            print("📦 Using mock data as fallback")
            webtoys = WebtToy.mockData
            saveWebtToys()
        }
    }
    
    func resetToMockData() {
        webtoys = WebtToy.mockData
        saveWebtToys()
    }
}