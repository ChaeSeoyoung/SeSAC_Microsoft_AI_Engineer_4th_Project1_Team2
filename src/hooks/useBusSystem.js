import { useState, useCallback } from "react";
import { getNearbyStops, getBusArrival } from "../api/busApi";
import { speak, stopTTS } from "./ttsService";


export const useBusSystem = () => {
  const [logs, setLogs] = useState([]);
  const [targetBus, setTargetBus] = useState("");
  const [nearestStation, setNearestStation] = useState(null);
  const [lastGpsInfo, setLastGpsInfo] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mode, setMode] = useState("idle");

  const addLog = useCallback((msg) => {
    setLogs((prev) => [msg, ...prev].slice(0, 30));
  }, []);

  const replaceNumbersWithKorean = (text) => {
    if (!text) return "";
    const nums = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const units = ["", "십", "백", "천"];
    return String(text).replace(/\d+/g, (numStr) => {
      const digits = numStr.split("").map(Number);
      const len = digits.length;
      let result = "";
      digits.forEach((n, i) => {
        const unitIndex = len - i - 1;
        if (n === 0) return;
        if (n === 1 && unitIndex > 0) result += units[unitIndex];
        else result += nums[n] + units[unitIndex];
      });
      return result || "영";
    });
  };

  const digitKoreanToNumber = (text) => {
    const source = String(text || "").replace(/\s/g, "").replace("번", "");
    const digitMatch = source.match(/\d+/);
    if (digitMatch) return digitMatch[0];
    const digitMap = { 공: "0", 영: "0", 일: "1", 이: "2", 삼: "3", 사: "4", 오: "5", 육: "6", 륙: "6", 칠: "7", 팔: "8", 구: "9" };
    let result = "";
    for (const ch of source) {
      if (digitMap[ch]) result += digitMap[ch];
      else return null;
    }
    return result || null;
  };

  const sinoKoreanToNumber = (text) => {
    const source = String(text || "").replace(/\s/g, "").replace("번", "");
    const digitMatch = source.match(/\d+/);
    if (digitMatch) return digitMatch[0];
    const nums = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 };
    const units = { 천: 1000, 백: 100, 십: 10 };
    let total = 0;
    let current = 0;
    let hasNumber = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (nums[ch]) {
        current = nums[ch];
        hasNumber = true;
      } else if (units[ch]) {
        total += (current || 1) * units[ch];
        current = 0;
        hasNumber = true;
      }
    }
    total += current;
    return hasNumber && total > 0 ? String(total) : null;
  };

  const parseBusNumber = (text) => {
    const source = String(text || "").trim();
    const digitMatch = source.match(/\d+\s*번?/);
    if (digitMatch) return digitMatch[0].replace(/\s/g, "").replace("번", "");
    return digitKoreanToNumber(source) || sinoKoreanToNumber(source);
  };

  const normalizeBusName = (value) => String(value || "").replace(/\s/g, "").replace("번", "").trim();
  const extractDigits = (value) => String(value || "").match(/\d+/)?.[0] || "";
  const getRouteName = (bus) => bus?.busRouteNm || bus?.rtNm || bus?.busRouteAbrv || bus?.routeName || "";
  const getArrivalMessage = (bus) => bus?.arrmsg1 || bus?.arrmsg2 || "도착 정보가 없습니다";

  const findTargetArrival = (arrivals, busNumber) => {
    if (!arrivals || arrivals.length === 0 || !busNumber) return null;
    const target = normalizeBusName(busNumber);
    const targetDigits = extractDigits(busNumber);
    const exact = arrivals.find((bus) => normalizeBusName(getRouteName(bus)) === target);
    if (exact) return exact;
    const digitMatched = arrivals.find((bus) => {
      const routeDigits = extractDigits(getRouteName(bus));
      return routeDigits && targetDigits && routeDigits === targetDigits;
    });
    if (digitMatched) return digitMatched;
    return arrivals.find((bus) => {
      const routeName = normalizeBusName(getRouteName(bus));
      if (!routeName || !target) return false;
      return routeName.includes(target) || target.includes(routeName);
    }) || null;
  };

  const safeSpeak = useCallback(async (text, startListening) => {
    if (!text) return;
    const converted = replaceNumbersWithKorean(text);
    setIsSpeaking(true);
    await speak(
      converted,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        if (typeof startListening === "function") setTimeout(() => startListening(), 300);
      }
    );
  }, []);

  const buildGpsInfo = (position) => ({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    altitudeAccuracy: position.coords.altitudeAccuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  });

  const getCurrentGpsInfo = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS를 지원하지 않는 브라우저입니다"));
        return;
      }
      addLog("📍 현재 GPS 정보 요청");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsInfo = buildGpsInfo(position);
          setLastGpsInfo(gpsInfo);
          addLog(`📍 GPS 수신: 위도 ${gpsInfo.lat.toFixed(6)}, 경도 ${gpsInfo.lng.toFixed(6)}, 정확도 ${Math.round(gpsInfo.accuracy || 0)}m`);
          resolve(gpsInfo);
        },
        (error) => {
          console.log("GPS 오류:", error);
          addLog(`⚠️ GPS 오류: ${error.message || "위치 확인 실패"}`);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  };

  const getNearbyStationsSortedFromApi = useCallback(async () => {
    try {
      const gpsInfo = await getCurrentGpsInfo();
      if (!gpsInfo || gpsInfo.lat === undefined || gpsInfo.lng === undefined) {
        addLog("❌ GPS 정보가 없어 주변 정류장을 조회할 수 없습니다");
        return [];
      }
      addLog(`📡 주변 정류장 목록 조회 시작: 위도 ${gpsInfo.lat.toFixed(6)}, 경도 ${gpsInfo.lng.toFixed(6)}`);
      const stops = await getNearbyStops(gpsInfo, 1000);
      addLog(`📡 주변 정류장 목록 결과: ${stops?.length || 0}개`);
      if (!stops || stops.length === 0) {
        addLog("⚠️ 주변 정류장이 없습니다");
        return [];
      }
      return [...stops].sort((a, b) => Number(a.dist ?? 999999) - Number(b.dist ?? 999999));
    } catch (error) {
      console.log("주변 정류장 목록 조회 오류:", error);
      addLog("⚠️ 주변 정류장 목록 조회 실패");
      return [];
    }
  }, [addLog]);

  const getNearestStationFromApi = useCallback(async () => {
    try {
      const sortedStops = await getNearbyStationsSortedFromApi();
      if (!sortedStops || sortedStops.length === 0) {
        setNearestStation(null);
        return null;
      }
      const nearest = sortedStops[0];
      setNearestStation(nearest);
      const stationName = nearest.name || nearest.stationNm || nearest.stNm || "정류장";
      const distance = Math.round(Number(nearest.dist || 0));
      addLog(`📍 선택된 가장 가까운 정류장: ${stationName} (${distance}m, ARS ${nearest.arsId || "-"})`);
      return nearest;
    } catch (error) {
      console.log("가장 가까운 정류장 선택 오류:", error);
      addLog("⚠️ 가장 가까운 정류장 선택 실패");
      return null;
    }
  }, [addLog, getNearbyStationsSortedFromApi]);

  const findNearestStationWithTargetBus = useCallback(
    async (busNumber) => {
      if (!busNumber) return { station: null, arrival: null, checkedCount: 0 };
      const nearbyStations = await getNearbyStationsSortedFromApi();
      if (!nearbyStations || nearbyStations.length === 0) return { station: null, arrival: null, checkedCount: 0 };

      const maxCheckCount = Math.min(nearbyStations.length, 10);
      for (let i = 0; i < maxCheckCount; i++) {
        const station = nearbyStations[i];
        if (!station || !station.arsId) continue;
        const stationName = station.name || station.stationNm || station.stNm || "정류장";
        const distance = Math.round(Number(station.dist || 0));
        addLog(`🔎 ${stationName} (${distance}m, ARS ${station.arsId})에서 ${busNumber}번 검색`);
        try {
          const arrivals = await getBusArrival(station.arsId);
          addLog(`🚌 ${stationName} 도착 정보 ${arrivals?.length || 0}개 확인`);
          if (!arrivals || arrivals.length === 0) continue;
          const targetArrival = findTargetArrival(arrivals, busNumber);
          if (targetArrival) {
            addLog(`✅ ${busNumber}번 발견: ${stationName} (${distance}m)`);
            return { station, arrival: targetArrival, checkedCount: i + 1 };
          }
        } catch (error) {
          console.log("정류장별 도착 정보 조회 오류:", error);
          addLog(`⚠️ ${stationName} 도착 정보 조회 실패`);
        }
      }
      return { station: null, arrival: null, checkedCount: maxCheckCount };
    },
    [getNearbyStationsSortedFromApi, addLog]
  );

  const classifyCommand = useCallback(
    (text) => {
      const value = String(text || "").trim();
      if (mode === "waitingBusNumber") {
        const busNumber = parseBusNumber(value);
        if (busNumber) return { type: "BUS_NUMBER_INPUT", busNumber };
        return { type: "IGNORE" };
      }
      if (value.includes("정류장") || value.includes("주변 정류장") || value.includes("주변정류장")) return { type: "STATION_SEARCH" };
      if (value.includes("버스 번호") || value.includes("버스번호") || value === "버스" || value.includes("버스 검색")) return { type: "BUS_SEARCH" };
      if (value.includes("도착")) return { type: "DETECT_BUS" };
      return { type: "IGNORE" };
    },
    [mode]
  );

  const announceStation = useCallback(
    async (startListening) => {
      const nearest = await getNearestStationFromApi();
      if (!nearest) {
        await safeSpeak("현재 위치의 GPS 정보를 가져오지 못해 주변 정류장을 찾지 못했습니다. 위치 권한을 확인해주세요", startListening);
        return;
      }
      const stationName = nearest?.name || nearest?.stationNm || "가까운";
      const distance = Math.round(Number(nearest?.dist || 0));
      try {
        const arrivals = await getBusArrival(nearest?.arsId);
        addLog(`🚌 ${stationName} 도착 정보: ${arrivals?.length || 0}개`);
        if (!arrivals || arrivals.length === 0) {
          //await safeSpeak(`${stationName} 정류장이 약 ${distance}미터 앞에 있습니다. 현재 도착 예정 버스 정보가 없습니다`, startListening);
          await safeSpeak(`버스 도착 정보를 가져왔습니다`, startListening);
          return;
        }
        const firstArrival = arrivals[0];
        const firstBusName = getRouteName(firstArrival) || "버스";
        const firstArrivalMsg = getArrivalMessage(firstArrival);
        //await safeSpeak(`${stationName} 정류장이 약 ${distance}미터 앞에 있습니다. 가장 먼저 도착하는 버스는 ${firstBusName} 버스이며, ${firstArrivalMsg}입니다`, startListening);
        await safeSpeak(`버스 도착 정보를 가져왔습니다`, startListening);
      } catch (error) {
        console.log("정류장 도착 정보 조회 오류:", error);
        //await safeSpeak(`${stationName} 정류장이 약 ${distance}미터 앞에 있습니다. 버스 도착 정보를 가져오지 못했습니다`, startListening);
        await safeSpeak(`버스 도착 정보를 가져오지 못했습니다`, startListening);
      }
    },
    [safeSpeak, getNearestStationFromApi, addLog]
  );

  const askBusNumber = useCallback(
    async (startListening) => {
      setMode("waitingBusNumber");
      await safeSpeak("검색할 버스 번호를 말씀해주세요", startListening);
    },
    [safeSpeak]
  );

  const selectBus = useCallback(
    async (busNumber, startListening) => {
      if (!busNumber) {
        await askBusNumber(startListening);
        return;
      }
      setTargetBus(busNumber);
      setMode("idle");
      addLog(`🚌 ${busNumber}번 선택`);

      const result = await findNearestStationWithTargetBus(busNumber);
      const station = result.station;
      const arrival = result.arrival;

      if (!station || !arrival) {
        //await safeSpeak(`${busNumber}번 버스를 선택했습니다. 현재 주변 정류장 ${result.checkedCount}곳을 확인했지만 ${busNumber}번 도착 정보를 찾지 못했습니다`, startListening);
        await safeSpeak(`${busNumber}번 버스를 선택했습니다.`, startListening);
        return;
      }

      setNearestStation(station);
      const stationName = station.name || station.stationNm || station.stNm || "정류장";
      const distance = Math.round(Number(station.dist || 0));
      const routeName = getRouteName(arrival) || busNumber;
      const arrivalMessage = getArrivalMessage(arrival);

      //await safeSpeak(`${routeName} 버스를 선택했습니다. 가장 가까운 탑승 가능 정류장은 ${stationName} 정류장이며, 현재 위치에서 약 ${distance}미터 떨어져 있습니다. ${arrivalMessage}`, startListening);
      await safeSpeak(`${routeName} 버스를 선택했습니다.`, startListening);
    },
    [addLog, safeSpeak, askBusNumber, findNearestStationWithTargetBus]
  );

  
  const captureImage = () => {
    const video = document.querySelector("video");
  
    if (!video || video.videoWidth === 0) {
      console.log("⚠️ 영상 아직 준비 안됨");
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    addLog(`📏 캡처 크기: ${video.videoWidth}x${video.videoHeight}`);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  };

  
  const detectBusArrival = useCallback(
    async (startListening) => {
      try {
        if (!targetBus) {
          await safeSpeak("먼저 버스 번호를 선택해주세요", startListening);
          return;
        }

        addLog("📷 카메라 캡처 시작");

        const imageBlob = await captureImage();
        if (!imageBlob) {
          await safeSpeak("카메라 이미지를 가져오지 못했습니다", startListening);
          return;
        }

        const formData = new FormData();
        formData.append("file", imageBlob, "capture.jpg");
        formData.append("bus_number", targetBus);

        addLog("📡 서버로 버스 감지 요청");

        const res = await fetch("http://localhost:8000/detect-bus", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        console.log(data);
        addLog(`🧠 감지 결과: ${JSON.stringify(data)}`);

        if (data.match_found) {
          await safeSpeak(`${targetBus}번 버스가 도착했습니다`, startListening);
        } else if (data.has_bus) {
          await safeSpeak(`버스는 있지만 ${targetBus}번은 아닙니다`, startListening);
        } else {
          await safeSpeak("버스를 발견하지 못했습니다", startListening);
        }

      } catch (err) {
        console.error(err);
        addLog("⚠️ 버스 감지 실패");
        await safeSpeak("버스 감지 중 오류가 발생했습니다", startListening);
      }
    },
    [targetBus, safeSpeak, addLog]
  );



  const handleVoiceCommand = useCallback(
    async (command, controls) => {
      const text = String(command || "").trim();
      if (!text) return;
      const result = classifyCommand(text);
      if (result.type === "IGNORE") {
        addLog(`↪️ 무시됨: ${text}`);
        return;
      }
      const startListening = controls?.startListening;
      const stopListening = controls?.stopListening;
      addLog(`🧭 명령 처리: ${text}`);
      stopTTS();
      if (typeof stopListening === "function") stopListening();
      if (result.type === "STATION_SEARCH") {
        await announceStation(startListening);
        return;
      }
      if (result.type === "BUS_SEARCH") {
        await askBusNumber(startListening);
        return;
      }
      if (result.type === "BUS_NUMBER_INPUT") {
        await selectBus(result.busNumber, startListening);
      }
      if (result.type === "DETECT_BUS") {
        await detectBusArrival(startListening);
        return;
      }
    },
    [addLog, classifyCommand, announceStation, askBusNumber, selectBus, detectBusArrival]
  );

  const handleUserInteraction = useCallback(
    async (startListening) => {
      //await safeSpeak("원하시는 기능을 말씀해주세요. 주변 정류장을 찾으려면 정류장이라고 말하고, 버스를 찾으려면 버스 번호라고 말해주세요", startListening);
      await safeSpeak("원하시는 기능을 말씀해주세요.", startListening);
    },
    [safeSpeak]
  );


  return {
    logs,
    targetBus,
    nearestStation,
    lastGpsInfo,
    isSpeaking,
    mode,
    addLog,
    handleUserInteraction,
    handleVoiceCommand,
  };
};
    