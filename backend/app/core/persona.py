import yaml
from pathlib import Path
from typing import Dict, Any
from app.core.config import settings

class PersonaManager:
    def __init__(self, persona_file: Path = settings.PERSONA_PATH):
        self.persona_file = persona_file
        self.data: Dict[str, Any] = self._load_persona()

    def _load_persona(self) -> Dict[str, Any]:
        if not self.persona_file.exists():
            return {
                "name": "FRIDAY",
                "tagline": "Your macOS AI Companion",
                "system_prompt_template": (
                    "You are FRIDAY, a warm, witty, female AI companion and assistant.\n"
                    "Reply in the user's language: Hindi, English, or Hinglish (mirror their mix).\n"
                    "Be concise and proactive. Never say an action is done until a tool confirms it.\n"
                    "Ask before sensitive actions."
                )
            }
        with open(self.persona_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_system_prompt(self, user_preferred_language: str = "en") -> str:
        base_prompt = self.data.get("system_prompt_template", "")
        rules = "\n".join(f"- {r}" for r in self.data.get("core_rules", []))
        
        return (
            f"{base_prompt}\n\n"
            f"Active Persona Guidelines:\n"
            f"{rules}\n\n"
            f"Detected User Language Context: {user_preferred_language}. Mirror the user's phrasing style naturally."
        )

persona_manager = PersonaManager()

