import { Platform } from "react-native";


const AppDetails = {

    primaryColor: "#0C3F44",

    flatList:{
        scrollEventThrottle: 16,

        decelerationRate: Platform.OS === 'ios' ? 0.92 : 0.90,
    }



}

export default AppDetails;

