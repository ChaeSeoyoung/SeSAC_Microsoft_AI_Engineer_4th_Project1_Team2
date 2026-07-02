// 마이크 ON / OFF 알림음

export const playMicOnSound = () => {
  const audio = new Audio("/sounds/mic_on.mp3");
  audio.volume = 0.7;
  audio.play().catch(() => {});
};

export const playMicOffSound = () => {
  const audio = new Audio("/sounds/mic_off.mp3");
  audio.volume = 0.7;
  audio.play().catch(() => {});
};