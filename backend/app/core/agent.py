import re
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.core.config import settings
from app.core.persona import persona_manager
from app.voice.lang_detect import detect_language
from app.memory.sqlite import get_recent_messages, save_message, get_all_facts
from app.providers.cloudflare_worker import CloudflareWorkerProvider
from app.providers.custom_llm import CustomLLMProvider
from app.providers.llama_gateway import LlamaGatewayProvider
from app.providers.mock_provider import MockProvider
from app.providers.base import LLMProvider
from app.tools.registry import tool_registry

URL_REGEX = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')

class AgentLoop:
    def __init__(self):
        self.provider: LLMProvider = self._init_provider()

    def _init_provider(
        self,
        provider_type: Optional[str] = None,
        custom_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> LLMProvider:
        p_type = provider_type or settings.LLM_PROVIDER
        if p_type in ("custom_llm", "custom", "llama_gateway"):
            return CustomLLMProvider(
                gateway_url=custom_url or settings.CUSTOM_LLM_URL or settings.LLAMA_GATEWAY_URL,
                auth_token=auth_token if auth_token is not None else (settings.CUSTOM_LLM_TOKEN or settings.LLAMA_GATEWAY_TOKEN),
                model_name=model_name or settings.CUSTOM_LLM_MODEL or settings.LLAMA_GATEWAY_MODEL,
            )
        elif p_type == "cloudflare_worker":
            return CloudflareWorkerProvider()
        return MockProvider()

    def reload_provider(
        self,
        provider_type: Optional[str] = None,
        custom_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self.provider = self._init_provider(
            provider_type=provider_type,
            custom_url=custom_url,
            auth_token=auth_token,
            model_name=model_name
        )

    async def run(
        self,
        session_id: str,
        user_message: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # 1. Detect language & save user message
        lang = detect_language(user_message)
        await save_message(session_id=session_id, role="user", content=user_message)

        # 2. Check for URL interactions
        urls_found = URL_REGEX.findall(user_message)
        url_context = ""
        user_lower = user_message.lower().strip()

        # Handle direct "open <url>" intent
        if urls_found and ("open" in user_lower or "launch" in user_lower):
            for u in urls_found:
                normalized_url = u if u.startswith("http") else f"https://{u}"
                res = await tool_registry.execute("open_url", {"url": normalized_url})
                if res.get("status") == "success":
                    msg = f"I've opened {normalized_url} in your browser."
                    yield {"type": "content", "content": msg}
                    yield {"type": "done", "content": ""}
                    await save_message(session_id=session_id, role="assistant", content=msg)
                    return

        # Handle reading/fetching URL for summarizing or questions
        if urls_found:
            for u in urls_found[:2]:  # Limit to first 2 URLs
                normalized_url = u if u.startswith("http") else f"https://{u}"
                fetch_res = await tool_registry.execute("fetch_url_content", {"url": normalized_url})
                if fetch_res.get("status") == "success":
                    url_context += f"\n\n[Web content retrieved from {normalized_url}]:\n{fetch_res.get('content', '')}\n"

        # 3. Build context
        system_prompt = persona_manager.get_system_prompt(user_preferred_language=lang)
        facts = await get_all_facts()
        if facts:
            fact_str = "\n".join([f"- {f['fact']}" for f in facts])
            system_prompt += f"\n\nRemembered facts about user:\n{fact_str}"

        if url_context:
            system_prompt += f"\n\nContext from URL link(s):{url_context}"

        # 4. Retrieve recent history
        history = await get_recent_messages(session_id=session_id, limit=10)
        messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for m in history:
            messages.append({"role": m["role"], "content": m["content"]})

        # 5. Stream response from provider
        full_response = []
        tools = tool_registry.get_tool_definitions()

        async for chunk in self.provider.chat(messages=messages, tools=tools, stream=True):
            if chunk["type"] == "content":
                full_response.append(chunk["content"])
                yield chunk
            elif chunk["type"] == "done":
                # Save assistant reply to memory
                await save_message(session_id=session_id, role="assistant", content="".join(full_response))
                yield chunk
            else:
                yield chunk

agent_loop = AgentLoop()
