# FRIDAY Security Architecture

1. **Localhost Isolation**:
   - Backend binds strictly to `127.0.0.1:8765`.
   - Never exposes open ports to the local network or public internet.

2. **Policy Engine & Tool Gating**:
   - Every tool call proposed by the LLM is evaluated by `PolicyEngine`.
   - Read-only tools execute automatically (e.g., getting local system time or battery).
   - Sensitive tools (file writing/deletion, calendar modifications, sending notifications, executing scripts) require explicit in-UI approval.
   - Arbitrary shell execution from raw LLM output is strictly blocked.

3. **Credential Storage**:
   - Cloudflare Worker and API tokens reside solely in `backend/.env`.
   - Never bundled into frontend client code or distributed binaries.

