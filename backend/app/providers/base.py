from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncGenerator

class LLMProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream or yield chunks of chat response.
        Chunk dict format:
        {
            "type": "content" | "tool_call" | "done" | "error",
            "content": str,
            "tool_call": dict (optional)
        }
        """
        pass

