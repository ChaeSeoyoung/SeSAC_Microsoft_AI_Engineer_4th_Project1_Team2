코드 실행을 위한 라이브러리 설치와 Azure 환경 설정 방법입니다.
Git, React 세팅은 이미 완료되었다는 전제에서 작성했습니다.

## 1. 기본 라이브러리 설치

```powershell
pip install fastapi uvicorn ultralytics python-multipart opencv-python numpy
pip install azure-ai-ml azure-identity --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
```

## 2. Azure CLI 설치 및 로그인

Azure CLI가 없으면 먼저 설치합니다.

```powershell
winget install -e --id Microsoft.AzureCLI
```

설치 후 Azure에 로그인합니다.

```powershell
az login
```

## 3. Azure 정보 확인

### 3-1. 구독 ID 확인

`update_model.py`의 다음 값을 실제 구독 ID로 교체해야 합니다.

```python
SUBSCRIPTION_ID = "YOUR_SUBSCRIPTION_ID"  # 실제 Azure 구독 ID로 변경 필요
```

구독 ID는 아래 명령으로 확인합니다.

```powershell
az account show --query id --output tsv
```

### 3-2. 리소스 그룹 확인

```powershell
az group list --query "[].name" --output tsv
```

### 3-3. 워크스페이스 목록 확인

```powershell
az ml workspace list --resource-group "project-1st-team-2"
```

### 3-4. 모델 목록 확인

```powershell
az ml model list --workspace-name team2_yolo --resource-group project-1st-team-2 --query "[].{name:name, version:version}" --output table
```


# App.js 실행하기
```powershell
npm start
```

# App.js 실행하기
```powershell
cd server
python -m uvicorn main:app --reload
```

### 4-1. OCR을 위한 환경 세팅

```powershell
pip install opencv-contrib-python
pip install azure-cognitiveservices-vision-computervision
```

### 4-2. Microsoft Azure - OCR 연동

Azure 포털의 Computer Vision (team2-ocr) > 개요 > 키 및 엔드포인트에 '키1', '키2' 가 있습니다. ocr.py에 키값 복붙해 넣으면 됩니다.