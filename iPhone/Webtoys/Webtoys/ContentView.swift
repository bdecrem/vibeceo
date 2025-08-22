import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    @State private var showingCreateWebtToy = false
    
    var body: some View {
        ZStack {
            // Main content area
            Group {
                switch selectedTab {
                case 0:
                    HomeFeedView()
                case 1:
                    Text("Following Feed")
                        .font(.title)
                        .foregroundColor(.secondary)
                case 2:
                    Text("Profile")
                        .font(.title)
                        .foregroundColor(.secondary)
                default:
                    HomeFeedView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Custom Glass Tab Bar
            VStack {
                Spacer()
                
                ZStack {
                    // Glass tab bar with icons only
                    GlassTabBar(selectedTab: $selectedTab)
                    
                    // Floating + button outside glass container
                    HStack {
                        Spacer()
                        
                        Button(action: {
                            showingCreateWebtToy = true
                        }) {
                            ZStack {
                                // Gradient background
                                LinearGradient(
                                    colors: [Color.blue, Color.purple],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())
                                .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)
                                
                                Image(systemName: "plus")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                        }
                        .offset(x: -30, y: -8) // Position relative to glass bar
                    }
                }
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .sheet(isPresented: $showingCreateWebtToy) {
            CreateOptionsView()
        }
    }
}

struct GlassTabBar: View {
    @Binding var selectedTab: Int
    
    var body: some View {
        HStack(spacing: 24) {
            // Home Tab
            TabBarButton(
                icon: "house.fill",
                isSelected: selectedTab == 0
            ) {
                selectedTab = 0
            }
            
            // Following Tab
            TabBarButton(
                icon: "heart.fill",
                isSelected: selectedTab == 1
            ) {
                selectedTab = 1
            }
            
            // Profile Tab
            TabBarButton(
                icon: "person.fill",
                isSelected: selectedTab == 2
            ) {
                selectedTab = 2
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2.4)
        .background(
            // Glass morphism effect
            ZStack {
                // Blur background
                RoundedRectangle(cornerRadius: 18)
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .light)
                
                // Subtle border
                RoundedRectangle(cornerRadius: 18)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.6),
                                Color.white.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.5
                    )
                
                // Inner glow
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.08),
                                Color.clear
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 6)
    }
}

struct TabBarButton: View {
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .blue : .secondary)
                .scaleEffect(isSelected ? 1.15 : 1.0)
                .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
        }
        .frame(width: 32, height: 32)
    }
}

struct CreateOptionsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var showingMemeGenerator = false
    @State private var showingWidgetGenerator = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Create WebtToy")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top)
                
                VStack(spacing: 12) {
                    // Meme Generator
                    Button(action: {
                        showingMemeGenerator = true
                    }) {
                        HStack {
                            Text("🎭")
                                .font(.title2)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Quick Meme Generator")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                Text("Create memes instantly")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Widget Generator
                    Button(action: {
                        showingWidgetGenerator = true
                    }) {
                        HStack {
                            Text("⚡")
                                .font(.title2)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("AI Widget Generator")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                Text("Create interactive widgets with Claude")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                Button("Cancel") {
                    dismiss()
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray.opacity(0.2))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingMemeGenerator) {
            SimpleMemeView()
        }
        .sheet(isPresented: $showingWidgetGenerator) {
            WidgetGeneratorView()
        }
    }
}