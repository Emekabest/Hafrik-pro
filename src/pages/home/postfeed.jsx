import { Image, StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, TouchableWithoutFeedback, TextInput, Animated, Dimensions, ImageBackground, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from "../../AuthContext";
import AppDetails from "../../helpers/appdetails";
import { useState, useRef, useEffect, useCallback } from "react";
import SvgIcon from "../../assl.js/svg/svg";
import PostFeedController from "../../controllers/postfeedcontroller";
import UploadMediaController from "../../controllers/uploadmediacontroller";
import PostFeedList from "../../helpers/postfeedlists"



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
            { isSelected && <View style={styles.selectedOverlay} /> }
        </TouchableOpacity>
    );
};

const PostFeed = () => {

    const navigation = useNavigation();
    const { token, user } = useAuth();

    const [postButtonOpacity, setPostButtonOpacity] = useState(0.5)
    const [isPosting, setIsPosting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef(null);
    const shiftAnim = useRef(new Animated.Value(0)).current;
    const [middleIconStates, setMiddleIconStates] = useState({});
    const [selectedBackground, setSelectedBackground] = useState(null);
    const [postBackground, setPostBackground] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [postText, setPostText] = useState("");
    const [locationText, setLocationText] = useState("");
    const [bottomContainerIcons, setBottomContainerIcons] = useState([
    {
        id:1,
        name: "photos",
    },

    {
        id:2,
        name: "album",
    },

    {
        id:3,
        name: "music",

    },
    {
        id:4,
        name: "poll",

    },

    {
        id:5,
        name: "video",

    },

    {
        id:6,
        name: "location",
    }
])


    const bottomLeftIconsSize = 19

    useEffect(() => {
        const imagesToPrefetch = colorPickerBackground
            .filter(item => item.type === 'image')
            .map(item => item.src);

        imagesToPrefetch.forEach(url => Image.prefetch(url));
    }, []);

    useEffect(() => {
        if (selectedBackground) {
            const bg = colorPickerBackground.find(item => item.id === selectedBackground);
            setPostBackground(bg);
        } else {
            setPostBackground(null);
        }
    }, [selectedBackground]);

    useEffect(() => {
        const isAnyImageLoading = selectedImages.some(img => img.uploading || img.loading);
        const isVideoLoading = selectedVideo?.uploading;
        const isThumbnailLoading = selectedThumbnail?.uploading || selectedThumbnail?.loading;

        if ((postText.trim().length > 0 || selectedImages.length > 0 || selectedVideo) && !isAnyImageLoading && !isVideoLoading && !isThumbnailLoading && !isPosting) {
            setPostButtonOpacity(1);
        } else {
            setPostButtonOpacity(0.5);
        }

    }, [postText, selectedImages, selectedVideo, selectedThumbnail, isPosting]);



    /**This function deals with picking an image from the gallery...................... */
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
            allowsMultipleSelection: true,
        });


        if (!result.canceled) {
            const newImages = result.assets.map(asset => ({
                id: Date.now() + Math.random(),
                uri: asset.uri,
                fileName: asset.fileName,
                type: asset.type,
                uploading: true,
                loading: true,
                fileType:"photo"
        }));
        

            setSelectedImages(prev => [...prev, ...newImages]);
            setMiddleIconStates(prev => ({ ...prev, photos: true }));
            
            const upload = async(newImage)=>{
               const response =  await UploadMediaController(newImage, token);

                if (response.status === "success"){
                    const uploadedImage = response.data;
                    

                    setSelectedImages(prev => prev.map(img => img.id === newImage.id ? { ...img, uri: uploadedImage.url, uploading: false, loading: true } : img));
                } else {
                    setSelectedImages(prev => prev.map(img => img.id === newImage.id ? { ...img, uploading: false, loading: false } : img));
                }
            }

            newImages.forEach(upload);
        }
    };

    /**..................................................................................... */

    


    /**This function deals with picking a video from the gallery............................... */
    const pickVideo = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 1,
        });


        if (!result.canceled) {
            const asset = result.assets[0];
            const videoItem = {
                uri: asset.uri,
                fileName: asset.fileName,
                type: asset.type,
                uploading: true,
                fileType:"video"
            };
            setSelectedVideo(videoItem);
            setMiddleIconStates(prev => ({ ...prev, video: true }));

           const response = await UploadMediaController(videoItem, token);
            if (response.status === "success"){
                const uploadedVideo = response.data;
                setSelectedImages(prev => prev.map(img => img.id === newImage.id ? { ...img, uri: uploadedImage.url, uploading: false, loading: true } : img));

                setSelectedVideo(prev => prev ? { ...prev, uri: uploadedVideo.url, uploading: false } : null);

            }
            else{
                setSelectedVideo(prev => prev ? { ...prev, uploading: false } : null);

            }

        }
    };
    /**..................................................................................... */

    const pickThumbnail = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            aspect: [16, 9],
            quality: 1,
        });


        if (!result.canceled) {
            const asset = result.assets[0];
            const newThumbnail = {
                id: Date.now() + Math.random(),
                uri: asset.uri,
                fileName: asset.fileName || "thumbnail.jpg",
                type: asset.type || "image",
                uploading: true,
                loading: true,
                fileType:"photo"
            };
        
            setSelectedThumbnail(newThumbnail);
            
            const response =  await UploadMediaController(newThumbnail, token);

            if (response.status === "success"){
                const uploadedImage = response.data;
                setSelectedThumbnail(prev => prev && prev.id === newThumbnail.id ? { ...prev, uri: uploadedImage.url, uploading: false, loading: true } : prev);
            } else {
                setSelectedThumbnail(prev => prev && prev.id === newThumbnail.id ? { ...prev, uploading: false, loading: false } : prev);
            }
        }

    };

    

    const handleMiddleIconToggle = (name) => {
        if (name === 'photos') {
            pickImage();
            return;
        }

        // if (name === 'video') {
        //     pickVideo();
        //     return;
        // }

        if (name === 'reel') {
            handleClose();
            navigation.navigate('CreatePost');
            return;
        }

        setMiddleIconStates((prevState) => {
            const newState = !prevState[name];
            if (name === 'color' && !newState) {
                setSelectedBackground(null);
            }
            if (name === 'video') {
                if (!newState) {
                    setSelectedCategory(null);
                    setSelectedVideo(null);
                    setSelectedThumbnail(null);
                } else {
                    setSelectedCategory(1);
                }
            }
            if (name === 'location' && !newState) {
                setLocationText("");
            }
            return { ...prevState, [name]: newState };
        });
    };

    const handleBackgroundSelect = useCallback((id) => {
        setSelectedBackground(prevId => (prevId === id ? null : id));
    }, []); 

    const handlePress = () => {
        setIsFocused(true);
    };

    const handleClose = () => {
        setIsFocused(false);
    };



    /**This function handles posting of the content to the database................. */
    const handlePost = async() => {
        setIsPosting(true);
        
        const backgroundDetails = selectedBackground ? colorPickerBackground.find(item => item.id === selectedBackground) : null;

        
        let postData ={
            text:postText,
            location:locationText,
        };


        if (selectedImages.length > 0){

            postData.type = "photos",
            postData.media = selectedImages.map(images => images.uri)

        }
        else if(selectedVideo != null){
            postData.type = "video",
            postData.video_url = selectedVideo.uri
            if(selectedThumbnail){
                postData.thumbnail = selectedThumbnail.uri
            }
            if (selectedCategory) {
                postData.category_id = selectedCategory;
            }

        }
        else if (postData != ""){
            postData.type = "post"

        }

        

        const respose = await PostFeedController(postData, token)
        console.log(respose)

        setIsPosting(false);

        if (respose.status === 200){

            setPostText("");
            setSelectedImages([]);
            setSelectedVideo(null);
            setSelectedThumbnail(null);
            setSelectedBackground(null);
            setSelectedCategory(null);
            setLocationText("");
            setMiddleIconStates({});
            handleClose();

        }
        else{
            console.log(respose)

        }
    };
    /**....................................................................... */




    const renderContent = () => (
        <>
            {(() => {
                const isBgImage = postBackground?.type === 'image';
                let bgColor = null;
                if (postBackground?.type === 'color') {
                    const colorMatch = postBackground.src.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                    bgColor = colorMatch ? colorMatch[0] : null;
                }

                const TextContainerComponent = isBgImage ? ImageBackground : View;
                const textContainerProps = isBgImage ? { source: { uri: postBackground.src } } : {};

                return (
                    <View style={[styles.containerTop, isFocused && { flex: 0, height: 'auto', marginBottom: 15 }]}>
                        <View style={styles.containerTopImage}>
                            <Image
                                source={{ uri: user.avatar }}
                                style={{ height: "100%", width: "100%" }}
                                resizeMode="cover"
                            />
                        </View>
                        <TextContainerComponent 
                            style={[
                                styles.containerTopTextContainer, 
                                bgColor && { backgroundColor: bgColor },
                                postBackground && styles.containerTopTextContainerWithBackground
                            ]} 
                            {...textContainerProps}
                            imageStyle={{ borderRadius: 10 }}
                        >
                            <TextInput
                                style={[styles.containerTopTextContainer_Input, postBackground && { color: '#fff', textAlign: 'center', width: '100%' }]}
                                placeholder={`What is on your mind? #Hashtag.. \n @Mention.. Link..`}
                                placeholderTextColor={postBackground ? '#fff' : "#848484ff"}
                                multiline={true}
                                editable={isFocused}
                                autoFocus={isFocused}
                                value={postText}
                                onChangeText={setPostText}
                            />
                        </TextContainerComponent>
                    </View>
                );
            })()}
            
            {isFocused && selectedImages.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                    {selectedImages.map((image, index) => (
                        <View key={index} style={styles.singleImageWrapper}>
                            <Image 
                                source={{ uri: image.uri }} 
                                style={styles.imagePreview} 
                                resizeMode="cover" 
                                onLoad={() => setSelectedImages(prev => prev.map(img => img.id === image.id ? { ...img, loading: false } : img))}
                                onError={() => setSelectedImages(prev => prev.map(img => img.id === image.id ? { ...img, loading: false } : img))}
                            />
                            {(image.uploading || image.loading) && (
                                <View style={[styles.imagePreview, styles.loadingContainer, { position: "absolute" }]}>
                                    <ActivityIndicator size="small" color={AppDetails.primaryColor} />
                                </View>
                            )}
                            <TouchableOpacity style={styles.removeImageButton} onPress={() => {
                                const newImages = [...selectedImages];
                                newImages.splice(index, 1);
                                setSelectedImages(newImages);

                                if (newImages.length === 0) {
                                    setMiddleIconStates(prev => ({...prev, photos: false}));
                                }
                            }}>
                                <Ionicons name="close-circle" size={20} color="rgba(0,0,0,0.7)" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {isFocused && middleIconStates['video'] && (
                <View style={styles.imagePreviewContainer}>
                    {selectedVideo ? (
                    <View style={styles.singleImageWrapper}>
                        {selectedVideo.uploading ? (
                            <View style={[styles.videoPreview, styles.loadingContainer]}>
                                <ActivityIndicator size="small" color={AppDetails.primaryColor} />
                            </View>
                        ) : (
                            <Video
                                source={{ uri: selectedVideo.uri }}
                                style={styles.videoPreview}
                                useNativeControls
                                resizeMode={ResizeMode.COVER}
                                isLooping
                            />
                        )}
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => {
                            setSelectedVideo(null);
                            setSelectedThumbnail(null);
                            setMiddleIconStates(prev => ({...prev, video: false}));
                        }}>
                            <Ionicons name="close-circle" size={20} color="rgba(0,0,0,0.7)" />
                        </TouchableOpacity>
                    </View>
                    ) : (
                        <TouchableOpacity onPress={pickVideo} style={styles.videoPlaceholder}>
                            <Ionicons name="videocam" size={40} color={AppDetails.primaryColor} />
                            <Text style={{color: "#666", marginTop: 5, fontSize: 12}}>Select Video</Text>
                        </TouchableOpacity>
                    )}

                    {selectedVideo && (
                    <View style={styles.singleImageWrapper}>
                        <Text style={styles.thumbnailLabel}>Thumbnail</Text>
                        <TouchableOpacity onPress={pickThumbnail} style={styles.thumbnailContainer}>
                            {selectedThumbnail ? (
                                <>
                                    <Image 
                                        source={{ uri: selectedThumbnail.uri }} 
                                        style={styles.thumbnailPreview} 
                                        resizeMode="cover"
                                        onLoad={() => setSelectedThumbnail(prev => prev ? { ...prev, loading: false } : null)}
                                        onError={() => setSelectedThumbnail(prev => prev ? { ...prev, loading: false } : null)}
                                    />
                                    {(selectedThumbnail.uploading || selectedThumbnail.loading) && (
                                        <View style={[styles.thumbnailPreview, styles.loadingContainer, { position: "absolute" }]}>
                                            <ActivityIndicator size="small" color={AppDetails.primaryColor} />
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={styles.thumbnailPlaceholder}>
                                    <Ionicons name="image-outline" size={24} color="#999" />
                                    <Text style={styles.thumbnailPlaceholderText}>Select</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                         {selectedThumbnail && (
                             <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedThumbnail(null)}>
                                <Ionicons name="close-circle" size={20} color="rgba(0,0,0,0.7)" />
                            </TouchableOpacity>
                         )}
                    </View>
                    )}
                </View>
            )}

            {isFocused && middleIconStates['color'] && (
                <View style={[styles.colorPickerContainer, { marginTop: 'auto' }]}>
                    <FlatList
                        data={colorPickerBackground}
                        horizontal
                        extraData={selectedBackground}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => `color-${item.id}`}
                        renderItem={({ item }) => (
                            <ColorPickerItem item={item} isSelected={selectedBackground === item.id} onSelect={handleBackgroundSelect} />
                        )}
                    />
                </View>
            )}

            {isFocused && middleIconStates['video'] && (
                <View style={[styles.colorPickerContainer, { marginTop: 'auto' }]}>
                    <FlatList
                        data={PostFeedList.videoCategory}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => `cat-${item.id}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={[styles.categoryPill, selectedCategory === item.id && styles.categoryPillSelected]} 
                                onPress={() => setSelectedCategory(item.id)}
                            >
                                <Text style={[styles.categoryPillText, selectedCategory === item.id && styles.categoryPillTextSelected]}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {isFocused && middleIconStates['location'] && (
                <View style={styles.locationInputContainer}>
                    <View style={styles.locationInputWrapper}>
                        <Ionicons name="location" size={16} color={AppDetails.primaryColor} />
                        <TextInput
                            style={styles.locationInput}
                            placeholder="Add Location"
                            placeholderTextColor="#999"
                            value={locationText}
                            onChangeText={setLocationText}
                        />
                        <TouchableOpacity onPress={() => handleMiddleIconToggle('location')}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            { /** Middle Post Section.......... */  }
            <View style={[styles.containerMiddle, !isFocused && { display: 'none' }, isFocused && middleIconStates['color'] && { marginTop: 0 }]}>
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
                        const isPhotosActive = middleIconStates['photos'];
                        const isVideoActive = middleIconStates['video'];
                        const isDisabled = (isColorActive && ['gif', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                           (isGifActive && ['color', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                           (isAlbumActive && ['gif', 'color', 'video', 'poll', 'music', 'photos'].includes(item.name)) ||
                                           (isPhotosActive && ['gif', 'color', 'video', 'poll', 'music', 'album'].includes(item.name)) ||
                                           (isVideoActive && ['gif', 'color', 'poll', 'music', 'album', 'photos'].includes(item.name));
                        return (
                            <TouchableOpacity style={[styles.middleButton, isDisabled && { opacity: 0.3 }]} onPress={() => handleMiddleIconToggle(item.name)} disabled={isDisabled}>
                                <SvgIcon name={item.name} width={bottomLeftIconsSize} height={bottomLeftIconsSize} color={AppDetails.primaryColor} />
                                <Text style={styles.middleButtonText}>{ item.text }</Text>
                            </TouchableOpacity>
                        )
                    }}
                />


                <View style = {{display:"flex", flexDirection:"row", justifyContent:"flex-start", alignItems:"center", paddingBottom:13}}>

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



            { /** Bottom Post Section...............................................................................................
             * ..................................................................................................................... */   }
            <View style = {[styles.containerBottom, { borderTopWidth: !isFocused ? 0 : 0.5, borderTopColor:"#eeeeeeff", }]} pointerEvents={!isFocused ? "none" : "auto"}>
                <View style={styles.containerBottomLeft}>
                    <FlatList
                        data={bottomContainerIcons}
                        horizontal
                        
                        extraData={middleIconStates}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => {
                            const isColorActive = middleIconStates['color'];
                            const isGifActive = middleIconStates['gif'];
                            const isAlbumActive = middleIconStates['album'];
                            const isPhotosActive = middleIconStates['photos'];
                            const isVideoActive = middleIconStates['video'];
                            const isDisabled = (isColorActive && ['gif', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                               (isGifActive && ['color', 'video', 'poll', 'music', 'album', 'photos'].includes(item.name)) ||
                                               (isAlbumActive && ['gif', 'color', 'video', 'poll', 'music', 'photos'].includes(item.name)) ||
                                               (isPhotosActive && ['gif', 'color', 'video', 'poll', 'music', 'album'].includes(item.name)) ||
                                               (isVideoActive && ['gif', 'color', 'poll', 'music', 'album', 'photos'].includes(item.name));
                            return (
                                <TouchableOpacity activeOpacity={1} style={[styles.containerBottomLeftIcons, isDisabled && { opacity: 0.3 }]} disabled={isDisabled} onPress={() => handleMiddleIconToggle(item.name)}>
                                    <SvgIcon name={item.name} width={bottomLeftIconsSize} height={bottomLeftIconsSize} color={AppDetails.primaryColor} />
                                </TouchableOpacity>
                            )
                        }}
                    />



                </View>
                <View style={styles.containerBottomRight}>
                    <TouchableOpacity onPress={handlePost} disabled={postButtonOpacity !== 1 || isPosting} activeOpacity={postButtonOpacity} style={[styles.postButton, { opacity: postButtonOpacity }]}>
                        {isPosting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.postButtonText}>Post</Text>
                        )}
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
                onRequestClose={handleClose}
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <Animated.View style={[styles.container, styles.focusedContainer, { transform: [{ translateY: shiftAnim }] }]}>
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
        minHeight:180,
        backgroundColor: "#fff",
        borderRadius: 10,
        overflow: "hidden",
    },

    containerTop:{
        flex: 1,
        display:"flex",
        flexDirection:"row",
        paddingHorizontal:15,
        paddingTop: 15,
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

    containerTopTextContainerWithBackground: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        padding: 10,
        overflow: 'hidden',
        minHeight: 350,
    },

    containerMiddle:{
        height: 100,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginTop: "auto",
    },


    containerMiddleBottomIcons:{
        marginRight:18,
        fontSize:18,
    },

    
    containerBottom:{
        height: 60,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth:1 ,
        borderBottomColor:"#f0f0f0ff", 
    },

    containerBottomLeft: {
        height:"100%",
        width:"70%",
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        justifyContent:"flex-start"
    },

    containerBottomLeftIcons:{
        marginLeft:17

    },

    containerBottomRight: {
        height:"100%",
        width:"30%",
        justifyContent:"center",
        alignItems:"center",
    },

    postButton: {
        backgroundColor: AppDetails.primaryColor,
        height:45,
        width:"95%",
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

    imagePreviewContainer: {
        marginHorizontal: 15,
        marginTop: 10,
        width: Dimensions.get('window').width - 50,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    singleImageWrapper: {
        position: 'relative',
        marginRight: 10,
        marginBottom: 10,
    },

    imagePreview: {
        width: 70,
        height: 70,
        borderRadius: 10,
    },

    videoPreview: {
        width: 100,
        height: 150,
        borderRadius: 10,
        backgroundColor: 'black',
    },

    removeImageButton: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 10,
        padding: 1,
    },

    locationInputContainer: {
        paddingHorizontal: 15,
        alignItems: 'flex-end',
        marginBottom: 5,
        marginTop: 10,
    },

    locationInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },

    locationInput: {
        fontSize: 14,
        color: '#333',
        marginHorizontal: 5,
        minWidth: 100,
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
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
    },

    focusedContainer: {
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        height: "auto",
        minHeight: 400,
    },

    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },

    thumbnailContainer: {
        width: 100,
        height: 100,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    thumbnailPreview: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        marginLeft: 2,
    },
    thumbnailPlaceholderText: {
        fontSize: 10,
        color: "#999",
        marginTop: 4
    },
    videoPlaceholder: {
        width: 100,
        height: 150,
        borderRadius: 10,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        marginRight: 10,
    },
    categoryPill: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 8,
    },
    categoryPillSelected: {
        backgroundColor: AppDetails.primaryColor,
    },
    categoryPillText: {
        color: '#333',
        fontSize: 13,
    },
    categoryPillTextSelected: {
        color: '#fff',
        fontWeight: '600',
    }

})


export default PostFeed;
