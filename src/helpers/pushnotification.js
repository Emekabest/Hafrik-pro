import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";


const registerForPushNotificationsAsync = async () => {

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }


  if (Device.isDevice) {

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {

      alert("Permission not granted!");
      return;
    }

    try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
          console.log("Checking device for push notification support...");


        console.log("EXPO PUSH TOKEN:", token);

    return token;

    } catch (error) {
        console.log("Error getting push token:", error);
    }




  } else {
    alert("Use a physical device for notifications");
  }
}

export { registerForPushNotificationsAsync };