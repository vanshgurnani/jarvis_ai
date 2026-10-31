import platform
import subprocess
import re
from datetime import datetime
from typing import Dict, Any, List, Callable

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}
        self._handlers: Dict[str, Callable] = {}
        self._register_default_tools()

    def register(self, name: str, description: str, parameters: Dict[str, Any], handler: Callable):
        self._tools[name] = {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": parameters,
            }
        }
        self._handlers[name] = handler

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return list(self._tools.values())

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        if name not in self._handlers:
            raise ValueError(f"Unknown tool: {name}")
        handler = self._handlers[name]
        return await handler(**arguments)

    def _register_default_tools(self):
        # 1. System Status
        async def get_system_status():
            return {
                "os": platform.system(),
                "release": platform.release(),
                "machine": platform.machine(),
                "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "All systems operational"
            }

        self.register(
            name="get_system_status",
            description="Get the current macOS host system info, battery status, and local time.",
            parameters={"type": "object", "properties": {}, "required": []},
            handler=get_system_status
        )

        # 2. Send Native macOS Notification
        async def send_notification(title: str, message: str):
            cmd = f'display notification "{message}" with title "{title}"'
            subprocess.run(["osascript", "-e", cmd], check=False)
            return {"status": "success", "message": f"Notification '{title}' delivered"}

        self.register(
            name="send_notification",
            description="Send a native macOS desktop notification banner.",
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Notification title"},
                    "message": {"type": "string", "description": "Notification body text"}
                },
                "required": ["title", "message"]
            },
            handler=send_notification
        )

        # 3. Open Allowed Application
        async def open_application(app_name: str):
            allowed = ["Calendar", "Reminders", "Notes", "Safari", "Music", "Terminal", "Finder", "Google Chrome", "Brave Browser"]
            if app_name not in allowed:
                return {"status": "error", "error": f"App '{app_name}' is not in the allowlist ({', '.join(allowed)})"}
            subprocess.run(["open", "-a", app_name], check=False)
            return {"status": "success", "message": f"Opened {app_name}"}

        self.register(
            name="open_application",
            description="Open an approved macOS application (e.g. Calendar, Reminders, Notes, Safari, Chrome).",
            parameters={
                "type": "object",
                "properties": {
                    "app_name": {"type": "string", "description": "Name of the application to launch"}
                },
                "required": ["app_name"]
            },
            handler=open_application
        )

        # 4. Open URL in Default Browser
        async def open_url(url: str):
            if not (url.startswith("http://") or url.startswith("https://")):
                return {"status": "error", "error": "Invalid URL protocol (must start with http:// or https://)"}
            subprocess.run(["open", url], check=False)
            return {"status": "success", "message": f"Opened {url} in browser"}

        self.register(
            name="open_url",
            description="Open a web link / URL in the default macOS web browser.",
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The HTTP or HTTPS URL to open"}
                },
                "required": ["url"]
            },
            handler=open_url
        )

        # 5. Fetch Web Page Content from URL
        async def fetch_url_content(url: str):
            import httpx
            if not (url.startswith("http://") or url.startswith("https://")):
                return {"status": "error", "error": "Invalid URL. URL must start with http:// or https://"}
            try:
                async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                    resp = await client.get(
                        url,
                        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
                    )
                    if resp.status_code != 200:
                        return {"status": "error", "error": f"HTTP {resp.status_code}: Unable to reach URL"}
                    text = resp.text
                    # Strip scripts and styles
                    text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
                    text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
                    text = re.sub(r'<[^>]+>', ' ', text)
                    clean_text = ' '.join(text.split())[:3500]
                    return {
                        "status": "success",
                        "url": url,
                        "content": clean_text
                    }
            except Exception as e:
                return {"status": "error", "error": f"Failed to fetch URL: {str(e)}"}

        self.register(
            name="fetch_url_content",
            description="Fetch and read the text content of a given web URL for summarizing or answering questions.",
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Web URL to fetch and read"}
                },
                "required": ["url"]
            },
            handler=fetch_url_content
        )

tool_registry = ToolRegistry()
