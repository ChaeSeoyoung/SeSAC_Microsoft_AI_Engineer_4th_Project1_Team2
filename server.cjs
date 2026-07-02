const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ 여기에 발급받은 서울 버스 API 키 넣기
const SERVICE_KEY = "";

const BUS_API_BASE = "http://ws.bus.go.kr/api/rest";

function toArray(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function getServiceResult(data) {
  return data?.ServiceResult || data?.serviceResult || data;
}

// ✅ TTS API
// 현재는 프론트에서 fallback 브라우저 TTS를 쓰도록 JSON 반환
app.post("/api/tts", async (req, res) => {
  res.json({
    fallback: true
  });
});

// ✅ 현재 GPS 기준 주변 정류장 조회
app.get("/api/stops", async (req, res) => {
  const { lat, lng, radius = 500 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      error: "lat, lng 값이 필요합니다."
    });
  }

  try {
    const response = await axios.get(
      `${BUS_API_BASE}/stationinfo/getStationByPos`,
      {
        params: {
          serviceKey: SERVICE_KEY,
          tmX: lng,
          tmY: lat,
          radius,
          resultType: "json"
        }
      }
    );

    const service = getServiceResult(response.data);

    const headerCd =
      service?.msgHeader?.headerCd ||
      service?.msgHeader?.[0]?.headerCd?.[0];

    const headerMsg =
      service?.msgHeader?.headerMsg ||
      service?.msgHeader?.[0]?.headerMsg?.[0];

    if (headerCd && String(headerCd) !== "0") {
      return res.status(502).json({
        error: headerMsg || "버스 API 오류",
        raw: response.data
      });
    }

    const rawItems = toArray(service?.msgBody?.itemList);

    const stops = rawItems.map((item) => ({
      stationId: item.stationId,
      name: item.stationNm,
      stationNm: item.stationNm,
      arsId: item.arsId,
      lat: Number(item.gpsY),
      lng: Number(item.gpsX),
      dist: Number(item.dist || 0),
      stationTp: item.stationTp
    }));

    res.json(stops);
  } catch (err) {
    console.error("주변 정류장 API 오류:", err.response?.data || err.message);
    res.status(500).json({
      error: "주변 정류장 조회 실패"
    });
  }
});

// ✅ 정류장 ARS ID 기준 버스 도착 정보 조회
app.get("/api/arrivals", async (req, res) => {
  const { arsId } = req.query;

  if (!arsId) {
    return res.status(400).json({
      error: "arsId 값이 필요합니다."
    });
  }

  try {
    const response = await axios.get(
      `${BUS_API_BASE}/stationinfo/getStationByUid`,
      {
        params: {
          serviceKey: SERVICE_KEY,
          arsId,
          resultType: "json"
        }
      }
    );

    const service = getServiceResult(response.data);

    const headerCd =
      service?.msgHeader?.headerCd ||
      service?.msgHeader?.[0]?.headerCd?.[0];

    const headerMsg =
      service?.msgHeader?.headerMsg ||
      service?.msgHeader?.[0]?.headerMsg?.[0];

    if (headerCd && String(headerCd) !== "0") {
      return res.status(502).json({
        error: headerMsg || "버스 API 오류",
        raw: response.data
      });
    }

    const rawItems = toArray(service?.msgBody?.itemList);

    const arrivals = rawItems.map((item) => ({
      busRouteNm: item.rtNm || item.busRouteNm || item.busRouteAbrv,
      rtNm: item.rtNm || item.busRouteNm || item.busRouteAbrv,
      arrmsg1: item.arrmsg1 || "도착 정보 없음",
      arrmsg2: item.arrmsg2 || "",
      arsId: item.arsId,
      stNm: item.stNm || item.stnNm,
      busRouteId: item.busRouteId,
      plainNo1: item.plainNo1,
      plainNo2: item.plainNo2
    }));

    res.json(arrivals);
  } catch (err) {
    console.error("도착 정보 API 오류:", err.response?.data || err.message);
    res.status(500).json({
      error: "도착 정보 조회 실패"
    });
  }
});

app.listen(5000, () => {
  console.log("✅ Node 서버 실행: http://localhost:5000");
});