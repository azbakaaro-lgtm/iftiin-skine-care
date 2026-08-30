import { Platform, Alert as RNAlert } from "react-native";

type AlertButtonStyle = "default" | "cancel" | "destructive";

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

/**
 * Cross-platform alert/confirm dialog.
 *
 * React Native's built-in Alert.alert() does not render any UI on web
 * (react-native-web has no implementation for it), so any confirm flow
 * built on Alert.alert silently does nothing when the app runs in a
 * browser. This wraps it: native platforms keep the real native alert,
 * web falls back to window.alert/window.confirm.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === "cancel");
  const actionBtn = buttons.find((b) => b !== cancelBtn) ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
