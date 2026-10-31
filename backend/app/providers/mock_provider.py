import asyncio
from typing import List, Dict, Any, AsyncGenerator
from app.providers.base import LLMProvider

class MockProvider(LLMProvider):
    async def chat(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "")
                break

        # Check for Hinglish/Hindi tone
        is_hindi = any(word in last_user_msg.lower() for word in ["kya", "kaise", "batao", "namaste", "shukriya", "haan", "yaar"])

        if is_hindi:
            reply = (
                f"Haan bilkul! Main FRIDAY hoon, aapki personal macOS companion. "
                f"Maine aapka message suna: \"{last_user_msg}\". "
                f"Bataiye, calendar check karna hai ya koi pending task?"
            )
        else:
            reply = (
                f"Hello! I am FRIDAY, your local macOS companion. "
                f"I received: \"{last_user_msg}\". "
                f"All systems are online and running smoothly on your Mac."
            )

        # Stream words with slight delay
        words = reply.split(" ")
        for i, word in enumerate(words):
            separator = " " if i < len(words) - 1 else ""
            yield {"type": "content", "content": word + separator}
            await asyncio.sleep(0.04)

        yield {"type": "done", "content": ""}

