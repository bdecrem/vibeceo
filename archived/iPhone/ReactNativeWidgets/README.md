# WebtToys React Native Widgets

This directory contains the React Native widget system for the WebtToys iOS app. It provides beautiful, musical, interactive widgets with professional audio synthesis.

## Architecture

### Core Components

- **`src/AudioManager.js`** - Native audio bridge for beautiful sound synthesis
- **`src/DynamicWidget.js`** - Dynamic JSX widget renderer
- **`src/widgets/`** - Pre-built musical widget components
- **`ios/`** - Swift/Objective-C bridge files for iOS integration

### Widget Types

1. **MusicWidget** - Musical note player with colorful animations
2. **PianoWidget** - Interactive piano keyboard with chords
3. **ChordPlayerWidget** - Advanced chord progressions and music theory
4. **ColorMixerWidget** - Color-to-sound synthesis with visual mixing

## Audio System

The audio system bridges React Native to the native iOS `NativeAudioEngine`:

```javascript
// Single notes
await AudioManager.playNote("C", 4, 0.5);

// Chords
await AudioManager.playChord(["C", "E", "G"], 4, 1.0);

// Scales
await AudioManager.playScale("C", "major", 4);
```

### Native Bridge

- **RNWidgetBridge.h/m** - Objective-C bridge to Swift audio engine
- **ReactNativeWidgetView.swift** - SwiftUI integration wrapper
- **Bridge Methods**: `playNote`, `playChord`, `playScale`

## Integration with iOS App

The React Native widgets integrate seamlessly with the existing SwiftUI app:

1. **WidgetGeneratorView.swift** - Updated to show React Native preview
2. **ReactNativeWidgetViewWrapper** - SwiftUI component wrapper
3. **Podfile** - CocoaPods configuration for React Native dependencies

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd ReactNativeWidgets
   npm install
   ```

2. **CocoaPods Setup** (from `/iPhone/Webtoys/`):
   ```bash
   pod install
   ```

3. **Build React Native Bundle**:
   ```bash
   npm run bundle-ios
   ```

## Development

### Creating New Widgets

1. Create new component in `src/widgets/`
2. Import in `DynamicWidget.js`
3. Add to widget type detection logic
4. Use `AudioManager` for sound synthesis

### Widget Guidelines

- **Musical Focus**: Use proper music theory (scales, chords, progressions)
- **Visual Appeal**: Vibrant colors, smooth animations, immediate feedback
- **Touch-Friendly**: Large touch targets, proper visual feedback
- **Audio Quality**: Leverage native audio engine for professional sound

### Example Widget Structure

```jsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AudioManager from '../AudioManager';

const MyWidget = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = async () => {
    setIsPlaying(true);
    await AudioManager.playNote("C", 4, 0.5);
    setIsPlaying(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={playSound} style={styles.button}>
        {/* Widget content */}
      </TouchableOpacity>
    </View>
  );
};

export default MyWidget;
```

## Technical Details

### Audio Engine Integration

React Native widgets communicate with the native `NativeAudioEngine` through:
1. Objective-C bridge (`RNWidgetBridge.m`)
2. Swift audio processing (`NativeAudioEngine.swift`)
3. ADSR envelopes, musical scales, and harmonic synthesis

### Performance

- Native audio processing ensures low latency
- React Native provides smooth UI animations
- CocoaPods integration maintains iOS best practices

## Troubleshooting

### Audio Not Working
- Check `NativeAudioBridge` module availability
- Verify CocoaPods installation
- Ensure audio session is configured

### Build Issues
- Run `pod install` after React Native changes
- Clear Metro cache: `npx react-native start --reset-cache`
- Verify all bridge files are included in Xcode project

## Future Enhancements

- [ ] More sophisticated music theory widgets
- [ ] Multi-touch gesture support
- [ ] Audio recording and playback
- [ ] MIDI controller integration
- [ ] Real-time audio visualization