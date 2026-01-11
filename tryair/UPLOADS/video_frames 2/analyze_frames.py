import fal_client
import base64
import os
import json

FAL_KEY = 'f70208b1-674a-4f8d-8e9b-a67fe9ccf988:8798b305ec47f935d9d3fc440ddb024c'
os.environ['FAL_KEY'] = FAL_KEY

frames_dir = '/Users/isis/Desktop/video_frames'
frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])

results = []

for i, frame_file in enumerate(frames):
    frame_path = os.path.join(frames_dir, frame_file)
    timestamp = f"0:{27 + i:02d}"

    # Read and encode image as base64
    with open(frame_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    data_url = f"data:image/jpeg;base64,{image_data}"

    print(f"\n{'='*60}")
    print(f"Analyzing {frame_file} (timestamp: {timestamp})")
    print('='*60)

    try:
        # Use FAL's vision model
        result = fal_client.subscribe(
            "fal-ai/llava-next",
            arguments={
                "image_url": data_url,
                "prompt": "Describe this frame from a video in detail. What is happening? Describe the person, their expression, body language, any text overlays, and the setting. Be specific and detailed."
            }
        )

        description = result.get('output', 'No description available')
        print(f"Description: {description}")

        results.append({
            'frame': frame_file,
            'timestamp': timestamp,
            'description': description
        })

    except Exception as e:
        print(f"Error analyzing {frame_file}: {e}")
        results.append({
            'frame': frame_file,
            'timestamp': timestamp,
            'error': str(e)
        })

# Save results
output_path = os.path.join(frames_dir, 'analysis_results.json')
with open(output_path, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n\nAnalysis complete! Results saved to {output_path}")
