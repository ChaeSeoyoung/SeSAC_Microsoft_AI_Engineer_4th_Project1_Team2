import axios from "axios";

const SERVER = "http://localhost:5000";

export const getNearbyStops = async (gpsInfo, radius = 1000) => {
  try {
    const res = await axios.get(`${SERVER}/api/stops`, {
      params: {
        lat: gpsInfo.lat,
        lng: gpsInfo.lng,
        latitude: gpsInfo.latitude,
        longitude: gpsInfo.longitude,
        accuracy: gpsInfo.accuracy,
        altitude: gpsInfo.altitude,
        altitudeAccuracy: gpsInfo.altitudeAccuracy,
        heading: gpsInfo.heading,
        speed: gpsInfo.speed,
        timestamp: gpsInfo.timestamp,
        radius,
      },
    });

    return res.data;
  } catch (err) {
    console.error("주변 정류장 조회 오류:", err);
    return [];
  }
};

export const getBusArrival = async (arsId) => {
  try {
    const res = await axios.get(`${SERVER}/api/arrivals`, {
      params: {
        arsId,
      },
    });

    return res.data;
  } catch (err) {
    console.error("버스 도착 정보 오류:", err);
    return [];
  }
};