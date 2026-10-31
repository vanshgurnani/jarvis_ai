from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.tools.registry import tool_registry

scheduler = AsyncIOScheduler()

async def morning_briefing_job():
    # Deliver morning check-in notification
    await tool_registry.execute(
        "send_notification",
        {
            "title": "FRIDAY Morning Briefing",
            "message": "Good morning! Ready when you are. Check in to review your day's schedule."
        }
    )

def setup_scheduler():
    # Scheduled for 9:00 AM daily
    scheduler.add_job(morning_briefing_job, "cron", hour=9, minute=0, id="morning_briefing")
    scheduler.start()

