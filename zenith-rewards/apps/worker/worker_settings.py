async def dummy_task(ctx):
    return "ok"

class WorkerSettings:
    functions = [dummy_task]
    redis_settings = None

