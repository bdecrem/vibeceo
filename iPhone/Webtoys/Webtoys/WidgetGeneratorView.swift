import SwiftUI
import WebKit

struct WidgetGeneratorView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var prompt = ""
    @State private var isGenerating = false
    @State private var generatedWidget: String? = nil
    @State private var showingWidget = false
    @State private var showingSuccessMessage = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var useReactNative = false // Toggle for React Native vs WebView
    
    private let widgetGenerator = WidgetGenerator()
    private let store = WebtToyStore.shared
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Widget Generator")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top)
                
                Text("Create interactive widgets with AI")
                    .font(.body)
                    .foregroundColor(.secondary)
                
                // Quick Examples - Musical Focus
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ExampleCard(title: "Piano", emoji: "🎹", prompt: "A beautiful piano with black and white keys")
                        ExampleCard(title: "Chords", emoji: "🎸", prompt: "A chord player with progressions")
                        ExampleCard(title: "Notes", emoji: "🎵", prompt: "A musical note player with colors")
                        ExampleCard(title: "Colors", emoji: "🎨", prompt: "A color mixer that makes harmonious sounds")
                    }
                    .padding(.horizontal, 20)
                }
                
                // Text Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Describe your widget:")
                        .font(.headline)
                    
                    TextEditor(text: $prompt)
                        .frame(minHeight: 80)
                        .padding(12)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                // Action Buttons
                HStack(spacing: 16) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                    
                    Button(action: {
                        generateWidget()
                    }) {
                        if isGenerating {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Generating...")
                            }
                        } else {
                            Text("Generate Widget")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isGenerating ? Color.gray : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .disabled(prompt.isEmpty || isGenerating)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingWidget) {
            if let widget = generatedWidget {
                if useReactNative {
                    ReactNativeWidgetPreviewView(
                        jsxContent: widget,
                        prompt: prompt,
                        onAddToHome: { title in
                            addWidgetToHome(title: title, htmlContent: widget)
                        }
                    )
                } else {
                    WidgetPreviewView(
                        htmlContent: widget,
                        prompt: prompt,
                        onAddToHome: { title in
                            addWidgetToHome(title: title, htmlContent: widget)
                        }
                    )
                }
            }
        }
        .alert("Widget Added!", isPresented: $showingSuccessMessage) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Your widget has been added to the home feed!")
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }
    
    private func generateWidget() {
        print("🚀 Starting widget generation with prompt: \(prompt)")
        isGenerating = true
        
        Task {
            do {
                print("📞 Calling Claude API...")
                let widget = try await widgetGenerator.generateWidget(prompt: prompt)
                print("✅ Widget generated successfully")
                await MainActor.run {
                    generatedWidget = widget
                    showingWidget = true
                    isGenerating = false
                }
            } catch {
                print("❌ Widget generation failed: \(error)")
                await MainActor.run {
                    isGenerating = false
                    errorMessage = "Failed to generate widget: \(error.localizedDescription)"
                    showingError = true
                }
            }
        }
    }
    
    private func addWidgetToHome(title: String, htmlContent: String) {
        let newWidget = WebtToy(
            title: title,
            description: prompt,
            htmlContent: htmlContent
        )
        store.addWebtToy(newWidget)
        showingWidget = false
        showingSuccessMessage = true
    }
}

struct ExampleCard: View {
    let title: String
    let emoji: String
    let prompt: String
    
    var body: some View {
        VStack(spacing: 8) {
            Text(emoji)
                .font(.system(size: 30))
            
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
        }
        .frame(width: 80, height: 80)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct WidgetPreviewView: View {
    let htmlContent: String
    let prompt: String
    let onAddToHome: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var widgetTitle = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Your Widget")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top)
                
                WebView(htmlContent: htmlContent)
                    .aspectRatio(2/3, contentMode: .fit)
                    .clipped()
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Widget Title:")
                        .font(.headline)
                    
                    TextField("Enter a title for your widget", text: $widgetTitle)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                .padding(.horizontal)
                
                HStack(spacing: 16) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                    
                    Button("Add to Home") {
                        let title = widgetTitle.isEmpty ? "My Widget" : widgetTitle
                        onAddToHome(title)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom)
                
                Spacer()
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            // Auto-generate a title based on the prompt
            widgetTitle = generateTitleFromPrompt(prompt)
        }
    }
    
    private func generateTitleFromPrompt(_ prompt: String) -> String {
        let words = prompt.split(separator: " ").prefix(3)
        return words.map { $0.capitalized }.joined(separator: " ")
    }
}

struct ReactNativeWidgetPreviewView: View {
    let jsxContent: String
    let prompt: String
    let onAddToHome: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var widgetTitle = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Your React Native Widget")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top)
                
                // React Native Widget Preview
                ReactNativeWidgetViewWrapper(jsxCode: jsxContent, widgetType: determineWidgetType())
                    .aspectRatio(3/2, contentMode: .fit)
                    .clipped()
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Widget Title:")
                        .font(.headline)
                    
                    TextField("Enter a title for your widget", text: $widgetTitle)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                .padding(.horizontal)
                
                HStack(spacing: 16) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                    
                    Button("Add to Home") {
                        let title = widgetTitle.isEmpty ? "My Widget" : widgetTitle
                        onAddToHome(title)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom)
                
                Spacer()
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            widgetTitle = generateTitleFromPrompt(prompt)
        }
    }
    
    private func generateTitleFromPrompt(_ prompt: String) -> String {
        let words = prompt.split(separator: " ").prefix(3)
        return words.map { $0.capitalized }.joined(separator: " ")
    }
    
    private func determineWidgetType() -> String {
        let lowercaseContent = jsxContent.lowercased()
        if lowercaseContent.contains("piano") {
            return "piano"
        } else if lowercaseContent.contains("chord") {
            return "chord"
        } else if lowercaseContent.contains("color") {
            return "color"
        } else {
            return "music"
        }
    }
}

struct WebView: UIViewRepresentable {
    let htmlContent: String
    
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsAirPlayForMediaPlayback = true
        
        // Add JavaScript bridge for native audio
        let audioHandler = AudioMessageHandler()
        configuration.userContentController.add(audioHandler, name: "nativeAudio")
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        
        // Remove any default borders or insets that could create frames
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.layer.borderWidth = 0
        webView.layer.cornerRadius = 0
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.loadHTMLString(htmlContent, baseURL: nil)
    }
}