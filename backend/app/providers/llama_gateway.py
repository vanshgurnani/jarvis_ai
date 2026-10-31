from typing import Optional
from app.core.config import settings
from app.providers.custom_llm import CustomLLMProvider

class LlamaGatewayProvider(CustomLLMProvider):
    """
    LlamaGatewayProvider inheriting from universal CustomLLMProvider.
    Maintains compatibility while benefiting from robust endpoint resolution,
    streaming SSE parsing, and multiple payload formats.
    """
    def __init__(
        self,
        gateway_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        super().__init__(
            gateway_url=gateway_url or settings.LLAMA_GATEWAY_URL,
            auth_token=auth_token if auth_token is not None else settings.LLAMA_GATEWAY_TOKEN,
            model_name=model_name or settings.LLAMA_GATEWAY_MODEL,
        )
