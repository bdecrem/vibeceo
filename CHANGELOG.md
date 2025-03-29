# Changelog

## [1.0.0] - 2024-03-19

### Added
- Initial release of myVEO landing page
- Mobile-first responsive design
- Dynamic viewport height handling using `dvh` units
- Proper mobile layout structure with fixed header and bottom input
- Gradient background with brand colors
- Hero section with main messaging and CTA
- Executive team image properly positioned at viewport bottom

### Fixed
- Mobile viewport handling to prevent content overflow
- Header height consistency across pages
- Bottom input positioning using proper viewport calculations
- Image sizing and positioning for mobile displays
- Content centering in viewport
- Layout stability on different mobile devices and orientations

### Technical Improvements
- Implemented `MobileViewport`, `ViewportContent`, and `MobileGrid` components
- Used dynamic viewport height (`dvh`) for better mobile browser compatibility
- Optimized image loading with Next.js Image component
- Proper spacing management using flex layouts
- Added backdrop blur effect for better text input visibility 