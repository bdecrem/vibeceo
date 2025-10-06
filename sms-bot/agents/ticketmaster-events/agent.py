from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Any, Optional
import httpx
from dotenv import load_dotenv
import os
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, SdkMcpTool, create_sdk_mcp_server, ResultMessage
from datetime import datetime, timezone, timedelta

load_dotenv()
app = FastAPI()

TICKETMASTER_API_KEY = os.environ.get('TICKETMASTER_API_KEY')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TicketmasterEvent(BaseModel):
    name: str
    dates: Optional[Any] = None
    place: Optional[Any] = None

class TicketmasterEvents(BaseModel):
    events: List[TicketmasterEvent]

class TicketmasterResponse(BaseModel):
    embedded: TicketmasterEvents = Field(..., alias="_embedded")

async def fetch_events(args: dict[str, Any]) -> dict[str, Any]:
    city = args.get('city')
    keyword = args.get("keyword", "")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    ticketmaster_query_url = f"https://app.ticketmaster.com/discovery/v2/events.json?apikey={TICKETMASTER_API_KEY}&city={city}&keyword={keyword}&size=5&page=1&sort=date,asc&startDateTime={str(now)}"
    async with httpx.AsyncClient() as client:
        event_response = await client.get(ticketmaster_query_url)

        if not event_response.json().get('_embedded'):
            return {
                "content": [{
                    "type": "text",
                    "text": "No events found in the given city."
                }]
            }
            
        response_dict = event_response.json()
        events: TicketmasterResponse = TicketmasterResponse(**response_dict)
        event_list = []

        for event in events.embedded.events:
            event_list.append(event.name)
            event_list.append(str(event.dates))
            event_list.append(str(event.place))

        return {
                "content": [{
                    "type": "text",
                    "text": ", ".join(event_list)
                }]
        }
    
event_tool = SdkMcpTool(
    name="fetch_events",
    description="Find events that are happening in a city",
    input_schema = {
        "type": "object",
        "properties": {
            "city": {"type": "string"},
            "keyword": {"type": "string"}
        },
        "required": ["city"]
    },
    handler=fetch_events,
)

event_mcp_server = create_sdk_mcp_server(
    name = "event_mcp_tool",
    version = "1.0.0",
    tools=[event_tool]
)

agent_options = ClaudeAgentOptions(
    model="claude-3-5-haiku-latest",
    mcp_servers={"event_mcp_tool": event_mcp_server},
    allowed_tools=["Read", "Write", "mcp__event_mcp_tool__fetch_events"],
    system_prompt="""
        You are an assistant that finds events in a city. The keyword is optional. Do NOT include a keyword if the user does not input one.
        If no city is given, prompt the user for one.
        Return the events with the name, date, time, place. Do not include the status.
    """
    )
    
@app.get('/api/v1/chat')
async def chat(query: str):
    async with ClaudeSDKClient(options=agent_options) as client:
        await client.query(query)

        async for message in client.receive_response():
            print(message)
            
            if isinstance(message, ResultMessage):
                return message.result