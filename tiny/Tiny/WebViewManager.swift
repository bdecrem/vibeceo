import Foundation
import WebKit
import SwiftUI

class WebViewManager: NSObject, ObservableObject, WKNavigationDelegate {
    weak var webView: WKWebView?
    
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var currentURL: URL?
    @Published var isLoading = false
    @Published var pageTitle: String?
    
    var onStateChange: (() -> Void)?
    
    func load(_ urlString: String) {
        guard let webView = webView else { return }
        
        // Don't try to load our custom homepage URL in WebView
        if urlString == "tiny://home" {
            return
        }
        
        var urlToLoad = urlString
        if !urlString.hasPrefix("http://") && !urlString.hasPrefix("https://") && !urlString.hasPrefix("tiny://") {
            urlToLoad = "https://" + urlString
        }
        
        guard let url = URL(string: urlToLoad) else { return }
        let request = URLRequest(url: url)
        webView.load(request)
    }
    
    func goBack() {
        webView?.goBack()
    }
    
    func goForward() {
        webView?.goForward()
    }
    
    func reload() {
        webView?.reload()
    }
    
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        DispatchQueue.main.async {
            self.isLoading = true
        }
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.async {
            self.isLoading = false
            self.canGoBack = webView.canGoBack
            self.canGoForward = webView.canGoForward
            self.currentURL = webView.url
            self.pageTitle = webView.title
            self.onStateChange?()
        }
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.async {
            self.isLoading = false
        }
    }
}