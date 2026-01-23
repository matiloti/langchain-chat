from langchain.agents import create_agent
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain.messages import HumanMessage, AIMessage
from langchain_community.tools import BraveSearch
from langchain.agents.middleware import ToolRetryMiddleware

app = FastAPI()

brave_tool = BraveSearch()

class Message(BaseModel):
    role: str
    content: str

class Request(BaseModel):
    messages: list[Message]

agent = create_agent(
    "gpt-5-nano",
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
    """
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