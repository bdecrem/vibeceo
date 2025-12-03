import SwiftUI

struct HomeFeedView: View {
    @StateObject private var store = WebtToyStore.shared
    @State private var isLoading = false
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                ForEach(store.webtoys) { webtoy in
                    WebtToyCardView(webtoy: webtoy)
                        .padding(.horizontal, 20)
                }
            }
            .padding(.top, 20)
            .padding(.bottom, 100) // Account for floating button
        }
        .refreshable {
            await refreshFeed()
        }
    }
    
    private func refreshFeed() async {
        isLoading = true
        try? await Task.sleep(nanoseconds: 1_000_000_000) // Simulate network delay
        // TODO: Replace with actual API call
        // For now, just refresh the existing data
        isLoading = false
    }
}

struct WebtToyCardView: View {
    let webtoy: WebtToy
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Direct preview - no card wrapper
            getPreviewCard(for: webtoy)
                .aspectRatio(2/3, contentMode: .fit) // 3:2 portrait aspect ratio (width:height = 2:3)
                .cornerRadius(12)
            
            // Bottom action bar
            HStack {
                Button(action: {}) {
                    HStack(spacing: 4) {
                        Image(systemName: "heart")
                        Text("\(webtoy.likes)")
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Button(action: {}) {
                    HStack(spacing: 4) {
                        Image(systemName: "square.and.arrow.up")
                        Text("\(webtoy.shares)")
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text("by \(webtoy.creator)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    @ViewBuilder
    private func getPreviewCard(for webtoy: WebtToy) -> some View {
        // If it's a generated widget with HTML content, show the WebView
        if let htmlContent = webtoy.htmlContent {
            WebView(htmlContent: htmlContent)
                .clipped()
                .cornerRadius(12)
        } else {
            // Otherwise, show custom preview based on title
            switch webtoy.title {
        case "Mini Weather":
            // Weather widget preview
            ZStack {
                LinearGradient(
                    colors: [Color.cyan.opacity(0.8), Color.blue.opacity(0.9), Color.indigo.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                VStack(spacing: 12) {
                    // Cloud animation
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.white.opacity(0.9))
                            .frame(width: 16, height: 16)
                        Circle()
                            .fill(Color.white.opacity(0.7))
                            .frame(width: 12, height: 12)
                        Circle()
                            .fill(Color.white.opacity(0.8))
                            .frame(width: 14, height: 14)
                    }
                    .offset(x: -10)
                    
                    // Temperature
                    Text("72°")
                        .font(.system(size: 42, weight: .thin, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Sunny")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            
        case "Color Palette":
            // Color picker preview
            ZStack {
                Color.black
                
                VStack(spacing: 8) {
                    // Color squares
                    HStack(spacing: 4) {
                        Rectangle().fill(Color.red).frame(width: 24, height: 24)
                        Rectangle().fill(Color.orange).frame(width: 24, height: 24)
                        Rectangle().fill(Color.yellow).frame(width: 24, height: 24)
                        Rectangle().fill(Color.green).frame(width: 24, height: 24)
                    }
                    HStack(spacing: 4) {
                        Rectangle().fill(Color.blue).frame(width: 24, height: 24)
                        Rectangle().fill(Color.purple).frame(width: 24, height: 24)
                        Rectangle().fill(Color.pink).frame(width: 24, height: 24)
                        Rectangle().fill(Color.cyan).frame(width: 24, height: 24)
                    }
                    
                    // Hex codes
                    VStack(spacing: 2) {
                        Text("#FF6B6B")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundColor(.white)
                        Text("#4ECDC4")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            
        case "Focus Timer":
            // Pomodoro timer preview
            ZStack {
                LinearGradient(
                    colors: [Color.mint.opacity(0.8), Color.green.opacity(0.6)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                VStack(spacing: 16) {
                    // Breathing circle
                    Circle()
                        .stroke(Color.white.opacity(0.3), lineWidth: 2)
                        .frame(width: 80, height: 80)
                        .overlay(
                            Circle()
                                .fill(Color.white.opacity(0.2))
                                .frame(width: 60, height: 60)
                        )
                    
                    // Timer display
                    Text("25:00")
                        .font(.system(size: 24, weight: .light, design: .monospaced))
                        .foregroundColor(.white)
                    
                    Text("Focus Time")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            
        case "Tap Counter":
            // Counter preview
            ZStack {
                LinearGradient(
                    colors: [Color.pink.opacity(0.8), Color.purple.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                VStack(spacing: 16) {
                    // Ripple effect
                    Circle()
                        .stroke(Color.white.opacity(0.4), lineWidth: 1)
                        .frame(width: 100, height: 100)
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                .frame(width: 80, height: 80)
                        )
                    
                    // Counter number
                    Text("42")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Taps")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            
        case "Beat Metronome":
            // Metronome preview
            ZStack {
                LinearGradient(
                    colors: [Color.orange.opacity(0.9), Color.red.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                VStack(spacing: 16) {
                    // Metronome arm
                    Rectangle()
                        .fill(Color.white)
                        .frame(width: 3, height: 80)
                        .rotationEffect(.degrees(15))
                    
                    // Base
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white.opacity(0.9))
                        .frame(width: 100, height: 40)
                        .overlay(
                            VStack(spacing: 2) {
                                Text("120")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(.orange)
                                Text("BPM")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        )
                }
            }
            
        case "Cosmic Screensaver":
            // Screensaver preview
            ZStack {
                LinearGradient(
                    colors: [Color.purple, Color.blue, Color.indigo],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                // Floating particles
                ForEach(0..<12, id: \.self) { i in
                    Circle()
                        .fill(Color.white.opacity(Double.random(in: 0.3...0.8)))
                        .frame(width: Double.random(in: 3...8), height: Double.random(in: 3...8))
                        .position(
                            x: Double.random(in: 20...300),
                            y: Double.random(in: 20...160)
                        )
                }
                
                // Center glow
                Circle()
                    .fill(RadialGradient(
                        colors: [Color.white.opacity(0.6), Color.clear],
                        center: .center,
                        startRadius: 5,
                        endRadius: 40
                    ))
                    .frame(width: 80, height: 80)
            }
            
        default:
            // Default preview
            RoundedRectangle(cornerRadius: 12)
                .fill(LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .overlay(
                    VStack {
                        Image(systemName: "safari")
                            .font(.system(size: 30))
                            .foregroundColor(.blue)
                        Text("WebtToy")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                )
            }
        }
    }
}