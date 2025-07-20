import SwiftUI

struct ContentView: View {
    @StateObject private var webViewManager = WebViewManager()
    @State private var urlText = "https://google.com"
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Button(action: { webViewManager.goBack() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 32, height: 32)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
                .disabled(!webViewManager.canGoBack)
                
                Button(action: { webViewManager.goForward() }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 32, height: 32)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
                .disabled(!webViewManager.canGoForward)
                
                TextField("Enter URL", text: $urlText)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        webViewManager.load(urlText)
                    }
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                
                Button(action: { webViewManager.reload() }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 32, height: 32)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.regularMaterial)
            
            WebView(manager: webViewManager)
                .onAppear {
                    webViewManager.load(urlText)
                }
                .onChange(of: webViewManager.currentURL) { _, newURL in
                    if let url = newURL {
                        urlText = url.absoluteString
                    }
                }
        }
        .background(.ultraThinMaterial)
    }
}