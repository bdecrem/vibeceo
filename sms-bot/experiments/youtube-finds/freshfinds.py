import os
from datetime import datetime, timedelta, timezone
from googleapiclient.discovery import build
from dotenv import load_dotenv
from anthropic import Anthropic

# Load API keys
load_dotenv('.env.local')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Initialize APIs
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
claude = Anthropic(api_key=ANTHROPIC_API_KEY)

def get_followup_question(topic):
    """Use Claude to generate a smart follow-up question"""
    prompt = f"""User wants to search YouTube for: "{topic}"

Generate ONE follow-up question to help them refine what TYPE of videos they want.
The question should offer 3-4 options for them to choose from.

Examples:
- User: "commodity trading" -> "Looking for technical analysis, market news, educational content, or live trading?"
- User: "Python" -> "Tutorials for beginners, advanced topics, specific libraries, or project ideas?"
- User: "bitcoin" -> "Price analysis, news updates, technical explanations, or mining content?"

Just return the question offering options. Nothing else."""

    response = claude.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text.strip()

def search_recent_videos(query, hours_ago=24):
    """Search for videos posted in the last X hours"""
    time_after = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
    
    request = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        publishedAfter=time_after,
        maxResults=15,
        order='date'
    )
    
    response = request.execute()
    
    print(f"\n📺 Fresh content from last {hours_ago} hours:\n")
    print("=" * 50)
    
    if not response['items']:
        print("No videos found. Try expanding the time range or different keywords.")
        return
    
    for item in response['items']:
        title = item['snippet']['title']
        channel = item['snippet']['channelTitle']
        published = item['snippet']['publishedAt']
        video_id = item['id']['videoId']
        
        # Calculate how long ago
        pub_time = datetime.fromisoformat(published.replace('Z', '+00:00'))
        time_ago = datetime.now(timezone.utc) - pub_time
        hours = int(time_ago.total_seconds() / 3600)
        mins = int((time_ago.total_seconds() % 3600) / 60)
        
        if hours > 0:
            ago_str = f"{hours}h {mins}m ago"
        else:
            ago_str = f"{mins}m ago"
        
        print(f"\n[{ago_str}] {title}")
        print(f"  📺 {channel}")
        print(f"  🔗 youtube.com/watch?v={video_id}")

def parse_time_from_input(user_input):
    """Extract time range from user input"""
    hours = 24  # default
    if "last hour" in user_input.lower() or "past hour" in user_input.lower():
        hours = 1
    elif "2 hour" in user_input.lower():
        hours = 2
    elif "3 hour" in user_input.lower():
        hours = 3
    elif "6 hour" in user_input.lower():
        hours = 6
    elif "12 hour" in user_input.lower():
        hours = 12
    elif "today" in user_input.lower():
        hours = 24
    elif "2 days" in user_input.lower():
        hours = 48
    elif "this week" in user_input.lower():
        hours = 168
    return hours

def main():
    print("\n🔴 Fresh Finds - Smart YouTube Discovery")
    print("=" * 50)
    print("Type your search or 'quit' to exit")
    
    while True:
        print("\n> ", end="")
        user_input = input().strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("Goodbye! 👋")
            break
        
        if not user_input:
            continue
            
        # Extract time and clean query
        hours = parse_time_from_input(user_input)
        
        # Get follow-up question
        print(f"\n🤔 {get_followup_question(user_input)}")
        print("> ", end="")
        refinement = input().strip()
        
        # Combine original query with refinement
        if refinement and refinement.lower() not in ['skip', 'no', 'none', '']:
            final_query = f"{user_input} {refinement}"
        else:
            final_query = user_input
            
        # Remove time phrases for cleaner search
        for phrase in ["last hour", "past hour", "2 hours", "3 hours", "today", "this week", "2 days"]:
            final_query = final_query.replace(phrase, "").strip()
            
        search_recent_videos(final_query, hours)

if __name__ == "__main__":
    main()

