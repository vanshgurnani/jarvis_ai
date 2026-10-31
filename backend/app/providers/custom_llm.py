import json
import logging
import httpx
from typing import List, Dict, Any, AsyncGenerator, Optional
from app.core.config import settings
from app.providers.base import LLMProvider

logger = logging.getLogger("friday.providers.custom_llm")

class CustomLLMProvider(LLMProvider):
    """
    Universal Custom LLM Provider with OpenAI-compatible, Cloudflare Workers AI,
    and custom gateway endpoint/URL support.
    """
    def __init__(
        self,
        gateway_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: float = 60.0
    ):
        self.gateway_url = (gateway_url or settings.CUSTOM_LLM_URL or settings.LLAMA_GATEWAY_URL).rstrip("/")
        self.auth_token = auth_token if auth_token is not None else (settings.CUSTOM_LLM_TOKEN or settings.LLAMA_GATEWAY_TOKEN)
        self.model_name = model_name or settings.CUSTOM_LLM_MODEL or settings.LLAMA_GATEWAY_MODEL
        self.timeout = timeout

    def _get_target_endpoints(self) -> List[str]:
        """
        Derives candidate endpoints based on custom URL formatting.
        Handles full paths, /v1 prefixes, and base URLs.
        """
        url = self.gateway_url
        if url.endswith("/v1/chat/completions") or url.endswith("/chat") or url.endswith("/completions"):
            return [url]
        if url.endswith("/v1"):
            return [f"{url}/chat/completions", f"{url}/chat"]
        # Standard base URL: try OpenAI standard first, then /chat, then direct root
        return [
            f"{url}/v1/chat/completions",
            f"{url}/chat",
            url
        ]

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

        # Clean messages to retain role and string content
        cleaned_messages = [
            {"role": str(m.get("role", "user")), "content": str(m.get("content", ""))}
            for m in messages
            if m.get("content") is not None
        ]

        payload = {
            "model": self.model_name,
            "messages": cleaned_messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": stream
        }

        endpoints = self._get_target_endpoints()
        last_error = None

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for endpoint in endpoints:
                try:
                    if stream:
                        async with client.stream("POST", endpoint, json=payload, headers=headers) as resp:
                            if resp.status_code == 404 and len(endpoints) > 1 and endpoint != endpoints[-1]:
                                logger.info(f"Endpoint {endpoint} returned 404, trying next candidate...")
                                continue
                            if resp.status_code != 200:
                                err_body = await resp.aread()
                                yield {
                                    "type": "error",
                                    "content": f"Custom LLM Gateway Error {resp.status_code} ({endpoint}): {err_body.decode(errors='ignore')}"
                                }
                                return

                            async for item in self._process_stream(resp):
                                yield item
                            return
                    else:
                        resp = await client.post(endpoint, json=payload, headers=headers)
                        if resp.status_code == 404 and len(endpoints) > 1 and endpoint != endpoints[-1]:
                            continue
                        if resp.status_code == 200:
                            data = resp.json()
                            text = self._extract_text_from_response(data)
                            yield {"type": "content", "content": text}
                            yield {"type": "done", "content": ""}
                            return
                        else:
                            yield {
                                "type": "error",
                                "content": f"Custom LLM Gateway HTTP {resp.status_code}: {resp.text}"
                            }
                            return
                except httpx.RequestError as exc:
                    last_error = str(exc)
                    logger.warning(f"Failed to connect to endpoint {endpoint}: {exc}")
                    continue
                except Exception as exc:
                    last_error = str(exc)
                    break

        yield {
            "type": "error",
            "content": f"Failed to connect to Custom LLM Gateway ({self.gateway_url}): {last_error or 'Unknown error'}"
        }

    async def _process_stream(self, resp: httpx.Response) -> AsyncGenerator[Dict[str, Any], None]:
        has_yielded = False
        async for line in resp.aiter_lines():
            line = line.strip()
            if not line:
                continue

            # Standard SSE data prefix
            if line.startswith("data: "):
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    yield {"type": "done", "content": ""}
                    return
                try:
                    parsed = json.loads(data_str)
                    content = self._extract_text_from_chunk(parsed)
                    if content:
                        has_yielded = True
                        yield {"type": "content", "content": content}
                except Exception:
                    # Raw text chunk fallback
                    if data_str:
                        has_yielded = True
                        yield {"type": "content", "content": data_str}
            elif not line.startswith(":"):
                # Non-SSE JSON or text stream fallback
                try:
                    parsed = json.loads(line)
                    content = self._extract_text_from_chunk(parsed)
                    if content:
                        has_yielded = True
                        yield {"type": "content", "content": content}
                except Exception:
                    pass

        yield {"type": "done", "content": ""}

    def _extract_text_from_chunk(self, parsed: Dict[str, Any]) -> str:
        # 1. OpenAI style choices -> delta -> content
        if "choices" in parsed and len(parsed["choices"]) > 0:
            delta = parsed["choices"][0].get("delta", {})
            if "content" in delta and delta["content"]:
                return delta["content"]
            if "text" in parsed["choices"][0] and parsed["choices"][0]["text"]:
                return parsed["choices"][0]["text"]
        # 2. Cloudflare Workers AI style
        if "response" in parsed and parsed["response"]:
            return parsed["response"]
        # 3. Direct content / text keys
        if "content" in parsed and parsed["content"]:
            return parsed["content"]
        if "text" in parsed and parsed["text"]:
            return parsed["text"]
        return ""

    def _extract_text_from_response(self, data: Any) -> str:
        if isinstance(data, dict):
            if "choices" in data and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    return choice["message"]["content"]
                if "text" in choice:
                    return choice["text"]
            for key in ("response", "content", "text", "output"):
                if key in data and data[key]:
                    return str(data[key])
            return str(data)
        return str(data)

