from enum import Enum
from typing import Dict, Any

class ToolSensitivity(str, Enum):
    READ_ONLY = "read_only"
    REQUIRES_APPROVAL = "requires_approval"
    BLOCKED = "blocked"

# Tool classification rules
TOOL_POLICIES: Dict[str, ToolSensitivity] = {
    # Read-only tools
    "get_calendar_events": ToolSensitivity.READ_ONLY,
    "get_reminders": ToolSensitivity.READ_ONLY,
    "get_system_status": ToolSensitivity.READ_ONLY,
    "list_files": ToolSensitivity.READ_ONLY,
    "read_file": ToolSensitivity.READ_ONLY,
    
    # Sensitive operations requiring user confirmation
    "create_calendar_event": ToolSensitivity.REQUIRES_APPROVAL,
    "create_reminder": ToolSensitivity.REQUIRES_APPROVAL,
    "delete_reminder": ToolSensitivity.REQUIRES_APPROVAL,
    "open_application": ToolSensitivity.REQUIRES_APPROVAL,
    "write_file": ToolSensitivity.REQUIRES_APPROVAL,
    "send_notification": ToolSensitivity.READ_ONLY,
    
    # Blocked
    "execute_terminal_command": ToolSensitivity.BLOCKED,
    "delete_file": ToolSensitivity.REQUIRES_APPROVAL,
}

class PolicyEngine:
    @staticmethod
    def evaluate(tool_name: str, arguments: Dict[str, Any]) -> ToolSensitivity:
        return TOOL_POLICIES.get(tool_name, ToolSensitivity.REQUIRES_APPROVAL)

