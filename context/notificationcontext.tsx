import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerForPushNotificationsAsync } from "../utils/registerforpushnotificationasync";
import { navigate } from "../src/helpers/navigationRef";

const BASE_URL = "https://hafrik.com";

interface NotificationContextType {
  expoPushToken: string | null;
  devicePushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Route notification payload to the correct screen.
// Backend sends: data = { type: "post", id: "19066" }
// Legacy format:  data = { target: { type: "post", id: "19066" } }
function handleNotificationNavigation(data: Record<string, any> | null | undefined) {
  try {
    if (!data) return;

    // Resolve type + id from either format
    const type = String(
      data.type ?? data.target?.type ?? data.data?.type ?? ""
    ).toLowerCase();
    const id = data.id ?? data.target?.id ?? data.data?.id;

    if (!type || !id) return;

    if (["post", "post_comment", "reply_post", "comment_post"].includes(type)) {
      navigate("PostDetail", { postId: String(id) });
      return;
    }

    if (type === "message") {
      // id is the thread/conversation id
      navigate("ThreadScreen", { threadId: String(id) });
      return;
    }

    if (type === "profile") {
      navigate("UserProfile", { userId: String(id) });
      return;
    }
  } catch {}
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Register push token with backend as soon as we have it
  useEffect(() => {
    if (!expoPushToken) return;
    (async () => {
      try {
        const authToken = await AsyncStorage.getItem("hafrik_token");
        if (!authToken) return;
        await fetch(`${BASE_URL}/api/v1/notifications/register_push.php`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token: expoPushToken }),
        });
        console.log("✅ Push token registered with backend");
      } catch (e) {
        console.log("⚠️ Push token registration failed:", e);
      }
    })();
  }, [expoPushToken]);

  useEffect(() => {
    // Get Expo push token
    registerForPushNotificationsAsync().then(
      (token) => setExpoPushToken(token),
      (err) => setError(err),
    );

    // Get native device token
    Notifications.getDevicePushTokenAsync().then(
      (t) => {
        console.log({ devicePushToken: t });
        setDevicePushToken(t.data);
      },
      (err) => setError(err),
    );

    // Foreground: notification received while app is open
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notif) => {
        console.log("🔔 Notification Received:", notif);
        setNotification(notif);
      },
    );

    // Foreground + Background: user tapped a notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("🔔 Notification Tapped:", response);
        handleNotificationNavigation(
          response.notification.request.content.data as Record<string, any>,
        );
      });

    // Killed state: app was closed and opened via a notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      console.log("🔔 Killed-state notification tap:", response);
      handleNotificationNavigation(
        response.notification.request.content.data as Record<string, any>,
      );
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, devicePushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
