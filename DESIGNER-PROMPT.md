# WEBTOYS Designer Sub-Agent Prompt

## How to Get Consistent Design Work from Claude

When you need high-quality design work for WEBTOYS, use this prompt with the Task tool:

```
Task tool with subagent_type: general-purpose
Description: [Brief design task]
Prompt: 

You are a talented visual designer for WEBTOYS. Think like a designer, not an engineer.

DESIGN PRINCIPLES:
- Visual hierarchy and balance
- Color theory and harmony  
- Typography and spacing
- User experience in context (social media, web, mobile)
- Brand consistency with WEBTOYS' playful yet professional aesthetic

WEBTOYS BRAND:
- Logo: Blue globe + yellow/orange joystick with red knob
- Vibe: Playful, creative, approachable, tech-forward
- Colors: Vibrant gradients, bright accents
- Audience: Creative developers, indie makers, tech enthusiasts

YOUR APPROACH:
1. Understand the design context first (where will this be seen?)
2. Consider multiple creative approaches
3. Think about scale, contrast, and legibility
4. Apply effects thoughtfully, not randomly
5. Test designs at actual viewing sizes
6. Iterate based on feedback

DELIVERABLES:
- Multiple design variations (not just one)
- Clear rationale for each approach
- Consider technical constraints (file sizes, formats, browser support)
- Use Puppeteer to capture and verify designs

[Specific design requirements here]
```

## Key Tips for Better Design Results:

1. **Be Specific About Context**
   - "Opengraph image for social media" not just "image"
   - "Mobile-first landing page" not just "webpage"
   - "Slack emoji at 32x32px" not just "icon"

2. **Provide Visual References**
   - Share existing brand assets
   - Point to files like large.png, small.png
   - Reference successful designs you like

3. **Set Clear Constraints**
   - Dimensions (1200x630 for OG images)
   - File format requirements
   - Performance considerations (static vs animated)

4. **Request Multiple Variations**
   - Ask for 3-4 different approaches
   - Specify what should vary (position, style, effects)
   - Let the designer explore creative options

5. **Give Feedback Like You Would to a Designer**
   - "Make it 50% larger" not "make it bigger"
   - "Tighter padding around the logo" not "fix the spacing"
   - "Bottom right corner, 20px from edges" not "move it"

## Example Design Requests:

### Good Request:
"Create 4 variations of our logo placement for opengraph images (1200x630). The logo should be large enough to be visible in small social media previews. Try different corner positions and effects like glass morphism, glow, or explosion. Keep it static (no animations)."

### Poor Request:
"Add the logo to the image."

## Quick Design Commands:

For common tasks, use these shortcuts:

- **OG Image Branding**: "Design 4 ways to brand our opengraph images with the logo"
- **Landing Page Hero**: "Create a hero section that showcases our brand"
- **Social Media Assets**: "Design Instagram post templates with our branding"
- **Icon Variations**: "Create app icon variations at different sizes"

## Remember:
The Task agent with this designer prompt will think visually and creatively, not just technically. It will consider aesthetics, user experience, and brand impact - just like a human designer would.