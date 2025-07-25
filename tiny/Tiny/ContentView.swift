import SwiftUI

struct ContentView: View {
    @State private var tabs: [BrowserTab] = [BrowserTab()]
    @State private var selectedTabIndex = 0
    @State private var urlText = "tiny://home"
    @EnvironmentObject var bookmarkManager: BookmarkManager
    @State private var showBookmarks = false
    
    private var currentTab: BrowserTab {
        tabs.indices.contains(selectedTabIndex) ? tabs[selectedTabIndex] : tabs[0]
    }
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Button(action: { currentTab.webViewManager.goBack() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(.thickMaterial)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
                }
                .disabled(!currentTab.canGoBack)
                
                Button(action: { currentTab.webViewManager.goForward() }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(.thickMaterial)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
                }
                .disabled(!currentTab.canGoForward)
                
                TextField("Enter URL", text: $urlText)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.thickMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: .black.opacity(0.05), radius: 3, y: 2)
                    .onSubmit {
                        currentTab.url = urlText
                        currentTab.webViewManager.load(urlText)
                    }
                
                Button(action: { currentTab.webViewManager.reload() }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(.thickMaterial)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
                }
                
                Button(action: { showBookmarks.toggle() }) {
                    Image(systemName: showBookmarks ? "book.fill" : "book")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(showBookmarks ? Material.thick : Material.thick)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
                }
                
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(.ultraThinMaterial)
            
            TabBarView(tabs: $tabs, selectedTabIndex: $selectedTabIndex)
            
            HStack(spacing: 0) {
                if showBookmarks {
                    BookmarksView(bookmarkManager: bookmarkManager) { bookmark in
                        urlText = bookmark.url
                        currentTab.url = bookmark.url
                        currentTab.webViewManager.load(bookmark.url)
                        showBookmarks = false
                    }
                    .transition(.move(edge: .leading))
                }
                
                TabContentView(tabs: tabs, selectedTabIndex: selectedTabIndex)
            }
        }
        .background(.ultraThinMaterial)
        .animation(.easeInOut(duration: 0.3), value: showBookmarks)
        .onChange(of: selectedTabIndex) { _, _ in
            urlText = currentTab.url
        }
        .onAppear {
            // Don't load WebView for our custom homepage
            if urlText != "tiny://home" {
                currentTab.webViewManager.load(urlText)
            }
        }
    }
}