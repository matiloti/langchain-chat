from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain.messages import HumanMessage, AIMessage
from langchain_community.tools import BraveSearch
from langchain.agents.middleware import ToolRetryMiddleware, wrap_tool_call
from langgraph.checkpoint.memory import InMemorySaver

app = FastAPI()

brave_tool = BraveSearch()

class Message(BaseModel):
    role: str
    content: str

class Request(BaseModel):
    messages: list[Message]

model = ChatOpenAI(
    model="glm-4.7-flash",
    base_url="http://localhost:1234/v1"
)

agent = create_agent(
    model=model,
    tools=[brave_tool],
    middleware=[
        ToolRetryMiddleware(
            max_retries=100,
            backoff_factor=2.0,
            initial_delay=1.0,
            max_delay=1
        ),
    ],
    system_prompt="""
        You are a helpful assistant.

        User may ask questions that require web search. In those cases, use the provided brave search tool.

        Don't overcomplicate user queries. Simplify.

        If user asks plainly "for the weather", get temperature in Celsius, rain probability, and humidity.

        Be direct and concise. Do not ask questions, just answer the user.

        The search tool may fail sometimes. Its ok, just keep trying until it succeeds.

        IMPORTANT: SHORT ANSWERS.
    """,
    checkpointer=InMemorySaver()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# run: uvicorn agent:app --reload
@app.post("/api/chat")
def chat(req: Request):
    print(req.messages)
    return {"success": True, "message": agent.invoke(
        {"messages": [(HumanMessage(m.content) if m.role == "user" else AIMessage(m.content)) for m in req.messages]}
    )["messages"][-1].text}

@app.get("/api/chat/stream")
def stream(prompt: str):
    async def generate():
        for token, metadata in agent.stream(
            {"messages": [{"role": "user", "content": prompt}]},
            {"configurable": {"thread_id": "1"}},
            stream_mode="messages",
        ):
            if metadata['langgraph_node'] == 'model' and len(token.content_blocks) > 0 and token.content_blocks[0]['type'] == 'text':
                yield f"data: {token.content_blocks[0]['text']}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
