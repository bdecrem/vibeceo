import AVFoundation
import Foundation

final class AudioInterruptionManager {
    static let shared = AudioInterruptionManager()

    private var isObserving = false

    private init() {}

    func startObserving() {
        guard !isObserving else { return }
        isObserving = true

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            print("🎧 Audio session interruption began")
            NativeAudioEngine.shared.handleSessionInterruptionBegan()
        case .ended:
            let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)

            if options.contains(.shouldResume) {
                do {
                    try AVAudioSession.sharedInstance().setActive(true)
                } catch {
                    print("Failed to reactivate audio session: \(error)")
                }
                NativeAudioEngine.shared.handleSessionInterruptionEnded()
            }
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        switch reason {
        case .oldDeviceUnavailable:
            print("🎧 Audio route changed: old device unavailable")
            NativeAudioEngine.shared.handleSessionInterruptionBegan()
        case .newDeviceAvailable:
            print("🎧 Audio route changed: new device available")
            NativeAudioEngine.shared.handleSessionInterruptionEnded()
        default:
            break
        }
    }
}
