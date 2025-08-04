-- Fix Purple Elephants page owner from 'lab' to 'bart'

UPDATE wtaf_content 
SET user_slug = 'bart',
    og_image_url = 'https://theaf-web.ngrok.io/api/generate-og-cached?user=bart&app=purple-elephants-test'
WHERE app_slug = 'purple-elephants-test' 
  AND user_slug = 'lab';

-- Verify the update
SELECT user_slug, app_slug, og_image_url, created_at 
FROM wtaf_content 
WHERE app_slug = 'purple-elephants-test'; 