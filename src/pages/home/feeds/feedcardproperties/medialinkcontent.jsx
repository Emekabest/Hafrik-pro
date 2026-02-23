import { ActivityIndicator, Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import YoutubeIframe from "react-native-youtube-iframe";
import pharseLinkFromText from "../../../../helpers/linkparser"
import { getYoutubeVideoId, getYoutubeThumbnail } from "../../../../helpers/youtubeIframe";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import AppDetails from "../../../../helpers/appdetails";


const MediaLinkContent = ({ text }) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const { url } = pharseLinkFromText(text || '');
  const urlId = url ? getYoutubeVideoId(url) : null;

  const thumbnailObj = getYoutubeThumbnail(urlId);
  const thumbnailUrl =
    thumbnailObj?.low || thumbnailObj?.high || thumbnailObj?.max || null;

  const handlePress = () => {
    // 1️⃣ Show iframe
    setShowPlayer(true);

    // 2️⃣ Give iframe time to mount, then request play
    setTimeout(() => {
      setShouldPlay(true);
    }, 100);
  };

  return (
    <View>
        <Text style={styles.url} onPress={()=> Linking.openURL(url)}>
            {url}
        </Text>
        <View style={styles.container}>
        {!showPlayer && (
            <View>
            <ExpoImage
                source={thumbnailUrl}
                style={{ height: "100%", width: "100%" }}
                contentFit="cover"
            />

            <View style={styles.playButtoncontainerOverlay}>
                <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
                <ExpoImage
                    source={require("../../../../assl.js/youtube_logo.png")}
                    style={{ height: 50, width: 60 }}
                    contentFit="contain"
                />
                </TouchableOpacity>
            </View>
            </View>
        )}

        {showPlayer && (
            <View style={{ flex: 1 }}>
            <YoutubeIframe
                videoId={urlId}
                height={"100%"}
                width="100%"
                play={shouldPlay}
                onReady={() => {
                setShouldPlay(true);
                }}
                onChangeState={(state) => {
                if (state === "playing") {
                    setIsBuffering(false);
                }
                }}
            />

            {isBuffering && (
                <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#fff" />
                </View>
            )}
            </View>
        )}
        </View>
    </View>
    
  );
};


const styles = StyleSheet.create({

    container: {
        marginVertical: 10,
        aspectRatio: 16 / 9, 
        overflow: "hidden", 
        width: "100%", 
        borderRadius:15, 
        backgroundColor: "#000" 
    },

    playButtoncontainerOverlay:{
        height:"100%",
        width:"100%",
        position:"absolute",
        alignItems:"center",
        justifyContent:"center",
        backgroundColor:"rgba(0, 0, 0, 0.12)",
    },

    url:{
        fontSize:15,
        fontFamily:AppDetails.fontFamily.body,
        color:AppDetails.linkColor,

    },

})

export default MediaLinkContent;
