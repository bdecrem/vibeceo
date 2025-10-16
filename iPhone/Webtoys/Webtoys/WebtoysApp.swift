import SwiftUI
import AVFoundation

@main
struct WebtoysApp: App {
    init() {
        configureAudioSession()
        AudioInterruptionManager.shared.startObserving()
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
                options: [
                    .duckOthers,
                    .allowBluetooth,
                    .allowBluetoothA2DP,
                    .allowAirPlay
                ]
            )
            
            // Set preferred sample rate and buffer duration for smooth playback
            try audioSession.setPreferredSampleRate(44100.0)
            // Provide a larger buffer so CarPlay and other route changes have time to recover
            try audioSession.setPreferredIOBufferDuration(0.05)  // 50ms buffer for resilience

            if audioSession.responds(to: #selector(AVAudioSession.setPrefersNoInterruptionsFromSystemAlerts(_:))) {
                try audioSession.setPrefersNoInterruptionsFromSystemAlerts(true)
            }
            
            try audioSession.setActive(true)
            
            print("✅ Audio session configured: Sample Rate: \(audioSession.sampleRate), Buffer: \(audioSession.ioBufferDuration)")
            
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }
}
