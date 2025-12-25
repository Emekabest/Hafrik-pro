import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Alert } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useEffect, memo } from "react";
import AppDetails from "../../../helpers/appdetails";
import CalculateElapsedTime from "../../../helpers/calculateelapsedtime";


const FeedImageItem = memo(({ uri, targetHeight, maxWidth, marginRight, onPress }) => {
    const [width, setWidth] = useState(maxWidth);

    useEffect(() => {
        Image.getSize(uri, (w, h) => {
            const aspectRatio = w / h;
            const calculatedWidth = targetHeight * aspectRatio;
            setWidth(Math.min(calculatedWidth, maxWidth));
        }, (error) => console.log(error));
    }, [uri, targetHeight, maxWidth]);


    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            <Image
                source={{ uri: uri }}
                style={{
                    height: "100%",
                    width: width,
                    marginRight: marginRight,
                    borderRadius: 10,
                }}
                resizeMode="contain"
            />
        </TouchableOpacity>
    );
});

const FeedCard = ({ feed })=>{
    const navigation = useNavigation();
    const [showProfileOptions, setShowProfileOptions] = useState(false);
    const [showPostOptions, setShowPostOptions] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [aspectRatio, setAspectRatio] = useState(null);
    const [mediaWidth, setMediaWidth] = useState(0);
    const iconRef = useRef(null);

    const screenWidth = Dimensions.get("window").width;
    // Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
    const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
    const rightOffset = 15;
    const imageWidth = screenWidth - leftOffset - rightOffset;

    const isMultiMedia = feed.media && feed.media.length > 1;

    useEffect(() => {
        if (feed.media && feed.media.length > 0) {
            Image.getSize(feed.media[0].url, (width, height) => {
                setAspectRatio((width / height));
            }, (error) => console.log(error));
        }
    }, [feed.media]);

    const handleOpenOptions = () => {
        iconRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({ top: y + height, left: x });
            setShowProfileOptions(true);
        });
    };

    const handleSaveImage = () => {
        // To implement actual saving, you would typically use expo-media-library and expo-file-system
        Alert.alert("Save Image", "Image saved to gallery!");
    };


    console.log(feed.type)



    
    return(
        <View style = {styles.container}>
            <View style = {styles.containerLeft}>
                <View style = {styles.ProfileContainer}>
                    <View style = {styles.ImageContainer}>
                        <Image
                            source={{uri:feed.user.avatar}}
                            style={{height:"100%", width:"100%"}}
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
                    <View style = {styles.usernameSection}>
                        <View style = {styles.username}>
                            <Text style = {{color:"#333", fontWeight:"bold"}}>{feed.user.username}</Text>
                        </View>
                        <View style = {styles.elapsed}>
                            <Text style = {{color:"#787878ff"}}>{CalculateElapsedTime(feed.created)}</Text>
                        </View>
                    </View>


                    <TouchableOpacity style = {styles.options} onPress={() => setShowPostOptions(true)}>
                        <Ionicons name="ellipsis-horizontal" size={20} style={{color:"#333", fontWeight:"bold"}} />
                    </TouchableOpacity>
                </View>

                <View style={styles.textSection}>
                    <Text>{feed.text}</Text>
                </View>


                {

                    feed.media.length > 0 ?

                        <View 
                            style = {[
                                styles.mediaSection,
                                { height: isMultiMedia ? 250 : (aspectRatio ? imageWidth / aspectRatio : 240) },
                                { width: screenWidth, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
                            ]}
                            onLayout={(event) => setMediaWidth(event.nativeEvent.layout.width)}
                        >
                            {mediaWidth > 0 ? (
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                                >
                                    {feed.media.map((item, index) => (
                                        <FeedImageItem
                                            key={index}
                                            uri={item.url}
                                            targetHeight={isMultiMedia ? 250 : (aspectRatio ? imageWidth / aspectRatio : 240)}
                                            maxWidth={imageWidth}
                                            marginRight={10}
                                            onPress={() => setFullScreenImage(item.url)}
                                        />
                                    ))}
                                </ScrollView>
                            ) : (
                                <TouchableOpacity onPress={() => setFullScreenImage(feed.media[0].url)} activeOpacity={0.9} style={{flex: 1}}>
                                    <Image
                                        source={{uri:feed.media[0].url}}
                                        style={{height:"100%", width: imageWidth, marginLeft: leftOffset, borderRadius: 10}}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                    :

                        <View />
                }


                <View style = {styles.engagementBar}>
                    <TouchableOpacity style = {[styles.likeSection, styles.engagementBarViews]}>
                        <Ionicons name="heart-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>{feed.likes_count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.commentSection, styles.engagementBarViews]} onPress={() => navigation.navigate('CommentScreen')}>
                        <Ionicons name="chatbubble-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>{feed.comments_count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.repostSection, styles.engagementBarViews]}>
                        <Ionicons name="eye-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>{feed.views}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.shareSection, styles.engagementBarViews]}>
                        <Ionicons name="paper-plane-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>29</Text>
                    </TouchableOpacity>
                </View>
            </View>


            <Modal
                visible={showPostOptions}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPostOptions(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowPostOptions(false)}>
                    <View style={styles.bottomSheetContainer}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={styles.bottomSheetContent}>
                                <View style={styles.bottomSheetHandle} />
                                <Text style={styles.bottomSheetTitle}>Options</Text>
                                
                                <TouchableOpacity style={styles.bottomSheetOption}>
                                    <Ionicons name="bookmark-outline" size={24} color="#333" />
                                    <Text style={styles.bottomSheetOptionText}>Save Post</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.bottomSheetOption}>
                                    <Ionicons name="eye-off-outline" size={24} color="#333" />
                                    <Text style={styles.bottomSheetOptionText}>Hide Post</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.bottomSheetOption}>
                                    <Ionicons name="alert-circle-outline" size={24} color="#ff4444" />
                                    <Text style={[styles.bottomSheetOptionText, {color: '#ff4444'}]}>Report Post</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal visible={!!fullScreenImage} transparent={true} onRequestClose={() => setFullScreenImage(null)} animationType="fade">
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveImage}>
                        <Ionicons name="download-outline" size={30} color="white" />
                    </TouchableOpacity>
                    <Image source={{uri: fullScreenImage}} style={styles.fullScreenImage} resizeMode="contain" />
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

    usernameSection:{
        width:"80%",
        display:"flex",
        flexDirection:"row",
        // alignItems:"center",

    },

    username:{
        marginRight:5
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
        // fontWeight:"bold",
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
    bottomSheetContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheetContent: {
        backgroundColor: '#fff',
        height: '50%',
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 15,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bottomSheetOptionText: {
        fontSize: 16,
        marginLeft: 15,
        color: '#333',
        fontWeight: '500',
    },

})


export default memo(FeedCard);