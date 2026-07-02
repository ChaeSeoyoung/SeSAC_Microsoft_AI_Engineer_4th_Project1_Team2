from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np

from update_model import update_model_if_needed
from ocr import extract_bus_number   # ✅ OCR 모듈 임포트

# 새롭게 작성한 모듈 임포트
from update_model import update_model_if_needed 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_bus_number(value):
    return str(value or "").replace(" ", "").replace("번", "")

# 초기 모델 로드 (경로는 실제 파일이 저장되는 위치에 맞게 수정 필요)
MODEL_PATH = "best.pt" 
model = YOLO(MODEL_PATH)

@app.get("/update-model")
async def trigger_model_update():
    global model
    
    result = update_model_if_needed()

    print("Checking for model updates...")
    if result.get("updated"):
        try:
            # 다운로드된 파일 경로가 있으면 그걸 사용
            print("Model update succeeded")
            model_path = result.get("model_file") or MODEL_PATH
            model = YOLO(model_path)
            result["message"] += " (서버 모델 리로드 완료)"
        except Exception as e:
            print("Model update failed")
            result["message"] += f" (하지만 리로드 실패: {e})"

    return result



@app.post("/detect-bus")
async def detect_bus(file: UploadFile = File(...), bus_number: str = Form(...)):
    contents = await file.read()
    np_img = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    results = model(img)
    has_bus = False
    match_found = False
    detected_numbers = []

    for r in results:
        for c in r.boxes.cls:
            class_name = model.names[int(c)]
            if class_name == "bus":
                has_bus = True
                _, encoded_img = cv2.imencode(".jpg", img)
                img_bytes = encoded_img.tobytes()
                detected_numbers = extract_bus_number(img_bytes)
            break

    target_bus = normalize_bus_number(bus_number)
    normalized_detected_numbers = [normalize_bus_number(number) for number in detected_numbers]
    print("Target bus number:", target_bus)
    print("Detected numbers:", normalized_detected_numbers)
    
    if target_bus in normalized_detected_numbers:
        match_found = True
    else:
        match_found = False
    print(f"Match found: {match_found}")
    return {
        "has_bus": has_bus,
        "detected_numbers": detected_numbers,
        "match_found": match_found
    }
