# ECR & Fargate Cheatsheet

## Architecture

```
                                HTTPS
┌──────────┐  langchain-chat.  ┌────────────┐              ┌─────────────┐
│  Browser  │  matiaslotito.com│ CloudFront  │─────────────▶│  S3 Bucket  │
│           │ ────────────────▶│  (static)   │              │  (frontend) │
│           │                  └────────────┘              └─────────────┘
│           │
│           │  api.            ┌─────────────┐
│           │  matiaslotito.com│     NLB     │
│           │ ────────────────▶│  :443 TLS   │
└──────────┘      HTTPS       └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │   Fargate   │
                               │  agent.py   │
                               │   :8000     │
                               └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │  OpenAI API │
                               │  Brave API  │
                               └─────────────┘
```

## ECR Setup (one-time)

```bash
aws ecr create-repository --repository-name langchain-chat --region eu-west-1
```

## Login to ECR

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 591136340197.dkr.ecr.eu-west-1.amazonaws.com
```

## Build & Push

```bash
docker build --platform linux/amd64 -t 591136340197.dkr.ecr.eu-west-1.amazonaws.com/langchain-chat:latest .
docker push 591136340197.dkr.ecr.eu-west-1.amazonaws.com/langchain-chat:latest
```

## Deploy New Image to Fargate

1. Create new task definition revision with the new image
2. Update the service:

```bash
aws ecs update-service --cluster outgoing-fox-qe0jf6 --service langchain-chat-backend-service-a0zlfoni --force-new-deployment --region eu-west-1
```

## Build & Deploy Frontend

```bash
REACT_APP_API_URL=https://api.matiaslotito.com npm run build
aws s3 sync build/ s3://langchain-chat.matiaslotito.com --region eu-west-1 --delete
aws cloudfront create-invalidation --distribution-id E2PHRM6DT6JWGW --paths "/*"
```

## Env Vars for Task Definition

- `OPENAI_API_KEY` (ValueFrom: `arn:aws:ssm:eu-west-1:591136340197:parameter/OPENAI_API_KEY`)
- `BRAVE_SEARCH_API_KEY` (ValueFrom: `arn:aws:ssm:eu-west-1:591136340197:parameter/BRAVE_SEARCH_API_KEY`)
- `LLM_BASE_URL` (default: `https://api.openai.com/v1`)
- `LLM_MODEL` (default: `gpt-5-nano`)
- `CORS_ORIGINS` (comma-separated, e.g. `https://langchain-chat.matiaslotito.com`)

## Health Check

- Path: `/health`
- Port: `8000`
- Container health check: `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1`

## Fargate Config (test)

- 0.25 vCPU / 0.5GB

## Port Mappings

- Container port: `8000`
- Protocol: `tcp`
- NLB listener: `443 TLS` → Target group: `8000 TCP`

## URLs

- Frontend: `https://langchain-chat.matiaslotito.com`
- API: `https://api.matiaslotito.com`
- CloudFront distribution: `E2PHRM6DT6JWGW`
- NLB: `langchain-chat-nlb-7459a70d24b1f89c.elb.eu-west-1.amazonaws.com`
- ECR: `591136340197.dkr.ecr.eu-west-1.amazonaws.com/langchain-chat`

## Check Logs

```bash
aws logs tail /ecs/langchain-chat-backend --follow --region eu-west-1
```
