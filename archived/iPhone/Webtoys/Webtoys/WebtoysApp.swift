import SwiftUI
import AVFoundation

@main
struct WebtoysApp: App {
    init() {
        configureAudioSession()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Configure for high-quality audio playback without crackling
            try audioSession.setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers, .allowAirPlay, .allowBluetooth]
            )
            
            // Set preferred sample rate and buffer duration for smooth playback
            try audioSession.setPreferredSampleRate(44100.0)
            try audioSession.setPreferredIOBufferDuration(0.005)  // 5ms buffer for low latency
            
            try audioSession.setActive(true)
            
            print("✅ Audio session configured: Sample Rate: \(audioSession.sampleRate), Buffer: \(audioSession.ioBufferDuration)")
            
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }
}