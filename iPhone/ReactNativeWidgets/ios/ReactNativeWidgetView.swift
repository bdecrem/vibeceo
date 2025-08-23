import Foundation
import UIKit
import React

@objc(ReactNativeWidgetView)
class ReactNativeWidgetView: UIView {
    private var bridge: RCTBridge?
    private var reactView: RCTRootView?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupReactNative()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupReactNative()
    }
    
    private func setupReactNative() {
        // Initialize React Native bridge
        #if DEBUG
        let jsCodeLocation = RCTBundleURLProvider.sharedSettings()?.jsBundleURL(forBundleRoot: "index", fallbackResource: nil)
        #else
        let jsCodeLocation = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
        
        if let jsCodeLocation = jsCodeLocation {
            bridge = RCTBridge(bundleURL: jsCodeLocation, moduleProvider: nil, launchOptions: nil)
            
            if let bridge = bridge {
                // Set up the native audio bridge
                RNWidgetBridge.shared().setup(with: bridge)
                
                // Create the React Native root view
                reactView = RCTRootView(
                    bridge: bridge,
                    moduleName: "WebtToysWidget",
                    initialProperties: [:]
                )
                
                if let reactView = reactView {
                    reactView.backgroundColor = UIColor.clear
                    reactView.translatesAutoresizingMaskIntoConstraints = false
                    addSubview(reactView)
                    
                    // Setup constraints
                    NSLayoutConstraint.activate([
                        reactView.topAnchor.constraint(equalTo: topAnchor),
                        reactView.leadingAnchor.constraint(equalTo: leadingAnchor),
                        reactView.trailingAnchor.constraint(equalTo: trailingAnchor),
                        reactView.bottomAnchor.constraint(equalTo: bottomAnchor)
                    ])
                }
            }
        }
    }
    
    // Method to load a specific widget with JSX code
    func loadWidget(jsxCode: String, widgetType: String = "music") {
        guard let reactView = reactView else { return }
        
        let props: [String: Any] = [
            "widgetCode": jsxCode,
            "widgetType": widgetType
        ]
        
        reactView.appProperties = props
    }
    
    // Method to load a demo widget
    func loadDemoWidget(type: String = "music") {
        guard let reactView = reactView else { return }
        
        let props: [String: Any] = [
            "widgetType": type
        ]
        
        reactView.appProperties = props
    }
}

// MARK: - SwiftUI Integration
import SwiftUI

struct ReactNativeWidgetViewWrapper: UIViewRepresentable {
    let jsxCode: String?
    let widgetType: String
    
    init(jsxCode: String? = nil, widgetType: String = "music") {
        self.jsxCode = jsxCode
        self.widgetType = widgetType
    }
    
    func makeUIView(context: Context) -> ReactNativeWidgetView {
        let view = ReactNativeWidgetView()
        return view
    }
    
    func updateUIView(_ uiView: ReactNativeWidgetView, context: Context) {
        if let jsxCode = jsxCode {
            uiView.loadWidget(jsxCode: jsxCode, widgetType: widgetType)
        } else {
            uiView.loadDemoWidget(type: widgetType)
        }
    }
}