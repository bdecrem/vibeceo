import Foundation
import WebKit

class AudioMessageHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeAudio",
              let messageBody = message.body as? [String: Any] else {
            print("❌ Invalid audio message format")
            return
        }
        
        print("🎵 Received audio command: \(messageBody)")
        
        // Process the audio command through our native engine
        NativeAudioEngine.shared.processAudioCommand(messageBody)
    }
}