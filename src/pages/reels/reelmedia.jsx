import { View } from "react-native";
import { Image as ExpoImage } from 'expo-image';

const ReelMedia = () => {

    return(
        <View style={{flex: 1}}>
            <ExpoImage
                source={{uri: 'https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/photos/2025/08/hafrik_d8a4ba410b30c9d947ceb043e3e77972.jpeg'}}
                style={{width: '100%', height: "100%", backgroundColor: '#000'}}
                contentFit="cover"
                cachePolicy="memory-disk"
            />
        </View>
    )
}


export default ReelMedia;