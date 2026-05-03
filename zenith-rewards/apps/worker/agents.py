# Stub for agents using google-genai
from google import genai
import os

class BaseAgent:
    def __init__(self, job_id: str, db_session):
        self.job_id = job_id
        self.db = db_session
        api_key = os.getenv("GEMINI_API_KEY", "stub")
        self.client = genai.Client(api_key=api_key)

    async def run(self, payload: dict) -> dict:
        raise NotImplementedError

    async def emit_event(self, event_type: str, data: dict):
        pass

class CardDiscoveryAgent(BaseAgent):
    async def run(self, payload: dict) -> dict:
        return {"status": "stubbed"}
