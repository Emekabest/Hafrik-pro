import { Ionicons } from "@expo/vector-icons";
import {Image, StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Alert, ActivityIndicator, Animated, TextInput, Button, FlatList } from "react-native";
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef, useEffect, memo } from "react";
import AppDetails from "../../../helpers/appdetails";
import CalculateElapsedTime from "../../../helpers/calculateelapsedtime";
import EngagementBar from "./feedcardproperties/engagementbar.jsx";
import ShareModal from "./share";
import { Image as ExpoImage } from "expo-image";
import { getPlayer } from './videoRegistry';
import OptionsModal from "./options";
import SvgIcon from "../../../assl.js/svg/svg";
import useStore from "../../../repository/store";
import PostContent from "./feedcardproperties/postcontent.jsx";




const aspectRatioCache = new Map();
const MEDIA_HEIGHT = 470;
const MEDIA_WIDTH = 240;


// Post content handled in ./feedcardproperties/postcontent.jsx



//MAIN CARD.........................................................
const FeedCard = ({ feed, currentPlayingId, setCurrentPlayingId, isFocused })=>{
    const navigation = useNavigation();
    const [isMuted, setIsMuted] = useState(false);
    const [showProfileOptions, setShowProfileOptions] = useState(false);
    const [showPostOptions, setShowPostOptions] = useState(false); 
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });


    // console.log("This is currentId", currentPlayingId)

    const maxFeedTextLength = 200;
    const [isExpanded, setIsExpanded] = useState(false);
    const hasMedia = (feed.media && feed.media.length > 0) || ['video', 'reel', 'shared', 'product', 'article', 'poll'].includes(feed.type);
    const shouldTruncate = hasMedia && feed.text && feed.text.length > maxFeedTextLength && !isExpanded;

    
    
    const iconRef = useRef(null);

    const screenWidth = Dimensions.get("window").width;
    // Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
    const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
    const rightOffset = 15;
    const imageWidth = screenWidth - leftOffset - rightOffset;

    const handleOpenOptions = () => {
        iconRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({ top: y + height, left: x });
            setShowProfileOptions(true);
        });
    };

    

    const handleSaveImage = () => {
        // To implement actual saving, you would typically use expo-media-library and expo-file-system

        // Alert.alert("Save Image", "Image saved to gallery!");
    };



    



    const getActionText = () => {
        if (feed.type === 'product') {
            return " added product for sale";
        }
        if (feed.type === 'article') {
            return " added a blog";
        }
        if (feed.type === 'poll') {
            return " created a poll";
        }
        if (feed.type === 'profile_picture') {
            return " updated the profile picture";
        }
        if (feed.type === 'profile_cover') {
            return " updated the cover photo";
        }
        if (feed.type === 'video'){
            return " added a video";
        }
        if (feed.type === 'reel'){
            return " added a reel";
        } 
        if (feed.media && feed.media.length > 0) {
            const isVideo = feed.type === 'video' || feed.type === 'reel';
            if (!isVideo) {
                const count = feed.media.length;
                return ` added ${count} photo${count > 1 ? 's' : ''}`;
            }
        }
        if (feed.type === 'shared') return " shared a post";
        return "";
    };


    return(
        <View style = {styles.container}>
            <View style = {styles.containerLeft}>
                <View style = {styles.ProfileContainer}>
                    <View style = {styles.ImageContainer}>
                        <ExpoImage
                            source={{uri:feed.user.avatar}}
                            style={{height:"100%", width:"100%"}}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />

                    </View>
                    <TouchableOpacity 
                        ref={iconRef}
                        activeOpacity={1} 
                        style = {[styles.profileIconContainer, {backgroundColor:AppDetails.primaryColor}]} 
                        onPress={handleOpenOptions}
                    >
                            <Ionicons name="add" size={16} style={{color:"#fff", fontWeight:"bold"}} />
                    </TouchableOpacity>

                    <Modal
                        visible={showProfileOptions}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowProfileOptions(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowProfileOptions(false)}>
                            <View style={styles.modalOverlay}>
                                <View style={[styles.profileOptionsModal, { top: menuPosition.top, left: menuPosition.left }]}>
                                    <TouchableOpacity style={styles.profileOptionItem} onPress={() => setShowProfileOptions(false)}>
                                        <Text style={styles.profileOptionText}>Visit Profile</Text>
                                    </TouchableOpacity>
                                    <View style={styles.divider} />
                                    <TouchableOpacity style={styles.profileOptionItem} onPress={() => setShowProfileOptions(false)}>
                                        <Text style={styles.profileOptionText}>Follow</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>

                </View>
            </View>


            <View style = {styles.containerRight}>
                <View style = {styles.firstSection}>
                    <View style = {styles.nameSection}>
                        <Text style={{marginBottom: 4, flexWrap: 'wrap'}}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style = { {color:"#000", fontFamily:"WorkSans_600SemiBold"}}>{feed.user.full_name}</Text>
                            {
                                feed.user.verified ? (
                                    <View style={{ transform: [{ translateY: 6}, { translateX: 2 }], marginHorizontal: 3, marginRight:5 }}>
                                        <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                                    </View>
                                ) : null
                            }
                            <Text style={{fontSize: 12, color: 'gray', fontFamily:"WorkSans_400Regular" }}> @{feed.user.username}</Text>
                            <Text style={{color: "#333", fontFamily:"WorkSans_400Regular"}}>{getActionText()}</Text>
                        </Text>
                        <Text style = {{color:"#787878ff", fontSize: 12, fontFamily:"WorkSans_400Regular"}}>{CalculateElapsedTime(feed.created)}</Text>
                    </View>


                    <TouchableOpacity style = {styles.options} onPress={() => setShowPostOptions(true)}>
                        <Ionicons name="ellipsis-horizontal" size={20} style={{color:"#333", fontWeight:"bold"}} />
                    </TouchableOpacity>
                </View>



                {feed.text ? (
                    <TouchableOpacity onPress={() => navigation.navigate('CommentScreen', {feedId: feed.id})} activeOpacity={1} style={styles.textSection}>
                        <Text style = {{fontSize:14, color:"#000", fontFamily:"WorkSans_400Regular"}}>
                            {(feed.text && feed.text.length > maxFeedTextLength && !isExpanded) ? `${feed.text.substring(0, maxFeedTextLength)}...` : feed.text}
                            {(feed.text && feed.text.length > maxFeedTextLength) && (
                                <Text onPress={() => setIsExpanded(prev => !prev)} style={{ color: '#787878', fontWeight: '600' }}>
                                    {isExpanded ? ' See less' : ' See more'}
                                </Text>
                            )}
                        </Text>
                    </TouchableOpacity>
                ) : <View style = {styles.textSection} />}



                <PostContent 
                    feed={feed}
                    imageWidth={imageWidth}
                    leftOffset={leftOffset}
                    rightOffset={rightOffset}
                    onImagePress={setFullScreenImage}
                    currentPlayingId={currentPlayingId}
                    setCurrentPlayingId={setCurrentPlayingId}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    isFocused={isFocused}
                />



                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 2 }}>
                    <Ionicons name="eye-outline" size={16} style={{color:"#787878ff", marginRight: 4}} />
                    <Text style={{ fontSize: 12, color: "#787878ff", fontFamily:"WorkSans_400Regular" }}>{feed.views}</Text>
                </View>


                <EngagementBar
                    feedId={feed.id}
                    initialLiked={!!feed.liked}
                    initialLikeCount={parseInt(feed.likes_count) || 0}
                    commentsCount={feed.comments_count}
                    onOpenShare={() => setShowShareOptions(true)}
                    onCommentPress={() => navigation.navigate('CommentScreen', { feedId: feed.id })}
                />
            </View>

            <OptionsModal visible={showPostOptions} postId={feed.id} onClose={() => setShowPostOptions(false)} />

            <ShareModal visible={showShareOptions} onClose={() => setShowShareOptions(false)} feed={feed} />

            <Modal visible={!!fullScreenImage} transparent={true} onRequestClose={() => setFullScreenImage(null)} animationType="fade">
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveImage}>
                        <Ionicons name="download-outline" size={30} color="white" />
                    </TouchableOpacity>
                    <ExpoImage source={{uri: fullScreenImage}} style={styles.fullScreenImage} contentFit="contain" />
                </View>
            </Modal>

        </View>
    )


}



const styles = StyleSheet.create({

    container:{
        borderTopWidth:1,
        borderTopColor:"#efefefff",
        // minHeight:150,
        width:"100%",
        padding:10,  
        display:"flex",
        flexDirection:"row",
    },

    containerLeft:{
        height:"100%",
        width:"13%",
    },


    containerRight:{
        height:"100%",
        width:"87%",
        paddingHorizontal:5,
        // backgroundColor:"#b8b058ff"

    },

    firstSection:{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        // backgroundColor:"#929292ff"
        // alignItems:"center",
    },

    nameSection:{
        width:"80%",
        display:"flex",
        flexDirection:"column",
        justifyContent: "center",
    },

    options:{
        width:"20%",
        display:"flex",
        alignItems:"flex-end",
    },

    textSection:{
        paddingVertical:5,

    },

    mediaSection:{
        // width:"80%",
        // width:"100%",
        // borderRadius:10,
        overflow:"hidden",
        backgroundColor:'#b1aaaaff'
    },

    engagementBar:{
        height:30,
        width:"80%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        marginTop:10,

    },

    engagementBarViews:{
        height:"100%",
        width:"20%",
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        // backgroundColor:"#468137ff"
    },

    engagementCount:{
        fontSize:13,
        fontFamily:"WorkSans_400Regular",
        color:"#333",
        marginLeft: 3
    },
    
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    saveButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },

    ProfileContainer:{
        height:70,
        width:"100%",
    },


    ImageContainer:{
        height:50,
        width:"100%",
        borderRadius:50,
        overflow:"hidden",
        backgroundColor:"#e9e9e9ff"
    },

    profileIconContainer:{
        height:20,
        width:20,
        borderRadius:50,
        right:0,
        bottom:20,
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        position:"absolute",
        backgroundColor:"#a38080ff"

    },

    profileOptionsModal: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 8,
        width: 130,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
    },
    profileOptionItem: {
        padding: 12,
        justifyContent: 'center',
    },
    profileOptionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sharedPostContainer: {
        borderWidth: 1, 
        borderColor: '#e0e0e0', 
        borderRadius: 10, 
        marginTop: 10, 
        padding: 10,
        overflow: 'hidden' 
    },
    videoOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    playButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 30,
        padding: 10,
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
    },

})



export default React.memo(FeedCard, (prev, next) => {
    // Determine whether the currentPlayingId refers to this feed.
    const isPlayingForFeed = (playingId, feedId) => {
        if (!playingId || !feedId) return false;
        // play ids are emitted like `${feed.id}_video_0` or `${feed.id}_shared`
        return String(playingId).startsWith(`${feedId}_`);
    };

    const prevShouldPlay = isPlayingForFeed(prev.currentPlayingId, prev.feed.id) && prev.isFocused;
    const nextShouldPlay = isPlayingForFeed(next.currentPlayingId, next.feed.id) && next.isFocused;

    return (
        prev.feed.id === next.feed.id &&               // same post
        prev.feed.likes === next.feed.likes &&         // no like change
        prev.feed.comments === next.feed.comments &&   // no comment change
        prevShouldPlay === nextShouldPlay              // playback didn't change
    );
});