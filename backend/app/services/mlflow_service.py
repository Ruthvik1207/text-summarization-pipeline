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
            host = parsed.hostname or "localhost"
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            with socket.create_connection((host, port), timeout=0.5):
                pass
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
            "runs_count": 0
        }

        if not connected or not self.client:
            return status_info

        try:
            exp = self.client.get_experiment_by_name(self.experiment_name)
            if exp:
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
