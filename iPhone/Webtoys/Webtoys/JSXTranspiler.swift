import Foundation

class JSXTranspiler {
    static let shared = JSXTranspiler()
    
    private init() {}
    
    func transpileJSXToHTML(_ jsxCode: String) -> String {
        // Simple JSX to HTML transpiler
        var html = jsxCode
        
        // Convert JSX imports to script tags (remove for now)
        html = html.replacingOccurrences(of: #"import.*from.*['"]react['"];"#, with: "", options: .regularExpression)
        html = html.replacingOccurrences(of: #"import.*from.*['"]react-native['"];"#, with: "", options: .regularExpression)
        html = html.replacingOccurrences(of: #"import.*from.*['"]react-native-linear-gradient['"];"#, with: "", options: .regularExpression)
        
        // Convert React Native components to HTML equivalents
        html = html.replacingOccurrences(of: "View", with: "div")
        html = html.replacingOccurrences(of: "Text", with: "span")
        html = html.replacingOccurrences(of: "TouchableOpacity", with: "button")
        html = html.replacingOccurrences(of: "LinearGradient", with: "div")
        
        // Convert StyleSheet references to inline styles
        html = convertStyleSheetToCSS(html)
        
        // Wrap in HTML template
        let htmlTemplate = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>React Native Widget</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    width: 100vw; height: 100vh;
                    overflow: hidden; touch-action: manipulation;
                }
                .rn-container {
                    width: 100vw; height: 100vh;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }
                button {
                    border: none;
                    border-radius: 12px;
                    padding: 12px 20px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-height: 44px; 
                    min-width: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                button:active {
                    transform: scale(0.95);
                }
                .gradient-bg {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .text-white { color: white; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="rn-container">
                \(html)
            </div>
            
            <script>
                // Mock React/RN environment
                const React = {
                    useState: (initial) => [initial, (val) => console.log('setState:', val)],
                    useEffect: (fn, deps) => fn()
                };
                
                // Mock audioManager with native bridge
                const audioManager = {
                    playNote: async (note, octave = 4, duration = 0.5) => {
                        if (window.webkit?.messageHandlers?.nativeAudio) {
                            window.webkit.messageHandlers.nativeAudio.postMessage({
                                action: "playNote",
                                note: note,
                                octave: octave,
                                duration: duration
                            });
                        }
                        console.log(`🎵 Playing note: ${note}${octave}`);
                    },
                    playChord: async (notes, octave = 4, duration = 1.0) => {
                        if (window.webkit?.messageHandlers?.nativeAudio) {
                            window.webkit.messageHandlers.nativeAudio.postMessage({
                                action: "playChord",
                                notes: notes,
                                octave: octave,
                                duration: duration
                            });
                        }
                        console.log(`🎵 Playing chord: ${notes.join('-')}`);
                    },
                    playScale: async (root, scaleType = "major", octave = 4) => {
                        if (window.webkit?.messageHandlers?.nativeAudio) {
                            window.webkit.messageHandlers.nativeAudio.postMessage({
                                action: "playScale",
                                root: root,
                                scaleType: scaleType,
                                octave: octave
                            });
                        }
                        console.log(`🎵 Playing ${scaleType} scale in ${root}`);
                    }
                };
            </script>
        </body>
        </html>
        """
        
        return htmlTemplate
    }
    
    private func convertStyleSheetToCSS(_ jsx: String) -> String {
        // Very basic style conversion - would need more sophisticated parsing for production
        var result = jsx
        
        // Convert flex: 1 to CSS
        result = result.replacingOccurrences(of: "flex: 1", with: "flex: 1")
        result = result.replacingOccurrences(of: "justifyContent: 'center'", with: "justify-content: center")
        result = result.replacingOccurrences(of: "alignItems: 'center'", with: "align-items: center")
        result = result.replacingOccurrences(of: "backgroundColor:", with: "background-color:")
        result = result.replacingOccurrences(of: "fontSize:", with: "font-size:")
        result = result.replacingOccurrences(of: "fontWeight:", with: "font-weight:")
        result = result.replacingOccurrences(of: "marginBottom:", with: "margin-bottom:")
        result = result.replacingOccurrences(of: "paddingHorizontal:", with: "padding-left: /* and */ padding-right:")
        result = result.replacingOccurrences(of: "paddingVertical:", with: "padding-top: /* and */ padding-bottom:")
        result = result.replacingOccurrences(of: "borderRadius:", with: "border-radius:")
        
        return result
    }
}