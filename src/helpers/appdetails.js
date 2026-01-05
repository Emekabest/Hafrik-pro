import { Platform } from "react-native";


const AppDetails = {

    primaryColor: "#0C3F44",

    flatList:{
        scrollEventThrottle: 16,

        decelerationRate: Platform.OS === 'ios' ? 0.8 : 0.9,
    }

    


}

export default AppDetails;

