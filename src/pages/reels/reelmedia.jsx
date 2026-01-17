import { View } from "react-native";
import { Image as ExpoImage } from 'expo-image';

const ReelMedia = ({media}) => {

    return(
        <View style={{flex: 1}}>
            <ExpoImage
                source={{uri: media.thumbnail}}
                style={{width: '100%', height: "100%", backgroundColor: '#000'}}
                contentFit="cover"
                cachePolicy="memory-disk"
            />
        </View>
    )
}


export default ReelMedia;