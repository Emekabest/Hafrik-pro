import { Dimensions, StyleSheet, View, StatusBar, Platform } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo, useState } from "react";
import AppDetails from "../../helpers/appdetails";
// import { StatusBar } from "expo-status-bar";


const { height: SCREEN_HEIGHT } = Dimensions.get("window");


const ReelCard = ({ reel }) => {
    console.log(reel.username)

    // const [username, setUsername] = useState(reel?.user.username);
    // const [textPost, setTextPost] = useState(reel?.text);
    // const [timeCreated, setTimeCreated] = useState(reel?.created);
    // const [caption, setCaption] = useState(reel?.text);

    


    return(
        <View style={styles.container}>
            <ReelMedia reelId={reel.id} media={ reel.media} />

            <ReelInteractionContainer 
                user={reel?.user} 
                created={reel?.created} 
                caption={reel?.text} 
                likesCount={reel?.likes_count}    
                commentCount={reel?.comments_count}
                views={reel?.views}
            />
        </View>
    )

}


const styles = StyleSheet.create({

    container:{
        height: Platform.OS === 'android' ? SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight : SCREEN_HEIGHT,
        width: '100%',
        backgroundColor: '#000000'
    }


})


const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelCard, handleMemomize);