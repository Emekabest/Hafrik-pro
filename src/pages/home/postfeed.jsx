import { Image, StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, TouchableWithoutFeedback, TextInput, Keyboard, Animated, Dimensions, Platform } from "react-native"
import { useAuth } from "../../AuthContext";
import AppDetails from "../../service/appdetails";
import { useState, useRef, useEffect, useCallback } from "react";
import SvgIcon from "../../assl.js/svg/svg";

const FOCUSED_CONTAINER_HEIGHT = 400;

const icons = [
    {
        id:1,
        name: "location",
    },

    {
        id:2,
        name: "video",
    },

    {
        id:3,
        name: "poll",

    },
    {
        id:4,
        name: "music",

    },

    {
        id:5,
        name: "album",

    },

    {
        id:6,
        name: "photos",
    }
]

const middleContainerIcons = [
    {
        id:1,
        name: "color",
        text:"",
    },

    {
        id:2,
        name: "reel",   
        text:"",

    },

    {
        id:3,
        name: "gif",
        text:"",

    },

    {
        id:4,
        name: "feelings",
        text:"",


    },

    {
        id:5,
        name: "more",
        text:"More",

    },


    {
        id:6,
        name: "settings",
        text:"Options",

    }
    
]

const colorPickerBackground = [

    {
        id:1,
        type:"image",
        src:`https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/patterns/1.jpg`
    },

    {
        id:2,
        type:"image",
        src:`https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/patterns/2.jpg`
    },

    {
        id:3,
        type:"image",
        src:`https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/patterns/3.jpg`
    },


    {
        id:4,
        type:"image",
        src:`https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/patterns/4.jpg`
    },

    {
        id:5,
        type:"image",
        src:`https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/patterns/5.jpg`
    },

    {
        id:6,
        type:"color",
        src:'linear-gradient(45deg, #FF00FF, #030355)'
    },

    {
        id:7,
        type:"color",
        src:'linear-gradient(45deg, #FF003D, #D73A3A)'

    }

]

const ColorPickerItem = ({ item, isSelected, onSelect }) => {
    if (item.type === 'image') {
        return (
            <TouchableOpacity style={styles.colorCircle} onPress={() => onSelect(item.id)}>
                <Image source={{ uri: item.src }} style={styles.colorCircleImage} resizeMode="cover" />
                {isSelected && (
                    <View style={styles.selectedOverlayWhite} />
                )}
                {isSelected && <View style={styles.selectedOverlay} />} 
            </TouchableOpacity>
        );
    }

    const colorMatch = item.src.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    const backgroundColor = colorMatch ? colorMatch[0] : 'gray';

    return (
        <TouchableOpacity style={[styles.colorCircle, { backgroundColor }]} onPress={() => onSelect(item.id)}>
            {isSelected && (
                <View style={styles.selectedOverlayWhite} />
            )}
            {isSelected && <View style={styles.selectedOverlay} />}
        </TouchableOpacity>
    );
};

const PostFeed = () => {

    const { token, user } = useAuth();

    const [postButtonOpacity, setPostButtonOpacity] = useState(0.5)
    const [isFocused, setIsFocused] = useState(false);
    const [topOffset, setTopOffset] = useState(0);
    const containerRef = useRef(null);
    const shiftAnim = useRef(new Animated.Value(0)).current;
    const [middleIconStates, setMiddleIconStates] = useState({});
    const [selectedBackground, setSelectedBackground] = useState(null);

    const bottomLeftIconsSize = 19


    useEffect(() => {
        const imagesToPrefetch = colorPickerBackground
            .filter(item => item.type === 'image')
            .map(item => item.src);

        imagesToPrefetch.forEach(url => Image.prefetch(url));
    }, []);

    const handleMiddleIconToggle = (name) => {
        setMiddleIconStates((prevState) => {
            const newState = !prevState[name];
            console.log(`${name} is ${newState}`);
            return { ...prevState, [name]: newState };
        });
    };

    const handleBackgroundSelect = useCallback((id) => {
        setSelectedBackground(id);
    }, []);


    useEffect(() => {
        if (isFocused) {
            const showSubscription = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
                (e) => {
                    const keyboardHeight = e.endCoordinates.height;
                    const screenHeight = Dimensions.get('window').height;
                    const containerHeight = FOCUSED_CONTAINER_HEIGHT; 
                    const gap = 20;
                    
                    const targetBottom = screenHeight - keyboardHeight - gap;
                    const currentBottom = topOffset + containerHeight;
                    
                    if (currentBottom > targetBottom) {
                        const shift = targetBottom - currentBottom;
                        Animated.timing(shiftAnim, {
                            toValue: shift,
                            duration: Platform.OS === 'ios' ? e.duration : 250,
                            useNativeDriver: true,
                        }).start();
                    }
                }
            );
            
            const hideSubscription = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
                (e) => {
                    Animated.timing(shiftAnim, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? e.duration : 250,
                        useNativeDriver: true,
                    }).start();
                }
            );


            return () => {
                showSubscription.remove();
                hideSubscription.remove();
            };
        } else {
            shiftAnim.setValue(0);
        }
    }, [isFocused, topOffset]);

    const handlePress = () => {
        containerRef.current?.measureInWindow((x, y, width, height) => {
            const screenHeight = Dimensions.get('window').height;
            let newTop = y;
            if (y + FOCUSED_CONTAINER_HEIGHT > screenHeight) {
                newTop = screenHeight - FOCUSED_CONTAINER_HEIGHT - 10;
            }
            setTopOffset(newTop);
            setIsFocused(true);
        });
    };

    const renderContent = () => (
        <>
            <View style = {styles.containerTop}>
                <View style = {styles.containerTopImage}>
                    <Image
                        source={{uri: user.avatar}}
                        style={{ height: "100%", width: "100%" }}
                        resizeMode="cover"
                    />
                </View>
                <View style = {styles.containerTopTextContainer}>
                    <TextInput
                        style={styles.containerTopTextContainer_Input}
                        placeholder={`What is on your mind? #Hashtag.. \n @Mention.. Link..`}
                        placeholderTextColor="#848484ff"
                        multiline={true}
                        editable={isFocused}
                        autoFocus={isFocused}
                    />
                </View>

            </View>
            
            {isFocused && middleIconStates['color'] && (
                <View style={styles.colorPickerContainer}>
                    <FlatList
                        data={colorPickerBackground}
                        horizontal
                        extraData={selectedBackground}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => `color-${item.id}`}
                        renderItem={({ item }) => (
                            <ColorPickerItem 
                                item={item} 
                                isSelected={selectedBackground === item.id} 
                                onSelect={handleBackgroundSelect} 
                            />
                        )}
                    />
                </View>
            )}

            { /** Middle Post Section.......... */   }

            <View style={[styles.containerMiddle, !isFocused && { display: 'none' }]}>
                <FlatList
                    data={middleContainerIcons}
                    horizontal
                    extraData={middleIconStates}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `middle-${item.id.toString()}`}
                    contentContainerStyle={{ alignItems: 'center' }}
                    renderItem={({ item }) => {
                        const isColorActive = middleIconStates['color'];
                        const isGifActive = middleIconStates['gif'];
                        const isAlbumActive = middleIconStates['album'];
                        const isDisabled = (isColorActive && ['reel', 'gif', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                           (isGifActive && ['reel', 'color', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                           (isAlbumActive && ['reel', 'gif', 'color', 'video', 'poll', 'music'].includes(item.name));
                        return (
                            <TouchableOpacity style={[styles.middleButton, isDisabled && { opacity: 0.3 }]} onPress={() => handleMiddleIconToggle(item.name)} disabled={isDisabled}>
                                <SvgIcon name={item.name} width={bottomLeftIconsSize} height={bottomLeftIconsSize} color={AppDetails.primaryColor} />
                                <Text style={styles.middleButtonText}>{ item.text }</Text>
                            </TouchableOpacity>
                        )
                    }}
                />


                <View style = {{display:"flex", flexDirection:"row", justifyContent:"flex-start", alignItems:"center", paddingTop:18}}>

                    <TouchableOpacity style = {styles.containerMiddleBottomIcons}>
                        <SvgIcon name="hash" width={bottomLeftIconsSize} height={bottomLeftIconsSize} color="#8e8e8eff" />
                    </TouchableOpacity>
                    <TouchableOpacity style = {styles.containerMiddleBottomIcons}>
                        <SvgIcon name="at" width={bottomLeftIconsSize} height={bottomLeftIconsSize} color="#8e8e8eff" />
                    </TouchableOpacity>
                    <TouchableOpacity style = {styles.containerMiddleBottomIcons}>
                        <SvgIcon name="sticker" width={bottomLeftIconsSize} height={bottomLeftIconsSize} color="#8e8e8eff" />
                    </TouchableOpacity>

                </View>
            </View>


            <View style = {[styles.containerBottom, { borderTopWidth: !isFocused ? 0 : 0.5, borderTopColor:"#eeeeeeff", }]}>
                <View style={styles.containerBottomLeft}>
                    <FlatList
                        data={icons}
                        horizontal
                        extraData={middleIconStates}
                        inverted
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => {
                            const isColorActive = middleIconStates['color'];
                            const isGifActive = middleIconStates['gif'];
                            const isAlbumActive = middleIconStates['album'];
                            const isDisabled = (isColorActive && ['reel', 'gif', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                               (isGifActive && ['reel', 'color', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                               (isAlbumActive && ['reel', 'gif', 'color', 'video', 'poll', 'music'].includes(item.name));
                            return (
                                <TouchableOpacity activeOpacity={1} style={[styles.containerBottomLeftIcons, isDisabled && { opacity: 0.3 }]} disabled={isDisabled} onPress={() => handleMiddleIconToggle(item.name)}>
                                    <SvgIcon name={item.name} width={bottomLeftIconsSize} height={bottomLeftIconsSize} color={AppDetails.primaryColor} />
                                </TouchableOpacity>
                            )
                        }}
                    />


                </View>
                <View style={styles.containerBottomRight}>
                    <TouchableOpacity activeOpacity={postButtonOpacity} style={[styles.postButton, { opacity: postButtonOpacity, height:!isFocused ? 30 : 40, width:!isFocused ? 80: 110}]}>
                        <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    return(
        <>
            {isFocused ? (
                <View style={styles.container} />
            ) : (
                <TouchableOpacity ref={containerRef} style={styles.container} activeOpacity={1} onPress={handlePress}>
                    {renderContent()}
                </TouchableOpacity>
            )}

            <Modal
                visible={isFocused}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsFocused(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsFocused(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <Animated.View style={[styles.container, styles.focusedContainer, { position: 'absolute', top: topOffset, left: 0, right: 0, transform: [{ translateY: shiftAnim }] }]}>
                                {renderContent()}
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    )
}



const styles = StyleSheet.create({

    container:{
        marginHorizontal:10,
        height:180,
        backgroundColor: "#fff",
        borderRadius: 10,
        overflow: "hidden",
    },

    containerTop:{
        flex: 1,
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        paddingHorizontal:15,
    },



    containerTopImage:{
        height:50,
        width:50,
        borderRadius:50,
        overflow:"hidden"
    },

    containerTopTextContainer:{
        marginLeft:10,
        flex: 1,
    },

    containerTopTextContainer_Input:{
        fontSize:16,
        color:"#000",
        textAlignVertical: "center",
    },

    containerMiddle:{
        height:"20%",
        paddingHorizontal: 15,
        justifyContent: 'center',
    },


    containerMiddleBottomIcons:{
        marginRight:18,
        fontSize:18,
    },

    
    containerBottom:{
        height:"20%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth:1 ,
        borderBottomColor:"#f0f0f0ff", 
        marginTop:10,
    },

    containerBottomLeft: {
        height:"100%",
        width:"70%",
        display:"flex",
        flexDirection:"row",
        paddingRight:35,
        alignItems:"center",
        justifyContent:"flex-end",
    },

    containerBottomLeftIcons:{
        marginLeft:17

    },

    containerBottomRight: {
        height:"100%",
        width:"70%",
        justifyContent:"center"

    },

    postButton: {
        backgroundColor: AppDetails.primaryColor,
        height:43,
        width:110,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
        
        
    },

    postButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },

    middleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        
        paddingHorizontal: 5,
        paddingVertical: 8,
        borderRadius: 20,
        // marginRight: 10,
    },

    middleButtonText: {
        marginLeft: 6,
        color: AppDetails.primaryColor,
        fontWeight: '500',
        fontSize: 12,
    },

    colorPickerContainer: {
        paddingHorizontal: 15,
        alignItems:"center",
        paddingVertical: 10,
    },

    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'gray',
        marginRight: 5,
        overflow: 'hidden',
    },

    colorCircleImage: {
        width: '100%',
        height: '100%',
    },

    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderColor: '#333',
        borderRadius: 15,
    },

    selectedOverlayWhite: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 4,
        borderColor: '#fff',
        borderRadius: 15,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },

    focusedContainer: {
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        height: FOCUSED_CONTAINER_HEIGHT,
    }

})


export default PostFeed;
