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
            title: "🎹 Native Audio Test",
            description: "Test piano with beautiful native iOS audio",
            htmlContent: """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Test Native Audio</title>
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
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; text-align: center;
        }
        .piano-key {
            width: 50px; height: 120px; margin: 1px;
            background: rgba(255,255,255,0.3);
            border-radius: 6px;
            display: flex; align-items: flex-end; justify-content: center;
            padding: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.1s ease;
            font-size: 12px;
        }
        .piano-key:active {
            background: rgba(255,255,255,0.6);
            transform: scale(0.95);
        }
        .piano {
            display: flex;
            gap: 2px;
        }
        .title {
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="widget">
        <div class="title">🎹 Native Audio</div>
        <div class="piano">
            <div class="piano-key" data-note="C" data-octave="4">C</div>
            <div class="piano-key" data-note="D" data-octave="4">D</div>
            <div class="piano-key" data-note="E" data-octave="4">E</div>
            <div class="piano-key" data-note="F" data-octave="4">F</div>
            <div class="piano-key" data-note="G" data-octave="4">G</div>
        </div>
    </div>

    <script>
        // Helper function for native audio
        function playNote(note, octave = 4, duration = 0.5) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAudio) {
                window.webkit.messageHandlers.nativeAudio.postMessage({
                    action: "playNote",
                    note: note,
                    octave: octave,
                    duration: duration
                });
                console.log(`🎵 Playing native audio: ${note}${octave}`);
            } else {
                console.log("❌ Native audio bridge not available");
            }
        }

        // Add touch events to piano keys
        document.querySelectorAll('.piano-key').forEach(key => {
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const note = key.dataset.note;
                const octave = parseInt(key.dataset.octave);
                playNote(note, octave, 0.6);
            });

            key.addEventListener('click', (e) => {
                const note = key.dataset.note;
                const octave = parseInt(key.dataset.octave);
                playNote(note, octave, 0.6);
            });
        });
    </script>
</body>
</html>
"""
        ),
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