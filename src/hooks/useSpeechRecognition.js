import { useEffect, useRef, useState, useCallback } from "react";

// 마이크 켜기/끄기 효과음
import micOnSound from "../../sounds/mic_on.mp3";
import micOffSound from "../../sounds/mic_off.mp3"

export default function useSpeechRecognition({
  handleVoiceCommand,
  addLog
}) {
  const [micStatus, setMicStatus] = useState("off");

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  
  const playSound = (src) => {
    const audio = new Audio(src);
    audio.play().catch(() => {});
  };



  // ✅ 마이크 중지
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) return;

    try {
      playSound(micOffSound);  // ✅ 종료음
      recognition.abort();
    } catch (err) {
      // abort 중 오류는 무시
    }

    isListeningRef.current = false;
    setMicStatus("off");
  }, []);

  // ✅ 마이크 시작
  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) return;

    // 이미 듣는 중이면 다시 start 하지 않음
    if (isListeningRef.current) return;

    try {
      recognition.start();
      isListeningRef.current = true;
      playSound(micOnSound);   // ✅ 시작음
      setMicStatus("listening");
    } catch (err) {
      // 이미 실행 중일 때 발생하는 오류는 무시
      console.log("마이크 시작 무시 또는 실패:", err.message);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog && addLog("❌ 음성 인식을 지원하지 않는 브라우저입니다");
      setMicStatus("off");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setMicStatus("listening");
      addLog && addLog("🎤 마이크 ON");
    };

    recognition.onresult = async (event) => {
      try {
        const text = event.results?.[0]?.[0]?.transcript?.trim();

        if (!text) return;

        addLog && addLog(`🎤 인식: ${text}`);

        /**
         * ✅ 중요
         * 여기서는 TTS를 끊거나 마이크를 강제로 끊지 않습니다.
         * 
         * 명령인지 아닌지 판단은 useBusSystem.js의
         * handleVoiceCommand()에서 처리합니다.
         *
         * useBusSystem.js에서 설정된 명령일 때만:
         * - stopTTS()
         * - stopListening()
         * - 기능 실행
         * - 새 TTS 실행
         * - TTS 종료 후 startListening()
         * 흐름으로 처리됩니다.
         */
        if (handleVoiceCommand) {
          await handleVoiceCommand(text, {
            startListening,
            stopListening
          });
        }
      } catch (err) {
        console.log("음성 결과 처리 오류:", err);
      }
    };

    recognition.onerror = (event) => {
      const ignoredErrors = ["aborted", "no-speech"];

      if (!ignoredErrors.includes(event.error)) {
        console.log("음성 인식 오류:", event.error);
        addLog && addLog(`⚠️ 음성 오류: ${event.error}`);
      }

      isListeningRef.current = false;
      setMicStatus("off");
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setMicStatus("off");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (err) {
        // 컴포넌트 종료 시 오류 무시
      }

      isListeningRef.current = false;
      setMicStatus("off");
    };
  }, [handleVoiceCommand, addLog, startListening, stopListening]);

  return {
    micStatus,
    startListening,
    stopListening
  };
}