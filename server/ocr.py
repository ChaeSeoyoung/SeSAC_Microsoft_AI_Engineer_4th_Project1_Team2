import io
import re
import numpy as np
import platform
from PIL import ImageFont, ImageDraw, Image
from matplotlib import pyplot as plt

import cv2
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials

AZURE_ENDPOINT = "https://team2-ocr.cognitiveservices.azure.com/"
AZURE_KEY = "" ###### 실제 Azure Computer Vision 키로 변경 필요

# 클라이언트 초기화
computervision_client = ComputerVisionClient(
    AZURE_ENDPOINT,
    CognitiveServicesCredentials(AZURE_KEY)
)

def extract_bus_number(image_bytes):
    """
    Azure Computer Vision SDK를 사용해 이미지에서 숫자 텍스트를 추출합니다.
    """
    # 이미지 바이트를 스트림으로 변환
    image_stream = io.BytesIO(image_bytes)

    # OCR 호출 (Read API)
    read_response = computervision_client.read_in_stream(image_stream, raw=True)

    # operation-location 헤더에서 작업 ID 추출
    operation_location = read_response.headers["Operation-Location"]
    operation_id = operation_location.split("/")[-1]

    # 결과가 나올 때까지 폴링
    while True:
        result = computervision_client.get_read_result(operation_id)
        if result.status not in ["notStarted", "running"]:
            break

    numbers = []
    if result.status == OperationStatusCodes.succeeded:
        for page in result.analyze_result.read_results:
            for line in page.lines:
                text = line.text.strip()
                if text.isdigit():
                    numbers.append(text)
        print("Numbers extracted from image:", numbers)

    return numbers
