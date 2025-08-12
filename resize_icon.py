from PIL import Image
import os

# Open the source image
img = Image.open('icon-quick.png')

# Convert to RGBA if not already
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Resize for toolbar icons
toolbar_sizes = [16, 19, 32, 38]
for size in toolbar_sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(f'webtoys-extension/images/toolbar-icon-{size}.png')
    print(f'Created toolbar-icon-{size}.png')

# Resize for regular icons
icon_sizes = [48, 96, 128, 256, 512]
for size in icon_sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(f'webtoys-extension/images/icon-{size}.png')
    print(f'Created icon-{size}.png')