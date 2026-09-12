import { useEffect } from "react";
import * as Battery from "expo-battery";
import NetInfo from "@react-native-community/netinfo";
import * as Speech from "expo-speech";
import { useSettingsStore } from "@/store/settingsStore";

export function useSystemMonitor() {
  const { setBatteryLevel, setOnline, batteryMode, voiceLanguage } = useSettingsStore();

  useEffect(() => {
    // Battery monitoring
    let batterySubscription: Battery.Subscription | null = null;

    Battery.getBatteryLevelAsync().then((level) => {
      Battery.getBatteryStateAsync().then((state) => {
        const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
        setBatteryLevel(Math.round(level * 100), charging);
      });
    });

    batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      Battery.getBatteryStateAsync().then((state) => {
        const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
        const pct = Math.round(batteryLevel * 100);
        setBatteryLevel(pct, charging);

        if (pct === 25 && !charging) {
          const msg = voiceLanguage.startsWith("kn")
            ? "ಬ್ಯಾಟರಿ ಕಡಿಮೆ ಇದೆ. ಬ್ಯಾಟರಿ ಉಳಿತಾಯ ಮೋಡ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ."
            : "Battery is low. Battery saving mode has been enabled.";
          Speech.speak(msg, { language: voiceLanguage });
        }
        if (pct === 10 && !charging) {
          const msg = voiceLanguage.startsWith("kn")
            ? "ಬ್ಯಾಟರಿ ತುಂಬಾ ಕಡಿಮೆ ಇದೆ. ತುರ್ತು ಸೇವೆಗಳು ಮಾತ್ರ ಸಕ್ರಿಯವಾಗಿರುತ್ತವೆ."
            : "Battery critically low. Only emergency services remain active.";
          Speech.speak(msg, { language: voiceLanguage });
        }
      });
    });

    // Connectivity monitoring
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setOnline(online);
      if (!online) {
        const msg = voiceLanguage.startsWith("kn")
          ? "ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಇಲ್ಲ. ಮೂಲ ನ್ಯಾವಿಗೇಷನ್ ಸಹಾಯ ಸಕ್ರಿಯವಾಗಿದೆ."
          : "Internet connection unavailable. Basic navigation assistance is active.";
        Speech.speak(msg, { language: voiceLanguage });
      }
    });

    return () => {
      batterySubscription?.remove();
      unsubscribeNet();
    };
  }, [voiceLanguage]);

  return { batteryMode };
}
