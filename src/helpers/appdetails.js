import { Dimensions, Platform } from "react-native";
import { link } from "superagent";

const screenWidth = Dimensions.get("window").width;
// Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
const rightOffset = 15;
const imageWidth = screenWidth - leftOffset - rightOffset;

const baseUrl = "https://hafrik.com/api/v1";

const AppDetails = {

    primaryColor: "#0C3F44",
    bodyColor: "#171717ff",
    linkColor: "#0b8557",
    borderLineColor: "rgb(235, 235, 235)",
    warningColor: "#fc7c5f",

    flatList:{
        scrollEventThrottle: 16,
        decelerationRate: Platform.OS === 'ios' ? 0.92 : 0.93,
    },

    apis:{
        recentUpdateApi:`${baseUrl}/feed/list.php`,
        trendingApi:`${baseUrl}/feed/trending.php`,
        whatsnearbyApi:`${baseUrl}/feed/nearby.php`,
        profileTimeline:`${baseUrl}/users/profile_feed.php`,
    },

    headerHeight: 50,
    mainTabNavigatorHeight: 60,
    

    fontFamily:{
        redex:{
            regular: "ReadexPro_400Regular",
            medium: "ReadexPro_500Medium",
            bold: "ReadexPro_700Bold",
        },
        worksans:{
            regular: "WorkSans_400Regular",
            medium: "WorkSans_500Medium",
            bold: "WorkSans_700Bold",
        },
        inter:{
            regular: "Inter_400Regular",
            medium: "Inter_500Medium",
            semiBold: "Inter_600SemiBold",
            bold: "Inter_700Bold",
        },
        outfit:{
            regular: "Outfit_400Regular",
            medium: "Outfit_500Medium",
            semiBold: "Outfit_600SemiBold",
        },


        heading: "ReadexPro_700Bold",
        title: "Inter_700Bold",
        body: "Inter_500Medium",
        bodyItalic:"Inter_500Medium_Italic",

    

    },

    feedSliderSizes:{
        leftOffset: leftOffset,
        rightOffset: rightOffset,
        imageWidth:  imageWidth,
    }

}

export default AppDetails;

