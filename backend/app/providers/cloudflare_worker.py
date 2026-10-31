import json
import httpx
from typing import List, Dict, Any, AsyncGenerator
from app.core.config import settings
from app.providers.base import LLMProvider

class CloudflareWorkerProvider(LLMProvider):
    def __init__(
        self,
        worker_url: str = settings.CLOUDFLARE_WORKER_URL,
        auth_token: str = settings.CLOUDFLARE_WORKER_AUTH_TOKEN,
        model_name: str = settings.CLOUDFLARE_MODEL_NAME,
    ):
        self.worker_url = worker_url
        self.auth_token = auth_token
        self.model_name = model_name

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        headers = {
            "Content-Type": "application/json"
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": stream
        }
        if tools:
            payload["tools"] = tools

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                if stream:
                    async with client.stream("POST", self.worker_url, json=payload, headers=headers) as resp:
                        if resp.status_code != 200:
                            err_body = await resp.aread()
                            yield {
                                "type": "error",
                                "content": f"Worker error {resp.status_code}: {err_body.decode(errors='ignore')}"
                            }
                            return

                        async for line in resp.aiter_lines():
                            line = line.strip()
                            if not line:
                                continue
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    yield {"type": "done", "content": ""}
                                    break
                                try:
                                    parsed = json.loads(data_str)
                                    # Standard OpenAI format delta or direct text
                                    if "choices" in parsed and len(parsed["choices"]) > 0:
                                        delta = parsed["choices"][0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            yield {"type": "content", "content": content}
                                    elif "response" in parsed:
                                        yield {"type": "content", "content": parsed["response"]}
                                except Exception:
                                    yield {"type": "content", "content": data_str}
                else:
                    resp = await client.post(self.worker_url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = (
                            data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            if "choices" in data else data.get("response", str(data))
                        )
                        yield {"type": "content", "content": text}
                        yield {"type": "done", "content": ""}
                    else:
                        yield {
                            "type": "error",
                            "content": f"HTTP {resp.status_code}: {resp.text}"
                        }
        except Exception as e:
            yield {"type": "error", "content": f"Error communicating with AI Worker: {str(e)}"}

