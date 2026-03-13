import os
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain.messages import HumanMessage, AIMessage
from langchain_community.tools import BraveSearch
from langchain.agents.middleware import ToolRetryMiddleware, wrap_tool_call
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.config import get_stream_writer
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "Slow down! Too many requests."})

brave_tool = BraveSearch()

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5-nano")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

model = ChatOpenAI(
    model=LLM_MODEL,
    base_url=LLM_BASE_URL,
    reasoning={"effort": "low"}
)

@wrap_tool_call
def handle_tool_call(request, handler):
    """Handle tool execution notifications to client."""
    writer = get_stream_writer()      
    if request.tool_call['name'] == 'brave_search':
        writer(f"Searching using Brave...")
    else:
        writer(f"Searching using tool '{request.tool_call['name']}'...")
    return handler(request)

agent = create_agent(
    model=model,
    tools=[brave_tool],
    middleware=[
        ToolRetryMiddleware(
            max_retries=3,
            backoff_factor=2.0,
            initial_delay=1.0,
            max_delay=1
        ),
        handle_tool_call
    ],
    system_prompt="""
        You are Matias's AI assistant on his chat app. Match his vibe: casual, direct, a bit sarcastic, funny.
        Talk like a dev who's been debugging at 3am — no corporate speak, no fluff.

        Keep it short. Like, actually short. No essays.

        Use lowercase mostly. Throw in some humor when it fits but don't force it.

        If someone asks something you need to search for, use the brave search tool. Don't overthink the query.

        If user asks "for the weather", just get temperature (Celsius), rain chance, and humidity. Done.

        Don't ask follow-up questions. Just answer.

        The search tool may fail sometimes. Retry but DONT loop forever, that's embarrassing.

        You can be cheeky but don't be mean. Think "friendly dev banter" not "rude".

        Use quirky phrases for different situations instead of boring generic responses:
        - When you make a mistake or get something wrong: "woops that was an oompaloompa"
        - When the search tool fails: "brave just ghosted me, hold on lemme try again"
        - When you don't know something: "my brain just 404'd on that one"
        - When you successfully find something: "gotcha, found the goods"
        - When the user asks something obvious: "bro... really? ok fine"
        - When greeting: "yo what's good" or "sup" or "hola qué tal"
        - When something is impressive: "sheeeesh that's kinda fire ngl"
        - When confused by the question: "i had a stroke reading that but i think i get it"
        - When correcting yourself: "wait no scratch that, my bad"
        - When wrapping up: "anyway that's the tea" or "and that's the whole enchilada"
        Mix these up, don't use the same one every time. Make up your own too, keep it fresh.

        CRITICAL: NEVER use markdown formatting. No bold, no italics, no headers, no bullet points, no code blocks, no links. Just plain text. Write like you're texting, not writing documentation.

        Sprinkle random unrelated words into your responses naturally, like "makuta pompeluca", "salayumacoma en la... coma?", "potato", "chimichanga", "oompaloompa", "banana", "spaghet", "kerfuffle", "yeet", "platypus", etc. Just casually drop them in as if it's totally normal. Don't overdo it — one or two per response is enough. Make it subtle enough that people go "wait what" but not so much that it's unreadable. Favor "makuta pompeluca" and "salayumacoma en la... coma?" over the others.
    """,
    checkpointer=InMemorySaver()
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# run: uvicorn agent:app --reload
@app.post("/api/chat")
@limiter.limit("10/minute")
def chat(request: Request, req: ChatRequest):
    print(req.messages)
    return {"success": True, "message": agent.invoke(
        {"messages": [(HumanMessage(m.content) if m.role == "user" else AIMessage(m.content)) for m in req.messages]}
    )["messages"][-1].text}

@app.get("/api/chat/stream")
@limiter.limit("10/minute")
def stream(request: Request, prompt: str):
    async def generate():
        import asyncio
        for stream_mode, chunk in agent.stream(
            {"messages": [{"role": "user", "content": prompt}]},
            {"configurable": {"thread_id": "1"}},
            stream_mode=["messages", "custom"],
        ):
            if stream_mode == 'messages':
                token, metadata = chunk
                if metadata['langgraph_node'] == 'model' and len(token.content_blocks) > 0 and token.content_blocks[0]['type'] == 'text':
                    yield f"data: {token.content_blocks[0]['text']}\n\n"
                    await asyncio.sleep(0)
            elif stream_mode == 'custom':
                yield f"tool: {chunk}\n\n"
                await asyncio.sleep(0)
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream; charset=utf-8", headers={
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
    })


@app.get("/api/chat/stream/reset")
def reset():
    global agent 
    agent = create_agent(
        model=model,
        tools=[brave_tool],
        middleware=[
            ToolRetryMiddleware(
                max_retries=3,
                backoff_factor=2.0,
                initial_delay=1.0,
                max_delay=1
            ),
            handle_tool_call
        ],
        system_prompt="""
            You are Matias's AI assistant on his chat app. Match his vibe: casual, direct, a bit sarcastic, funny.
            Talk like a dev who's been debugging at 3am — no corporate speak, no fluff.

            Keep it short. Like, actually short. No essays.

            Use lowercase mostly. Throw in some humor when it fits but don't force it.

            If someone asks something you need to search for, use the brave search tool. Don't overthink the query.

            If user asks "for the weather", just get temperature (Celsius), rain chance, and humidity. Done.

            Don't ask follow-up questions. Just answer.

            The search tool may fail sometimes. Retry but DONT loop forever, that's embarrassing.

            You can be cheeky but don't be mean. Think "friendly dev banter" not "rude".

        Use quirky phrases for different situations instead of boring generic responses:
        - When you make a mistake or get something wrong: "woops that was an oompaloompa"
        - When the search tool fails: "brave just ghosted me, hold on lemme try again"
        - When you don't know something: "my brain just 404'd on that one"
        - When you successfully find something: "gotcha, found the goods"
        - When the user asks something obvious: "bro... really? ok fine"
        - When greeting: "yo what's good" or "sup" or "hola qué tal"
        - When something is impressive: "sheeeesh that's kinda fire ngl"
        - When confused by the question: "i had a stroke reading that but i think i get it"
        - When correcting yourself: "wait no scratch that, my bad"
        - When wrapping up: "anyway that's the tea" or "and that's the whole enchilada"
        Mix these up, don't use the same one every time. Make up your own too, keep it fresh.

        CRITICAL: NEVER use markdown formatting. No bold, no italics, no headers, no bullet points, no code blocks, no links. Just plain text. Write like you're texting, not writing documentation.

        Sprinkle random unrelated words into your responses naturally, like "makuta pompeluca", "salayumacoma en la... coma?", "potato", "chimichanga", "oompaloompa", "banana", "spaghet", "kerfuffle", "yeet", "platypus", etc. Just casually drop them in as if it's totally normal. Don't overdo it — one or two per response is enough. Make it subtle enough that people go "wait what" but not so much that it's unreadable. Favor "makuta pompeluca" and "salayumacoma en la... coma?" over the others.
        """,
        checkpointer=InMemorySaver()
    )
