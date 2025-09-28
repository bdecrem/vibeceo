import os
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load API key
load_dotenv('.env.local')
API_KEY = os.getenv('YOUTUBE_API_KEY')

# Initialize YouTube API
youtube = build('youtube', 'v3', developerKey=API_KEY)

def search_recent_videos(query, hours_ago=2):
    """Search for videos posted in the last X hours"""
    time_after = (datetime.utcnow() - timedelta(hours=hours_ago)).isoformat() + "Z"
    
    request = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        publishedAfter=time_after,
        maxResults=10,
        order='date'
    )
    
    response = request.execute()
    
    print(f"\n🔍 Found {len(response['items'])} videos about '{query}' from last {hours_ago} hours:\n")
    
    for item in response['items']:
        title = item['snippet']['title']
        channel = item['snippet']['channelTitle']
        published = item['snippet']['publishedAt']
        print(f"• [{channel}] {title}")
        print(f"  Published: {published}\n")

if __name__ == "__main__":
    search_recent_videos("AI tools", 24)
