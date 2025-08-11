#!/bin/bash

echo "🍺 Installing Homebrew..."
echo ""
echo "This will:"
echo "1. Install Homebrew package manager"
echo "2. Add it to your PATH"
echo "3. Install GitHub CLI (gh)"
echo ""
echo "You'll need to enter your password when prompted."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH for Apple Silicon Macs
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Verify installation
echo ""
echo "✅ Verifying Homebrew installation..."
brew --version

# Install GitHub CLI
echo ""
echo "📦 Installing GitHub CLI..."
brew install gh

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Run: gh auth login"
echo "2. Choose GitHub.com"
echo "3. Authenticate via browser"
echo ""
echo "Then you can test the issue tracker again!"