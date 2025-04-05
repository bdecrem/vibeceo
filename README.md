# Modern React Application with Next.js and Tailwind CSS

*Last updated: April 5, 2025*

A modern, responsive web application built with Next.js, React, TypeScript, and Tailwind CSS. This application features a sophisticated theming system, mobile-optimized components, and accessibility-first design.

## 🚀 Quick Start

1. **Prerequisites**
   ```bash
   node >= 18.0.0
   npm >= 9.0.0
   ```

2. **Installation**
   ```bash
   # Clone the repository
   git clone [repository-url]
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

3. **Available Scripts**
   ```bash
   npm run dev      # Start development server
   npm run build    # Create production build
   npm run start    # Start production server
   npm run lint     # Run ESLint
   ```

## 📁 Project Structure

```
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── ui/              # Reusable UI components
│   └── layouts/         # Layout components
├── lib/                  # Utility functions
├── styles/              # Style configurations
├── types/               # TypeScript definitions
├── public/             # Static assets
└── config/             # Configuration files
```

## 🛠 Tech Stack

### Core Dependencies
```json
{
  "next": "14.1.0",
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "typescript": "^5.3.3"
}
```

### UI and Styling
```json
{
  "tailwindcss": "^3.4.1",
  "@radix-ui/react-avatar": "^1.0.4",
  "@radix-ui/react-scroll-area": "^1.2.3",
  "@radix-ui/react-slot": "^1.1.2",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7"
}
```

### Development Tools
```json
{
  "autoprefixer": "^10.4.17",
  "postcss": "^8.4.35",
  "eslint": "^8.56.0",
  "eslint-config-next": "14.1.0"
}
```

## 🎨 Styling System

### Theme Configuration

The application uses a sophisticated CSS variable-based theming system that supports both light and dark modes. Colors are defined using HSL values for maximum flexibility.

```css
/* Light mode variables */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 173 80% 40%;
  /* ... other variables ... */
}

/* Dark mode variables */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other variables ... */
}
```

### Mobile Optimization

The project includes built-in support for mobile devices with safe area utilities:

```css
/* Safe area utilities */
.pt-safe { padding-top: var(--sat); }
.pb-safe { padding-bottom: var(--sab); }
/* ... other utilities ... */

/* Viewport height handling */
.h-screen-safe {
  height: 100vh;
  height: 100dvh;
}
```

## 🧩 Component Usage

### Basic Layout Component
```tsx
import { ContentLayout } from '@/components/layouts/content-layout';

export default function Page() {
  return (
    <ContentLayout fullHeight>
      <h1>Your Content</h1>
    </ContentLayout>
  );
}
```

### Card Component
```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </CardHeader>
      <CardContent>
        Content goes here
      </CardContent>
    </Card>
  );
}
```

## 🔧 Configuration Files

### Tailwind Configuration (tailwind.config.ts)
```typescript
const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        // ... other colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### PostCSS Configuration (postcss.config.js)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 📱 Mobile Development

1. **Safe Areas**
   - Use `pt-safe`, `pb-safe` classes for notched devices
   - Implement `h-screen-safe` for full viewport height

2. **Responsive Design**
   - Mobile-first approach using Tailwind breakpoints
   - Touch-friendly interaction targets
   - Proper viewport meta tags

3. **Performance**
   - Optimized images using Next.js Image component
   - Code splitting and lazy loading
   - Mobile network considerations

## 🔍 Development Guidelines

1. **TypeScript Best Practices**
   - Use strict mode
   - Define proper interfaces for props
   - Utilize utility types when appropriate

2. **Component Guidelines**
   - Keep components focused and single-responsibility
   - Use composition over inheritance
   - Implement proper prop validation
   - Add JSDoc comments for complex functions

3. **Styling Guidelines**
   - Use Tailwind utilities as primary styling method
   - Leverage CSS variables for theming
   - Follow mobile-first approach
   - Maintain consistent spacing using Tailwind's spacing scale

4. **Accessibility**
   - Use semantic HTML elements
   - Implement ARIA attributes where necessary
   - Ensure proper color contrast
   - Support keyboard navigation

## 🐛 Troubleshooting

1. **Common Issues**
   - If styles aren't updating, clear the `.next` cache
   - For type errors, ensure all dependencies are installed
   - Check Node.js version compatibility

2. **Development Mode**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Reinstall dependencies
   rm -rf node_modules
   npm install
   ```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives) 