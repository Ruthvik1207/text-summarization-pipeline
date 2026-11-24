import os
import sys
from pathlib import Path

# Ensure root and backend directory are in sys.path
_ROOT = Path(__file__).resolve().parent
_BACKEND = _ROOT / "backend"
for _p in [str(_BACKEND), str(_ROOT)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

sep = ";" if sys.platform == "win32" else ":"
current_pp = os.environ.get("PYTHONPATH", "")
os.environ["PYTHONPATH"] = f"{_BACKEND}{sep}{_ROOT}{sep}{current_pp}" if current_pp else f"{_BACKEND}{sep}{_ROOT}"

(_BACKEND / "data").mkdir(parents=True, exist_ok=True)

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
