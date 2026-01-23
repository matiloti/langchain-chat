# LangChain demo chat

This app is a demo for a LangChain chat with internet access powered by Brave Search tool and GPT-5-nano.

## Tech Stack 

- LangChain
- Python
- FastAPI
- Uvicorn
- Brave Search API
- React
- Typescript
- Tailwindcss

## Run it

### 1. Export API keys in environment variables

Im just posting Linux/Mac commands, but you get it:

```bash
export BRAVE_SEARCH_API_KEY=<your_api_key>
export OPENAI_API_KEY=<your_api_key> 
```

### 2. Run backend

```bash
pip3 install fastapi uvicorn langchain langchain-openai langchain-community
uvicorn agent:app --reload
```

### 3. Run frontend

```bash
npm install
npm run start
```

## 4. Enjoy 🚀

You now can chat with the agent through the chat interface.