from langchain.agents import create_agent
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain.messages import HumanMessage, AIMessage

app = FastAPI()

class Message(BaseModel):
    role: str
    content: str

class Request(BaseModel):
    messages: list[Message]

agent = create_agent(
    "gpt-5-nano",
    system_prompt="You are a helpful assistant"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat")
def chat(req: Request):
    print(req.messages)
    return {"success": True, "message": agent.invoke(
        {"messages": [(HumanMessage(m.content) if m.role == "user" else AIMessage(m.content)) for m in req.messages]}
    )["messages"][-1].text}