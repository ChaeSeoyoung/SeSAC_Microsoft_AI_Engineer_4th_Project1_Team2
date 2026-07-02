import "./App.css";

import { useState, useEffect } from "react";
import { updateModel } from "./api/updateModel";
import { useBusSystem } from "./hooks/useBusSystem";
import useSpeechRecognition from "./hooks/useSpeechRecognition";
import CameraView from "./components/CameraView";
import GpsStatus from "./components/GpsStatus";

export default function App() {
  const [currentGps, setCurrentGps] = useState(null);

  const {
    targetBus,
    logs,
    addLog,
    isSpeaking,
    mode,
    handleUserInteraction,
    handleVoiceCommand,
  } = useBusSystem({
    gpsInfo: currentGps,
  });

  const { micStatus, startListening } = useSpeechRecognition({
    handleVoiceCommand,
    addLog,
  });

  const handleScreenClick = async () => {
    // ✅ TTS 중이면 클릭 무시
    if (isSpeaking) {
      return;
    }

    await handleUserInteraction(startListening);
  };

  // Version check and model update on app load
  const [modelStatus, setModelStatus] = useState(null);
  useEffect(() => {
    const init = async () => {
      const result = await updateModel();
      setModelStatus(result.message);
    };
    init();
  }, []);

  return (
    <div
      className="wrapper"
      onClick={handleScreenClick}
      style={{ pointerEvents: isSpeaking ? "none" : "auto" }}
    >
      <div className="container">
        <header className="header">
          <h1 className="title">🚌 Eco-Bus Guide</h1>
        </header>

        <div className="statusBar">
          <div className="statusBadge">📷 Camera ON</div>

          <div className="statusBadge">
            <GpsStatus
              addLog={addLog}
              onGpsUpdate={setCurrentGps}
            />
          </div>
        </div>

        <div className="cameraBox">
          <CameraView targetBus={targetBus ? `${targetBus}번` : ""} />
        </div>

        <div className="infoBox">
          ✨ 화면 터치 후 말해주세요
          <br />
          🎙️ “정류장” 또는 “주변 정류장”
          <br />
          🎙️ “버스” 또는 “버스 번호”
          <br />
            🎙️ “도착”
        </div>

        <div className="logBox">
          {logs?.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>

        <div className="micStatus">
          {micStatus === "listening" && "🎤 마이크 ON · 인식 대기"}
          {micStatus === "off" && "🔇 마이크 OFF"}
        </div>

        <div className="micStatus">
          {isSpeaking ? "🔊 TTS 안내 중" : "✅ TTS 대기"}
        </div>

        <div className="micStatus">현재 모드: {mode}</div>
      </div>
    </div>
  );
}
