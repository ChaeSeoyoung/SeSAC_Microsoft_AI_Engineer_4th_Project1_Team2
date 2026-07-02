let currentAudio = null;

export function stopTTS() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  } catch (err) {
    console.log("TTS 중단 오류:", err);
  }
}

function browserTts(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1;

    utter.onend = resolve;
    utter.onerror = resolve;

    speechSynthesis.speak(utter);
  });
}

export function speak(text, onStart, onEnd) {
  return new Promise(async (resolve) => {
    try {
      if (!text) {
        onEnd && onEnd();
        resolve();
        return;
      }

      stopTTS();

      onStart && onStart();

      const res = await fetch("http://localhost:5000/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const contentType = res.headers.get("content-type") || "";

      // 서버가 fallback JSON을 주는 경우
      if (!res.ok || contentType.includes("application/json")) {
        await browserTts(text);
        onEnd && onEnd();
        resolve();
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      currentAudio = audio;

      audio.onended = () => {
        onEnd && onEnd();
        resolve();
      };

      audio.onerror = async () => {
        await browserTts(text);
        onEnd && onEnd();
        resolve();
      };

      audio.play().catch(async () => {
        await browserTts(text);
        onEnd && onEnd();
        resolve();
      });
    } catch (err) {
      console.log("TTS 오류:", err);
      await browserTts(text);
      onEnd && onEnd();
      resolve();
    }
  });
}