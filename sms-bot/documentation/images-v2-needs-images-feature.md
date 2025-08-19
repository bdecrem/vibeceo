# Images V2: "Needs User Uploaded Images" Feature

## Overview
Add a new classification step that identifies pages where personal images would significantly improve the experience, similar to how we detect "needs email" but for visual content.

## Complexity Assessment

**This is closer to "almost as much work as what we just built" - definitely not a simple addition.**

### Complexity Comparison

**V1 Images (what we just built):**
- Image upload infrastructure (supabase, tables, permissions)
- Image parsing from prompts ("image 3")
- Enhanced prompt system
- Basic URL injection into builders
- Upload page interface

**V2 "Needs Images" Feature:**
- New classifier step (simple)
- Builder placeholder system (medium complexity)
- **Fallback image system** (significant new work)
- **Smart replacement logic** (complex - multiple placeholder types)
- **Upload page redesign** (medium work - preview functionality)
- **Auto-replacement after upload** (complex new logic)
- **SMS messaging updates** (simple)

### Work Estimate
- **V1 Images**: ~3-4 days of core development
- **V2 "Needs Images"**: ~5-7 days of development

**Why it's more work:**
- V1 was mostly "plumbing" (upload → store → reference)  
- V2 is "smart content management" (classify → generate with placeholders → replace intelligently)

## Proposed Implementation Plan

### Stage 1: Classification (Detection)
**New File**: `sms-bot/content/classification/1.5-needs-images.json`
- **Position**: Between memes and games (step 1.5) - high priority since images are visual
- **Triggers**: Personal portfolios, photo galleries, about pages, team profiles, wedding sites, event pages, restaurant menus, product showcases, art portfolios, travel blogs
- **Decision**: Sets `IMAGES_NEEDED=true` if detected
- **Examples**:
  - ✅ "Build my photography portfolio" → definitely needs user images
  - ✅ "Create an about page for my consulting" → would benefit from headshot
  - ✅ "Make a wedding website" → needs couple photos
  - ❌ "Build a calculator app" → doesn't need personal images

### Stage 2: Builder Instructions (Placeholder System)
**Similar to email placeholders but for images:**
- Add instructions to all builders when `IMAGES_NEEDED: true`
- Use placeholder system: `[USER_IMAGE_1]`, `[USER_IMAGE_2]`, `[USER_IMAGE_HERO]`
- Include fallback stock images that get replaced when user uploads
- **Fallback Strategy**: Generate page with tasteful stock images that match the content type

**Placeholder Strategy:**
```html
<!-- Hero section -->
<img src="/fallback/hero-business.jpg" data-placeholder="USER_IMAGE_HERO" />

<!-- Gallery -->
<div class="gallery" data-placeholder="USER_IMAGE_GALLERY">
  <img src="/fallback/gallery-1.jpg" data-placeholder="USER_IMAGE_1" />
  <img src="/fallback/gallery-2.jpg" data-placeholder="USER_IMAGE_2" />
</div>

<!-- Profile -->
<img src="/fallback/profile-professional.jpg" data-placeholder="USER_IMAGE_PROFILE" />
```

### Stage 3: Success SMS (Encouragement + Upload Link)
**Modify**: `sms-bot/engine/notification-client.ts`
- **Detection**: Check if generated HTML contains image placeholders
- **Enhanced SMS**: 
  ```
  🎉 Your app: [URL]
  📸 Add your photos: [UPLOAD_LINK] 
  ✨ Your images will make it shine!
  ```

### Stage 4: Upload Infrastructure Integration
**Current Infrastructure Assessment:**
- ✅ Upload page exists at `/{userSlug}/uploads`
- ✅ Images stored in Supabase bucket with sequential numbering
- ✅ `wtaf_user_uploads` table tracks ownership
- ✅ Image enhancement system (`image-helpers.ts`) ready

**New Integration Needed:**
1. **Smart Upload Page**: When accessed via the SMS link, show preview of which page will be updated
2. **Auto-Replacement**: After upload, automatically replace placeholders in the most recent "needs images" page
3. **Multiple Image Support**: Handle hero images, gallery images, profile images differently

### Stage 5: Image Replacement (Completion)
**New Function**: Similar to email replacement in `handlers.ts`
- Find most recent page with image placeholders
- Replace placeholders based on upload sequence:
  - `[USER_IMAGE_HERO]` → First uploaded image
  - `[USER_IMAGE_1]`, `[USER_IMAGE_2]` → Sequential images
  - `[USER_IMAGE_GALLERY]` → All uploaded images in grid
- Update database with real image URLs
- Send confirmation SMS

## Technical Considerations

### Advantages
- ✅ Leverages existing image infrastructure
- ✅ Non-intrusive (page works immediately with stock images)
- ✅ Familiar pattern (mirrors email system)
- ✅ Sequential image numbering already works
- ✅ Upload permissions already handled (DEGEN+ role)

### Challenges
- 🤔 More complex than email (multiple image types/positions)
- 🤔 Need smart fallback stock images that match content
- 🤔 Upload page UX needs to show "preview" of what gets updated
- 🤔 Different placeholder types (hero vs gallery vs profile)

### Major New Work Required

1. **Fallback Image System**: Need curated stock images for different content types (business, portfolio, wedding, etc.) - this is substantial content work plus delivery infrastructure

2. **Smart Placeholder Replacement**: Much more complex than email replacement:
   - Email: Find `[CONTACT_EMAIL]` → replace with one value
   - Images: Multiple placeholder types, positional logic, different image ratios/sizes

3. **Upload Page UX**: Currently just "upload images", would need to show "these will update your portfolio page" with preview

4. **Complex Detection Logic**: Unlike email (simple text replacement), images have layout implications, aspect ratios, positioning

## Implementation Priority
1. **Phase 1**: Basic detection and placeholder system
2. **Phase 2**: Upload page integration and auto-replacement
3. **Phase 3**: Smart fallback images and multiple placeholder types
4. **Phase 4**: Enhanced SMS messaging and preview system

## User Experience Flow
1. User: "wtaf make my photography portfolio"
2. System: Detects `IMAGES_NEEDED=true`
3. System: Generates beautiful portfolio with stock placeholder images
4. SMS: "🎉 Your portfolio: [URL] 📸 Add your photos: [UPLOAD_LINK]"
5. User clicks upload link, sees preview: "Upload photos for your portfolio"
6. User uploads 5 photos
7. System replaces placeholders automatically
8. SMS: "✨ Photos added! Your portfolio is complete: [URL]"

## Open Questions

1. **User Permissions**: Should this be limited to DEGEN+ users (like current uploads) or made available to all users for this specific use case?

2. **Fallback Image Strategy**: 
   - Host our own curated stock images?
   - Use external service with API?
   - Generate placeholder images programmatically?

3. **Preview Complexity**: How detailed should the upload page preview be?
   - Simple text: "These photos will update your portfolio"
   - Thumbnail preview of the page layout
   - Live preview showing where images will appear

## Recommendation

This is a **"Phase 2" feature**. V1 images already provides huge value for users who know they want images. V2 would be more about proactive suggestion/discovery, which is nice-to-have but not essential for core functionality.

The **"simple addition" version** would be just adding the classifier step and basic SMS encouragement, without the placeholder/replacement system. This would still provide value by directing users to upload images when their content type would benefit from it.

## Alternative: Simplified Version

If we wanted a much simpler version (~1-2 days work):
1. Add classifier step to detect image-heavy content types
2. Send enhanced SMS with upload link when detected
3. No placeholder system - just encourage users to upload and re-create with "image 1, image 2" syntax
4. Skip all the fallback/replacement complexity

This would still provide significant UX improvement while being much more feasible in the near term.