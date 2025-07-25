import SwiftUI

@main
struct TinyApp: App {
    @StateObject private var bookmarkManager = BookmarkManager()
    @State private var showingFileImporter = false
    @State private var showingAlert = false
    @State private var showingAbout = false
    
    // Get build number from Xcode
    private var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "Unknown"
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(bookmarkManager)
                .fileImporter(
                    isPresented: $showingFileImporter,
                    allowedContentTypes: [.html, .zip, .text, .data],
                    allowsMultipleSelection: false
                ) { result in
                    switch result {
                    case .success(let urls):
                        if let url = urls.first {
                            print("File selected from menu: \(url.path)")
                            bookmarkManager.importSafariExport(from: url)
                        }
                    case .failure(let error):
                        print("File import error from menu: \(error)")
                    }
                }
                .alert("Menu Clicked!", isPresented: $showingAlert) {
                    Button("Show File Picker") {
                        showingFileImporter = true
                    }
                    Button("Cancel", role: .cancel) { }
                } message: {
                    Text("Import Safari Settings menu was clicked. Click 'Show File Picker' to continue.")
                }
                .alert("About Tiny", isPresented: $showingAbout) {
                    Button("OK") { }
                } message: {
                    Text("Tiny Browser v1.0\nBuild: \(buildNumber)\n\nA Safari-style web browser for macOS")
                }
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified)
        .commands {
            CommandGroup(replacing: .importExport) {
                Button("Import Safari Settings...") {
                    print("Menu item clicked - showing alert first")
                    showingAlert = true
                }
                .keyboardShortcut("i", modifiers: [.command, .shift])
            }
            CommandGroup(replacing: .appInfo) {
                Button("About Tiny") {
                    showingAbout = true
                }
            }
        }
    }
}