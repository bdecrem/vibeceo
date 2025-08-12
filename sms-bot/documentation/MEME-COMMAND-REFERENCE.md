# MEME Command Reference

## Overview

The MEME command allows users to generate custom memes with AI-generated images and text overlays via SMS. The system uses OpenAI's GPT-4o for content generation and DALL-E 3 for image creation, producing both square (for display) and landscape (for previews/OG) versions.

## Access Requirements

**Role Requirements**: The MEME command is available to users with the following roles:
- `coder`
- `degen` 
- `operator`
- `admin`

Users without these roles will receive no response (silent ignore) to prevent revealing restricted commands.

## Command Syntax

### Basic Usage
```
MEME [your meme idea]
```

### Examples
```
MEME when you code for 8 hours and forget to save
MEME debugging all day and fixing it in one line
MEME when the build works on your machine but not in production
MEME trying to explain your code after 6 months
```

### Help Usage
```
MEME
```
*(Just "MEME" alone shows help text with examples)*

## Processing Flow

1. **Command Validation**: System checks user role permissions
2. **Content Generation**: GPT-4o generates meme text (top/bottom) and image description
3. **Image Creation**: DALL-E 3 creates a 3:2 landscape base image
4. **Composite Generation**: HTMLCSStoImage creates two versions:
   - Square (1024x1024) - cropped from center of original
   - Landscape (1792x1024) - full image with text overlay
5. **HTML Page Generation**: Creates complete meme page with metadata
6. **Storage & Deployment**: Saves to Supabase and deploys to web

## Response Messages

### Success Response
```
🎨 Generating your meme... You'll get a link in about 30 seconds!
```

### Error Responses

#### No Content Provided
```
❌ MEME: Please provide a meme idea after MEME command.
Examples:
MEME when you code for 8 hours and forget to save
MEME debugging all day and fixing it in one line
```

#### Processing Failure
```
❌ MEME: Failed to save request - [specific error message]
```

#### Role Permission Denial
*(Silent - no response sent)*

## Help Text Response

When typing `MEME` alone:
```
🎨 MEME generator ready!

Try stuff like:
→ meme when you code for 8 hours and forget to save
→ meme debugging all day and fixing it in one line

We'll turn your meme ideas into actual memes with images and text overlay.
```

## Technical Implementation

### Content Generation Configuration
- **Model**: GPT-4o
- **Max Tokens**: 300
- **Temperature**: 0.8
- **Style**: Surreal tech humor, zine energy, mild existentialism

### Image Generation
- **Model**: DALL-E 3
- **Base Size**: 1792x1024 (3:2 landscape)
- **Quality**: Standard
- **Style**: Environmental photography with character in actual room/space

### Output Formats
- **Square Composite**: 1024x1024 PNG (main display)
- **Landscape Composite**: 1792x1024 JPG (previews/OpenGraph)
- **HTML Page**: Complete responsive meme page with metadata

## File Processing

### Input File Format
```
PHONE:[phone_number]
SLUG:[user_slug]
REQUEST:[meme_idea]
```

### Processing Location
Files are saved to `/data/memes/` with naming pattern:
```
meme-request-YYYY-MM-DD_HH-mm-ss-SSS_[microseconds].txt
```

## Error Handling Scenarios

1. **Invalid User Role**: Silent ignore (no response)
2. **Empty Content**: Helpful error with examples
3. **Content Generation Failure**: GPT-4o API error
4. **Image Generation Failure**: DALL-E 3 API error 
5. **Composite Creation Failure**: HTMLCSStoImage API error
6. **Storage Failure**: Supabase storage error
7. **File System Error**: Local file write error

## Rate Limiting

MEME commands are subject to standard user rate limits:
- **Regular Users**: 30/hour, 60/day, 300/month
- **DEGEN Users**: 60/hour, 120/day, 600/month
- **OPERATOR/ADMIN**: Unlimited

## Integration Points

### Storage Manager
- `saveCodeToSupabase()` - Stores final HTML with metadata
- Content type: `'MEME'`
- Includes image URLs and meme metadata

### Meme Processor
- `processMemeRequest()` - Main processing function
- `processMemeRemix()` - For remix operations
- Returns `MemeResult` with success/failure status

### Notification Client  
- `sendSuccessNotification()` - Success SMS with link
- `sendFailureNotification()` - Error SMS notification

## Monitoring & Debugging

### Log Messages
- Processing start: `🎨 MEME PROCESSOR: Starting meme generation...`
- Content generated: `✅ Generated meme content: "TOP" / "BOTTOM"`
- Image created: `✅ Generated meme image: [url]`
- Composite ready: `✅ Generated composite meme image: [url]`
- Completion: `🎉 Meme generation complete!`

### Error Tracking
All errors logged with context:
```
console.error(`Error processing MEME command: ${error}`);
```

### Processing Files
DALL-E images saved to `/data/dalle-images/` for debugging:
```
dalle-YYYY-MM-DDTHH-mm-ss-SSSZ.png
```

## Security Considerations

1. **Role-Based Access**: Only authorized users can access MEME command
2. **Input Sanitization**: Content is sanitized before processing
3. **Rate Limiting**: Prevents abuse via rate limits
4. **API Key Security**: All API keys via environment variables
5. **Silent Denial**: Unauthorized users get no response

## Configuration Files

### Meme Config (`/content/meme-config.json`)
```json
{
  "meme_generation": {
    "content_model": "gpt-4o",
    "content_max_tokens": 300,
    "content_temperature": 0.8,
    "image_model": "dall-e-3",
    "image_size": "1152x768",
    "image_quality": "hd"
  },
  "meme_style": {
    "text_format": "Title Case",
    "max_text_length": 12,
    "font_family": "Comic Neue",
    "text_color": "#FFFFFF",
    "text_shadow": "2px 2px #000000",
    "humor_style": "surreal tech humor, zine energy, mild existentialism, remixable weirdness",
    "visual_style": "cutout cartoon, inspired by South Park, flat bold shapes, simple geometry, comically bad posture"
  }
}
```

### Nostalgia Prompt (`/content/nostalgia-meme-builder.txt`)
Additional context for meme generation to maintain consistent style and voice.

## Troubleshooting

### Common Issues

1. **"No response to MEME command"**
   - Check user role in database
   - Verify user has `coder`, `degen`, `operator`, or `admin` role

2. **"Generation takes too long"**
   - Check API key limits for OpenAI
   - Monitor HTMLCSStoImage API rate limits
   - Verify Supabase storage connectivity

3. **"Images not displaying"**
   - Check Supabase storage bucket permissions
   - Verify uploaded image URLs are accessible
   - Check HTMLCSStoImage webhook delivery

4. **"Processing file not found"**
   - Verify `/data/memes/` directory exists
   - Check file permissions for write access
   - Monitor controller file processing loop

## Future Enhancements

1. **Style Variations**: Allow users to specify meme styles
2. **Template Options**: Pre-defined meme templates
3. **Batch Processing**: Generate multiple variations
4. **Social Integration**: Direct sharing to social platforms
5. **Analytics**: Track popular meme themes and success rates