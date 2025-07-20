import SwiftUI
import WebKit

struct WebView: NSViewRepresentable {
    let manager: WebViewManager
    
    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = manager
        manager.webView = webView
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
    }
}