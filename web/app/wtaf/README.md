# WTAF OpenGraph Implementation

This directory contains the implementation for the "What if vibecoding, but over SMS?" feature. All pages in this directory will use the custom OpenGraph card that matches the provided design.

## OpenGraph Card Implementation

The OpenGraph card is implemented for all pages under the `/wtaf/` route using:

1. A custom layout (`layout.tsx`) that applies OpenGraph metadata
2. A shared image (`/public/wtaf/og-image.png`) that appears when pages are shared on social media

## How to Generate the OpenGraph Image

To generate or update the OpenGraph image:

```bash
# Install puppeteer if not already installed
npm install puppeteer

# Generate the image
node scripts/generate-wtaf-og.js
```

## Adding New Pages

When you add new pages under this directory, they will automatically use the same OpenGraph card - no additional configuration needed!

## Notes

- The image template is in `/public/wtaf/wtaf-og-template.html`
- You can modify the template and regenerate the image if design changes are needed
- Make sure the image dimensions remain 1200x630 for optimal display on social media
