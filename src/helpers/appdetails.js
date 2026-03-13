import { Dimensions, Platform } from "react-native";
import { link } from "superagent";
import { Colors, FontFamily } from "../theme";

const screenWidth = Dimensions.get("window").width;
// Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
const rightOffset = 15;
const imageWidth = screenWidth - leftOffset - rightOffset;

const baseUrl = "https://hafrik.com/api/v1";

const AppDetails = {

    primaryColor: Colors.primaryDark,
    bodyColor: Colors.black,
    linkColor: Colors.primary,
    borderLineColor: Colors.border,
    warningColor: Colors.warning,

    flatList:{
        scrollEventThrottle: 16,
        decelerationRate: Platform.OS === 'ios' ? 0.92 : 0.93,
    },

    apis:{
        // ── Unified feed endpoint ──────────────────────────────────────────
        feedApi:          `${baseUrl}/feed/list.php`,

        // Legacy aliases (still point to the unified endpoint for backward compat)
        recentUpdateApi:  `${baseUrl}/feed/list.php`,
        trendingApi:      `${baseUrl}/feed/list.php`,
        whatsnearbyApi:   `${baseUrl}/feed/nearby.php`,
        profileTimeline:  `${baseUrl}/users/profile_feed.php`,
    },

    headerHeight: 44,
    mainTabNavigatorHeight: 60,
    

    fontFamily:{
        redex:{
            regular: FontFamily.readexRegular,
            medium: FontFamily.readexMedium,
            semiBold: FontFamily.readexSemiBold,
            bold: FontFamily.readexBold,
        },
        worksans:{
            regular: FontFamily.workSansRegular,
            medium: FontFamily.workSansMedium,
            bold: FontFamily.workSansBold,
        },
        inter:{
            regular: FontFamily.interRegular,
            medium: FontFamily.interMedium,
            semiBold: FontFamily.interSemiBold,
            bold: FontFamily.interBold,
        },
        outfit:{
            regular: FontFamily.outfitRegular,
            medium: FontFamily.outfitMedium,
            semiBold: FontFamily.outfitSemiBold,
        },


        heading: FontFamily.readexBold,
        title: FontFamily.interBold,
        body: FontFamily.readexRegular,
        bodyItalic: FontFamily.interMediumItalic,

        marketingHeadline: FontFamily.workSansBold,
        marketingTagline: FontFamily.shadowsIntoLight,

    

    },

    feedSliderSizes:{
        leftOffset: leftOffset,
        rightOffset: rightOffset,
        imageWidth:  imageWidth,
    }

}

export default AppDetails;

