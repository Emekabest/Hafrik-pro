import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { useState, useRef } from "react";
import AppDetails from "../../../service/appdetails";
import CalculateElapsedTime from "../../../service/calculateelapsedtime";


const FeedCard = ({ feed })=>{
    const navigation = useNavigation();
    const [showProfileOptions, setShowProfileOptions] = useState(false);
    const [showPostOptions, setShowPostOptions] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);

    const handleOpenOptions = () => {
        iconRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({ top: y + height, left: x });
            setShowProfileOptions(true);
        });
    };



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

                <View style = {styles.mediaSection}>
                    <Image
                        source={{uri:"https://objetos-xlk.estaticos-marca.com/uploads/2025/09/24/68d3c4e8cf11f.jpeg"}}
                        style={{height:"100%", width:"100%"}}
                        resizeMode="cover"
                    />
                </View>


                <View style = {styles.engagementBar}>
                    <TouchableOpacity style = {[styles.likeSection, styles.engagementBarViews]}>
                        <Ionicons name="heart-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>1.2k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.commentSection, styles.engagementBarViews]} onPress={() => navigation.navigate('CommentScreen')}>
                        <Ionicons name="chatbubble-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>72k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.repostSection, styles.engagementBarViews]}>
                        <Ionicons name="repeat-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>182</Text>
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

        </View>
    )


}



const styles = StyleSheet.create({

    container:{
        borderTopWidth:1,
        borderTopColor:"#efefefff",
        minHeight:300,
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

    mediaSection:{
        height:300,
        // width:"100%",
        borderRadius:10,
        overflow:"hidden",
        backgroundColor:'#b1aaaaff'
    },

    engagementBar:{
        height:30,
        width:"80%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",

    },

    engagementBarViews:{
        height:"100%",
        width:"20%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-around",
        alignItems:"center",
        // backgroundColor:"#468137ff"
    },

    engagementCount:{
        fontSize:13,
        // fontWeight:"bold",
        color:"#333"


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


export default FeedCard;