import { useEffect, useRef } from "react";

export default function CameraView({ targetBus }) {

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {

    const startCamera = async () => {

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

      } catch (err) {
        console.error("카메라 오류:", err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };

  }, []);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "300px"
    }}>

      {/* ✅ 카메라 영상 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />

      {/* ✅ 텍스트 (강화 UI) */}
      <div style={{
        position: "absolute",
        top: "10px",
        left: "10px",

        /* ✅ 핵심 포인트 */
        backgroundColor: "rgba(0, 0, 0, 0.6)",   // 반투명 검정
        padding: "8px 12px",
        borderRadius: "10px",

        color: "#ffffff",
        fontWeight: "bold",
        fontSize: "14px",

        /* ✅ 글자 더 잘 보이게 */
        textShadow: "1px 1px 3px rgba(0,0,0,0.8)"
      }}>
        📷 Camera ON <br />
        🎯 목표: {targetBus || "없음"}
      </div>

    </div>
  );
}