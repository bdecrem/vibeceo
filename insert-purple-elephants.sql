-- Insert Purple Elephants page into WTAF database

INSERT INTO wtaf_content (
    user_slug,
    app_slug, 
    html_content,
    created_at,
    updated_at,
    og_image_url,
    original_prompt
) VALUES (
    'lab',  -- user_slug
    'purple-elephants-test',  -- app_slug
    '<!DOCTYPE html>
<html lang="en">
<head>
    <title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="https://theaf-web.ngrok.io/api/generate-og-cached?user=lab&app=purple-elephants-test" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://theaf-web.ngrok.io/lab/purple-elephants-test" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Purple Elephants</title>

    <style>
        @import url(''https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap'');

        :root {
            --punk-purple: #7c3aed;
            --neon-pink: #ff2e93;
            --electric-blue: #3f88ff;
        }

        body {
            margin: 0;
            padding: 0;
            background: #1a1a1a;
            color: #fff;
            font-family: ''Space Grotesk'', sans-serif;
            overflow-x: hidden;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
        }

        h1 {
            font-size: 4rem;
            text-transform: uppercase;
            background: linear-gradient(45deg, var(--punk-purple), var(--neon-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: textGlow 2s ease-in-out infinite;
        }

        .elephant-container {
            position: relative;
            height: 400px;
            margin: 2rem 0;
            background: linear-gradient(135deg, #2a1a4a, #4a1a2a);
            border-radius: 20px;
            overflow: hidden;
        }

        .elephant {
            font-size: 8rem;
            position: absolute;
            animation: dance 3s ease-in-out infinite;
        }

        .elephant:nth-child(1) { left: 20%; top: 30%; animation-delay: 0s; }
        .elephant:nth-child(2) { right: 20%; top: 40%; animation-delay: 0.5s; }
        .elephant:nth-child(3) { left: 40%; top: 20%; animation-delay: 1s; }

        @keyframes dance {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(10deg); }
        }

        @keyframes textGlow {
            0%, 100% { text-shadow: 0 0 20px var(--neon-pink); }
            50% { text-shadow: 0 0 40px var(--electric-blue); }
        }

        .punk-button {
            background: var(--punk-purple);
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1.2rem;
            border-radius: 5px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.3s;
            margin-top: 2rem;
        }

        .punk-button:hover {
            background: var(--neon-pink);
            transform: scale(1.1);
            box-shadow: 0 0 20px var(--neon-pink);
        }

        .meta-info {
            margin-top: 3rem;
            padding: 1rem;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }

        code {
            display: block;
            background: #2a2a2a;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Purple Elephants Test</h1>
        
        <div class="elephant-container">
            <div class="elephant">🐘</div>
            <div class="elephant">🐘</div>
            <div class="elephant">🐘</div>
        </div>
    </div>

    <script>
        document.querySelector(''.punk-button'').addEventListener(''click'', () => {
            alert(''🐘 Share URL copied! Spread the elephant madness! 🐘'');
        });
    </script>
</body>
</html>',
    NOW(),  -- created_at
    NOW(),  -- updated_at
    'https://theaf-web.ngrok.io/api/generate-og-cached?user=lab&app=purple-elephants-test',  -- og_image_url
    'Manual insert: Purple Elephants test page with dancing elephant animations'  -- original_prompt
);

-- Verify the insert
SELECT user_slug, app_slug, created_at 
FROM wtaf_content 
WHERE app_slug = 'purple-elephants-test'; 