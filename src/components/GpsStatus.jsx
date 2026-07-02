import { useState, useEffect } from "react";

export default function GpsStatus({ addLog, onGpsUpdate }) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("off");
      addLog && addLog("❌ GPS 지원 안됨");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const gpsInfo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };

        setCoords(gpsInfo);
        setStatus("active");

        // ✅ 핵심: App.jsx로 원본 GPS 전체 데이터 전달
        if (typeof onGpsUpdate === "function") {
          onGpsUpdate(gpsInfo);
        }
      },
      (err) => {
        console.log("GPS 오류:", err);
        setStatus("off");
        addLog && addLog(`⚠️ GPS 오류: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [addLog, onGpsUpdate]);

  if (status === "loading") {
    return <span>📍 위치 수신중...</span>;
  }

  if (status === "off") {
    return <span>📍 GPS OFF</span>;
  }

  return (
    <span>
      📍 수신됨
      <br />
      경도: {coords.lng.toFixed(2)} / 위도: {coords.lat.toFixed(2)}
    </span>
  );
}