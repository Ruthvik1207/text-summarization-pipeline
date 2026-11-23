import os
from typing import Dict, Any, Optional
from datetime import datetime
import mlflow
from mlflow.tracking import MlflowClient
from app.config import settings
from app.utils.logger import logger

class MLflowService:
    def __init__(self):
        self.tracking_uri = settings.MLFLOW_TRACKING_URI
        self.experiment_name = settings.MLFLOW_EXPERIMENT_NAME
        self.registered_model_name = settings.MLFLOW_REGISTERED_MODEL_NAME
        self._server_process = None
        self._setup_client()

    def _setup_client(self):
        try:
            mlflow.set_tracking_uri(self.tracking_uri)
            self.client = MlflowClient(tracking_uri=self.tracking_uri)
        except Exception as e:
            logger.warning(f"Could not initialize MLflow client with tracking URI {self.tracking_uri}: {e}")
            self.client = None

    def is_connected(self) -> bool:
        """Check if MLflow tracking server is reachable."""
        try:
            from urllib.parse import urlparse
            import socket
            parsed = urlparse(self.tracking_uri)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            # Try connecting directly to host
            try:
                with socket.create_connection((host, port), timeout=0.8):
                    pass
            except Exception:
                # If host was localhost, fallback to IPv4 loopback
                if host == "localhost":
                    with socket.create_connection(("127.0.0.1", port), timeout=0.8):
                        pass
                else:
                    return False
        except Exception:
            return False

        try:
            if not self.client:
                self._setup_client()
            if self.client:
                self.client.search_experiments(max_results=1)
                return True
        except Exception:
            return False
        return False

    def start_local_server(self) -> bool:
        """Starts local MLflow tracking server as a background subprocess if tracking URI is localhost."""
        if self.is_connected():
            return True
        try:
            from urllib.parse import urlparse
            import subprocess
            import sys
            import time
            parsed = urlparse(self.tracking_uri)
            host = parsed.hostname or "localhost"
            if host in ("localhost", "127.0.0.1"):
                port = parsed.port or 5000
                db_path = settings.BACKEND_DIR / "mlflow.db"
                artifacts_path = settings.BACKEND_DIR / "mlflow-artifacts"
                artifacts_path.mkdir(parents=True, exist_ok=True)
                cmd = [
                    sys.executable, "-m", "mlflow", "server",
                    "--backend-store-uri", f"sqlite:///{db_path}",
                    "--default-artifact-root", str(artifacts_path),
                    "--host", "127.0.0.1",
                    "--port", str(port)
                ]
                logger.info(f"Auto-starting local MLflow tracking server on 127.0.0.1:{port}...")
                self._server_process = subprocess.Popen(
                    cmd,
                    cwd=str(settings.BACKEND_DIR),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                for _ in range(15):
                    time.sleep(0.5)
                    if self.is_connected():
                        logger.info("Local MLflow server started and verified.")
                        return True
        except Exception as e:
            logger.warning(f"Could not auto-start local MLflow server: {e}")
        return False

    def stop_local_server(self):
        """Stops the spawned local MLflow server if it was started by this process."""
        if self._server_process:
            try:
                logger.info("Stopping auto-started MLflow server...")
                self._server_process.terminate()
                self._server_process.wait(timeout=3)
            except Exception:
                try:
                    self._server_process.kill()
                except Exception:
                    pass
            self._server_process = None

    def get_status(self) -> Dict[str, Any]:
        """Returns the current MLflow server and experiment status."""
        connected = self.is_connected()
        status_info = {
            "tracking_uri": self.tracking_uri,
            "is_connected": connected,
            "experiment_name": self.experiment_name,
            "registered_model_name": self.registered_model_name,
            "latest_run_id": None,
            "latest_metrics": {},
            "registered_model_version": None,
            "runs_count": 0,
            "traces_count": 0,
            "latest_trace_id": None,
            "traces_url": f"{self.tracking_uri}/#/experiments/1/traces"
        }

        if not connected or not self.client:
            return status_info

        try:
            exp = self.client.get_experiment_by_name(self.experiment_name)
            if exp:
                status_info["traces_url"] = f"{self.tracking_uri}/#/experiments/{exp.experiment_id}/traces"
                runs = self.client.search_runs(
                    experiment_ids=[exp.experiment_id],
                    max_results=10,
                    order_by=["attributes.start_time DESC"]
                )
                status_info["runs_count"] = len(runs)
                if runs:
                    latest = runs[0]
                    status_info["latest_run_id"] = latest.info.run_id
                    status_info["latest_metrics"] = {
                        k: round(v, 4) for k, v in latest.data.metrics.items()
                    }

                # Query MLflow Traces
                try:
                    traces = self.client.search_traces([exp.experiment_id], max_results=20)
                    status_info["traces_count"] = len(traces)
                    if traces:
                        status_info["latest_trace_id"] = traces[0].info.request_id
                except Exception as trace_err:
                    logger.debug(f"Could not query MLflow traces: {trace_err}")

            # Check registered models
            try:
                model_versions = self.client.search_model_versions(f"name='{self.registered_model_name}'")
                if model_versions:
                    latest_version = max(model_versions, key=lambda v: int(v.version))
                    status_info["registered_model_version"] = latest_version.version
            except Exception as e:
                logger.debug(f"Could not query model registry: {e}")

        except Exception as e:
            logger.error(f"Error querying MLflow server: {e}")

        return status_info

    def log_training_run(
        self,
        params: Dict[str, Any],
        metrics: Dict[str, float],
        artifacts_dir: Optional[str] = None,
        register_candidate: bool = False
    ) -> Optional[str]:
        """Logs training run parameters, metrics, artifacts, and optionally registers the model."""
        if not self.is_connected():
            logger.warning(f"MLflow tracking server not reachable at {self.tracking_uri}. Logging run locally.")
            return None

        try:
            mlflow.set_tracking_uri(self.tracking_uri)
            mlflow.set_experiment(self.experiment_name)

            with mlflow.start_run() as run:
                run_id = run.info.run_id
                logger.info(f"Started MLflow run {run_id} for experiment '{self.experiment_name}'")

                # Log parameters
                for k, v in params.items():
                    mlflow.log_param(k, v)

                # Log metrics
                for k, v in metrics.items():
                    mlflow.log_metric(k, v)

                # Log artifacts if directory provided
                if artifacts_dir and os.path.exists(artifacts_dir):
                    mlflow.log_artifacts(artifacts_dir, artifact_path="model_artifacts")

                # Register model if candidate passed threshold
                if register_candidate and artifacts_dir and os.path.exists(artifacts_dir):
                    try:
                        model_uri = f"runs:/{run_id}/model_artifacts"
                        mlflow.register_model(model_uri, self.registered_model_name)
                        logger.info(f"Registered model '{self.registered_model_name}' to MLflow Model Registry")
                    except Exception as reg_err:
                        logger.warning(f"Model registration skipped: {reg_err}")

                return run_id
        except Exception as e:
            logger.error(f"Failed to log run to MLflow: {e}")
            return None

mlflow_service = MLflowService()
