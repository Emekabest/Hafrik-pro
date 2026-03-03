

import React from 'react';
import { View, StyleSheet, Dimensions, Linking, Text } from 'react-native';
import YoutubeIframe from "react-native-youtube-iframe";
import { parseLinkFromText } from "../../../../../helpers/linkparser";
import AppDetails from '../../../../../helpers/appdetails';
import { Colors } from '../../../../../theme/colors';

const { width } = Dimensions.get('window');

const getYoutubeVideoId = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const CommentMediaLinkContent = ({ text }) => {
    const rawText = text || '';
    const { url } = parseLinkFromText(rawText);
    const videoId = url ? getYoutubeVideoId(url) : null;

    if (!videoId) return null;

    return (
        <View>
            <Text style={styles.url} onPress={()=> Linking.openURL(url)}>
                {url}
            </Text>
            <View style={styles.container}>
                <View style={styles.videoWrapper}>
                    <YoutubeIframe
                        videoId={videoId}
                        height={230}
                        width={width - 50} // slightly less than width to account for comment nesting/padding
                        webViewProps={{
                            androidLayerType: 'hardware', 
                            startInLoadingState: true
                        }}
                    />
                </View>
            </View>

        </View>
       
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: Colors.black, // Black background for video feel
        overflow: 'hidden',
        alignSelf: 'flex-start', // Don't stretch if not needed (though width is fixed)
    },
    videoWrapper: {
        backgroundColor: Colors.black,
    },
    url:{
        fontSize:15,
        fontFamily:AppDetails.fontFamily.body,
        color:AppDetails.linkColor,

    },
});

export default CommentMediaLinkContent;