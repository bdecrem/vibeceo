import Foundation
import AVFoundation

class NativeAudioEngine: ObservableObject {
    private var audioEngine = AVAudioEngine()
    private var mixer = AVAudioMixerNode()
    private var reverb = AVAudioUnitReverb()
    private var delay = AVAudioUnitDelay()
    private var activePlayers: [AVAudioPlayerNode] = []
    
    // Standard audio format to prevent crackling
    private let audioFormat = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
    
    // Player pool to avoid constant attach/detach which causes crackling
    private var playerPool: [AVAudioPlayerNode] = []
    private var availablePlayers: [AVAudioPlayerNode] = []
    private let maxPlayers = 8
    
    static let shared = NativeAudioEngine()
    
    private init() {
        setupAudioEngine()
    }
    
    private func setupAudioEngine() {
        // Add mixer and effects to engine
        audioEngine.attach(mixer)
        audioEngine.attach(reverb)
        audioEngine.attach(delay)
        
        // Connect effects chain with explicit format to prevent crackling
        audioEngine.connect(mixer, to: reverb, format: audioFormat)
        audioEngine.connect(reverb, to: delay, format: audioFormat)
        audioEngine.connect(delay, to: audioEngine.outputNode, format: audioFormat)
        
        // Configure reverb for warmth (reduced to minimize artifacts)
        reverb.loadFactoryPreset(.mediumRoom)
        reverb.wetDryMix = 0.15  // Reduced from 0.3 to minimize crackling
        
        // Configure delay for subtle echo (reduced)
        delay.wetDryMix = 0.05   // Reduced from 0.1
        delay.delayTime = 0.1    // Reduced from 0.2
        
        // Set up player pool to avoid constant attach/detach crackling
        setupPlayerPool()
        
        // Prepare the engine but don't start yet
        audioEngine.prepare()
        
        // Start the engine with error handling
        do {
            try audioEngine.start()
        } catch {
            print("Failed to start audio engine: \(error)")
        }
    }
    
    private func setupPlayerPool() {
        // Pre-create and attach player nodes to avoid crackling from attach/detach
        for _ in 0..<maxPlayers {
            let player = AVAudioPlayerNode()
            audioEngine.attach(player)
            audioEngine.connect(player, to: mixer, format: audioFormat)
            playerPool.append(player)
            availablePlayers.append(player)
        }
    }
    
    private func getAvailablePlayer() -> AVAudioPlayerNode? {
        if !availablePlayers.isEmpty {
            return availablePlayers.removeFirst()
        }
        // If no available players, reuse the oldest one
        return playerPool.first
    }
    
    private func returnPlayer(_ player: AVAudioPlayerNode) {
        player.stop()
        if !availablePlayers.contains(player) {
            availablePlayers.append(player)
        }
    }
    
    // MARK: - Beautiful Sound Generation using AudioPlayerNode and generated samples
    
    func playNote(frequency: Float, duration: Double = 0.5, waveType: WaveType = .sine) {
        // Ensure we're on the audio queue to prevent crackling
        DispatchQueue.global(qos: .userInteractive).async {
            let sampleRate: Float = 44100
            let frameCount = AVAudioFrameCount(duration * Double(sampleRate))
            
            // Use consistent audio format to prevent crackling
            guard let buffer = AVAudioPCMBuffer(pcmFormat: self.audioFormat, frameCapacity: frameCount) else {
                print("Failed to create audio buffer")
                return
            }
            
            buffer.frameLength = frameCount
            
            // Generate beautiful sine wave with improved envelope
            let channels = Int(buffer.format.channelCount)
            
            for frame in 0..<Int(frameCount) {
                let time = Float(frame) / sampleRate
                let envelope = self.createSmoothEnvelope(time: time, duration: Float(duration))
                let sample = sin(2.0 * Float.pi * frequency * time) * envelope * 0.25  // Optimized volume
                
                for channel in 0..<channels {
                    buffer.floatChannelData?[channel][frame] = sample
                }
            }
            
            // Switch back to main queue for audio engine operations
            DispatchQueue.main.async {
                // Use pooled player to prevent crackling from attach/detach
                guard let player = self.getAvailablePlayer() else {
                    print("No available audio players")
                    return
                }
                
                // Check if engine is running before playing
                guard self.audioEngine.isRunning else {
                    print("Audio engine not running")
                    return
                }
                
                // Start player before scheduling to prevent crackling
                player.play()
                
                player.scheduleBuffer(buffer, at: nil) {
                    // Clean up and return player to pool
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        self.returnPlayer(player)
                    }
                }
            }
        }
    }
    
    private func createEnvelope(time: Float, duration: Float) -> Float {
        let attackTime: Float = 0.1
        let releaseTime: Float = 0.3
        let sustainLevel: Float = 0.7
        
        if time < attackTime {
            // Attack phase - fade in
            return time / attackTime
        } else if time < duration - releaseTime {
            // Sustain phase
            return sustainLevel
        } else {
            // Release phase - fade out
            let releaseProgress = (time - (duration - releaseTime)) / releaseTime
            return sustainLevel * (1.0 - releaseProgress)
        }
    }
    
    // Improved envelope with smoother transitions to prevent crackling
    private func createSmoothEnvelope(time: Float, duration: Float) -> Float {
        let attackTime: Float = 0.05    // Shorter attack
        let releaseTime: Float = 0.1    // Shorter release to prevent clicks
        let sustainLevel: Float = 0.8
        
        if time < attackTime {
            // Smooth attack phase using sine curve
            let progress = time / attackTime
            return sin(progress * Float.pi * 0.5)  // Quarter sine wave for smooth fade-in
        } else if time < duration - releaseTime {
            // Sustain phase
            return sustainLevel
        } else if time < duration {
            // Smooth release phase using cosine curve
            let releaseProgress = (time - (duration - releaseTime)) / releaseTime
            return sustainLevel * cos(releaseProgress * Float.pi * 0.5)  // Quarter cosine for smooth fade-out
        } else {
            return 0.0  // Ensure complete silence at end
        }
    }
    
    func playChord(frequencies: [Float], duration: Double = 1.0) {
        for (index, frequency) in frequencies.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.05) {
                self.playNote(frequency: frequency, duration: duration, waveType: .sine)
            }
        }
    }
    
    func playMelody(notes: [Float], rhythm: [Double]) {
        var currentTime: Double = 0
        
        for (index, frequency) in notes.enumerated() {
            let duration = rhythm[min(index, rhythm.count - 1)]
            
            DispatchQueue.main.asyncAfter(deadline: .now() + currentTime) {
                self.playNote(frequency: frequency, duration: duration)
            }
            
            currentTime += duration
        }
    }
    
    // MARK: - Musical Scale Helpers
    
    func noteFrequency(note: String, octave: Int = 4) -> Float {
        let noteMap: [String: Float] = [
            "C": 16.35, "C#": 17.32, "D": 18.35, "D#": 19.45,
            "E": 20.60, "F": 21.83, "F#": 23.12, "G": 24.50,
            "G#": 25.96, "A": 27.50, "A#": 29.14, "B": 30.87
        ]
        
        guard let baseFreq = noteMap[note.uppercased()] else { return 440.0 }
        return baseFreq * pow(2.0, Float(octave))
    }
    
    func majorScale(root: String, octave: Int = 4) -> [Float] {
        let intervals = [0, 2, 4, 5, 7, 9, 11] // Major scale intervals
        let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        
        guard let rootIndex = notes.firstIndex(of: root.uppercased()) else { return [] }
        
        return intervals.map { interval in
            let noteIndex = (rootIndex + interval) % 12
            return noteFrequency(note: notes[noteIndex], octave: octave)
        }
    }
    
    func pentatonicScale(root: String, octave: Int = 4) -> [Float] {
        let intervals = [0, 2, 4, 7, 9] // Pentatonic scale intervals
        let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        
        guard let rootIndex = notes.firstIndex(of: root.uppercased()) else { return [] }
        
        return intervals.map { interval in
            let noteIndex = (rootIndex + interval) % 12
            return noteFrequency(note: notes[noteIndex], octave: octave)
        }
    }
}

enum WaveType: String, CaseIterable {
    case sine = "sine"
    case triangle = "triangle"
    case sawtooth = "sawtooth"
    case square = "square"
}

// MARK: - JavaScript Bridge Audio Commands

extension NativeAudioEngine {
    func processAudioCommand(_ command: [String: Any]) {
        guard let action = command["action"] as? String else { return }
        
        switch action {
        case "playNote":
            if let freq = command["frequency"] as? Float {
                let duration = command["duration"] as? Double ?? 0.5
                playNote(frequency: freq, duration: duration)
            } else if let note = command["note"] as? String {
                let octave = command["octave"] as? Int ?? 4
                let duration = command["duration"] as? Double ?? 0.5
                let freq = noteFrequency(note: note, octave: octave)
                playNote(frequency: freq, duration: duration)
            }
            
        case "playChord":
            if let noteNames = command["notes"] as? [String] {
                let octave = command["octave"] as? Int ?? 4
                let duration = command["duration"] as? Double ?? 1.0
                let frequencies = noteNames.map { noteFrequency(note: $0, octave: octave) }
                playChord(frequencies: frequencies, duration: duration)
            }
            
        case "playScale":
            if let root = command["root"] as? String {
                let octave = command["octave"] as? Int ?? 4
                let scaleType = command["scaleType"] as? String ?? "major"
                let rhythm = command["rhythm"] as? [Double] ?? [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]
                
                let scale = scaleType == "pentatonic" ? 
                    pentatonicScale(root: root, octave: octave) : 
                    majorScale(root: root, octave: octave)
                
                playMelody(notes: scale, rhythm: rhythm)
            }
            
        default:
            print("Unknown audio command: \(action)")
        }
    }
}