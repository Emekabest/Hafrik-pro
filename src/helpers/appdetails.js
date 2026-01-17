import { Platform } from "react-native";

const baseUrl = "https://api.hafrik.com/v1/";

const AppDetails = {

    primaryColor: "#0C3F44",

    flatList:{
        scrollEventThrottle: 16,

        decelerationRate: Platform.OS === 'ios' ? 0.92 : 0.93,
    },

    APIs:{
        recentUpdates: `${baseUrl}/feed/list.php`,
    },

    mainTabNavigatorHeight: 60,



}

export default AppDetails;

