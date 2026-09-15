print("1. Starting run.py...", flush=True)
import uvicorn
print("2. Importing app.main...", flush=True)
from app.main import app
print("3. App imported! Starting uvicorn...", flush=True)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

