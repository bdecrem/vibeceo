# WebtToys iOS App

## Project Overview

This is a native iOS app for WebtToys built using SwiftUI. The app brings the creative tools from the web-based WebtToys platform to iOS devices with a modern glass morphism design.

## App Features

### UI Design
- **Glass Morphism Design**: Modern translucent glass-style interface
- **Custom Tab Bar**: Ultra-minimal glass tab bar with 3 navigation tabs and a floating action button
- **3:2 Aspect Ratio Cards**: Beautiful preview cards for content display

### Core Functionality
1. **Home Feed**: Displays content with custom preview cards including:
   - Beat Metronome
   - Cosmic Screensaver

2. **Offline Meme Generator**: Local meme creation tool that works without internet

3. **AI-Powered Widget Generator**: 
   - Creates interactive HTML/CSS/JS widgets
   - Uses Claude API integration
   - Connects to existing SMS bot's .env.local file for API key

## Technical Details

### Technology Stack
- **Language**: Swift
- **Framework**: SwiftUI
- **Target**: iOS (iPhone 16 simulator/device ready)
- **Design Pattern**: MVVM with SwiftUI

### Project Structure
```
iPhone/
├── Webtoys/
│   ├── Webtoys.xcodeproj/        # Xcode project file
│   └── Webtoys/                  # Main app source code
│       ├── WebtoysApp.swift      # App entry point
│       ├── ContentView.swift     # Main content view
│       ├── HomeFeedView.swift    # Home feed display
│       ├── SimpleMemeView.swift  # Meme generator view
│       ├── WidgetGeneratorView.swift # Widget creation view
│       ├── WidgetGenerator.swift # Widget generation logic
│       ├── Models.swift          # Data models
│       └── Assets.xcassets/      # App assets and icons
├── README.md                     # Project documentation
└── CLAUDE.md                     # This file
```

### Key Files
- `WebtoysApp.swift`: Main app configuration and entry point
- `ContentView.swift`: Root view with tab navigation
- `HomeFeedView.swift`: Feed displaying WebtToys content
- `SimpleMemeView.swift`: Offline meme creation interface
- `WidgetGeneratorView.swift`: AI-powered widget creation tool
- `Models.swift`: Data structures and models

### API Integration
- Connects to existing WebtToys SMS bot infrastructure
- Uses Claude API key from SMS bot's `.env.local` file
- Maintains consistency with web platform functionality

## Build Status
- Ready to build and run on iPhone 16 simulator or device
- Follows iOS design principles and guidelines
- Includes custom app icon and branding

## Development Notes
- Built with clean Swift code
- Follows SwiftUI best practices
- Maintains aesthetic consistency with web-based WebtToys platform
- Provides instant creative tools for mobile users