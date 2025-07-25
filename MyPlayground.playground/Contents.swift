import Cocoa
import PlaygroundSupport

let view = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: 300, height: 200))
view.material = .hudWindow
view.blendingMode = .behindWindow
view.state = .active

PlaygroundPage.current.liveView = view
