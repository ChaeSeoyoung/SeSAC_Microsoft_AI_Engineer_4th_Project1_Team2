import os
import shutil
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

SUBSCRIPTION_ID = ""  ###### 실제 Azure 구독 ID로 변경 필요
RESOURCE_GROUP = "project-1st-team-2"
WORKSPACE_NAME = "team2_yolo"
MODEL_NAME = "YOLO11m"
DOWNLOAD_PATH = "."
LOCAL_VERSION_FILE = f"{DOWNLOAD_PATH}/version.txt"
BEST_MODEL_FILE = f"{DOWNLOAD_PATH}/best.pt"

def get_local_version():
    if os.path.exists(LOCAL_VERSION_FILE):
        with open(LOCAL_VERSION_FILE, "r") as f:
            return f.read().strip()
    return "0"

def update_model_if_needed():
    try:
        ml_client = MLClient(
            DefaultAzureCredential(),
            SUBSCRIPTION_ID,
            RESOURCE_GROUP,
            WORKSPACE_NAME
        )

        # 모든 버전 가져오기
        models = list(ml_client.models.list(name=MODEL_NAME))
        if not models:
            return {"updated": False, "message": "❌ 워크스페이스에 모델이 없습니다.", "model_file": None}

        # 가장 최신 버전 찾기 (숫자 기준)
        latest_model = max(models, key=lambda m: int(m.version))
        azure_version = int(latest_model.version)
        local_version = int(get_local_version())

        if local_version < azure_version:
            os.makedirs(DOWNLOAD_PATH, exist_ok=True)

            # 최신 모델 다운로드
            ml_client.models.download(
                name=MODEL_NAME,
                version=str(azure_version),
                download_path=DOWNLOAD_PATH
            )
            print("Downloaded to:", DOWNLOAD_PATH)

            # 다운로드된 폴더 안에서 모델 파일 찾기
            model_file = None
            for root, dirs, files in os.walk(DOWNLOAD_PATH):
                for f in files:
                    if f.endswith(".pt") or f.endswith(".onnx") or f.endswith(".pkl"):
                        src_path = os.path.join(root, f)
                        model_file = BEST_MODEL_FILE
                        shutil.move(src_path, model_file)  # 항상 best.pt로 덮어쓰기
                        break


            # version.txt 갱신
            with open(LOCAL_VERSION_FILE, "w") as f:
                f.write(str(azure_version))

            return {
                "updated": True,
                "message": f"✅ 모델이 최신 버전({azure_version})으로 업데이트 되었고 best.pt로 저장되었습니다.",
                "model_file": model_file or "unknown"
            }
        else:
            return {
                "updated": False,
                "message": f"✅ 이미 최신 모델({local_version})을 사용 중입니다.",
                "model_file": BEST_MODEL_FILE if os.path.exists(BEST_MODEL_FILE) else None
            }

    except Exception as e:
        return {"updated": False, "message": f"❌ 업데이트 중 오류 발생: {e}", "model_file": None}
