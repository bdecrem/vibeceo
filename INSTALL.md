# VibeCEO Local Installation Guide

## System Requirements

- macOS (Apple Silicon or Intel)
- Node.js 18.x or later
- npm 9.x or later (comes with Node.js)
- Git (for version control)

## Step-by-Step Installation

### 1. Install Node.js

```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version  # Should show v18.x or later
npm --version   # Should show v9.x or later
```

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone <your-repository-url>
cd vibeceo8

# Install dependencies
npm install
```

### 3. Environment Setup

```bash
# Create a .env.local file (if needed)
touch .env.local

# Add any required environment variables here
# Example:
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Other Available Commands

```bash
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run linting
```

## Project Structure

```
vibeceo8/
├── app/                 # Next.js app router
├── components/         # React components
├── public/            # Static assets
└── styles/           # CSS and styling files
```

## Dependencies Overview

### Production Dependencies
- next: 14.1.0 (React framework)
- react: 18.2.0
- react-dom: 18.2.0
- @radix-ui/react-avatar: ^1.0.4
- @radix-ui/react-slot: ^1.0.2
- lucide-react: ^0.330.0 (Icons)
- class-variance-authority: ^0.7.0
- tailwind-merge: ^2.2.1
- tailwindcss-animate: ^1.0.7

### Development Dependencies
- TypeScript: ^5.3.3
- TailwindCSS: ^3.4.1
- ESLint: ^8.56.0
- Testing libraries (Jest & React Testing Library)

## Troubleshooting

1. If you encounter node version issues:
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use the correct Node version
   nvm install 18
   nvm use 18
   ```

2. If you get dependency errors:
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

## Support

For any issues or questions, please refer to:
- Next.js documentation: https://nextjs.org/docs
- React documentation: https://react.dev
- TailwindCSS documentation: https://tailwindcss.com/docs 