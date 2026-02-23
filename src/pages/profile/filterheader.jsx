import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../helpers/appdetails";
import SvgIcon from "../../assl.js/svg/svg.jsx";
import useStore from '../../repository/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FilterHeader = ({ name, options = [] }) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const [buttonPosition, setButtonPosition] = useState(null);
    const [isPositioned, setIsPositioned] = useState(false);
    const filterButtonRef = useRef(null);

    const tabletMode = useStore((state) => state.tabletMode);
    const profileTabMode = useStore((state) => state.profileTabMode);

    const openOptionsModal = () => {
        if (filterButtonRef.current) {
            filterButtonRef.current.measureInWindow((x, y, width, height) => {
                const windowWidth = Dimensions.get('window').width;
                const menuWidth = tabletMode ? windowWidth * 0.4 : windowWidth * 0.7;

                // Adjust left position to not go off-screen
                let left = x;
                if (x + menuWidth > windowWidth) {
                    left = windowWidth - menuWidth - 10;
                }

                // Store button position for later use in onMenuLayout
                setButtonPosition({ x, y, width, height, left, menuWidth });
                setIsPositioned(false);

                // Set initial position below the button
                setMenuStyle({
                    position: 'absolute',
                    top: y + height + 8,
                    left: left,
                    width: menuWidth,
                    opacity: 0, // Hide initially until we calculate proper position
                });
                setMenuVisible(true);
            });
        }
    };

    const closeMenu = () => {
        setMenuVisible(false);
        setButtonPosition(null);
        setIsPositioned(false);
    };

    const onMenuLayout = (event) => {
        if (!buttonPosition || isPositioned) return;

        const { height: menuHeight } = event.nativeEvent.layout;
        const windowHeight = Dimensions.get('window').height - (AppDetails.mainTabNavigatorHeight + 20);
        const { y, height, left, menuWidth } = buttonPosition;

        const spaceBelow = windowHeight - (y + height);
        const spaceAbove = y;

        let top = y + (height * 2 ); // Default position below

        if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
            // Not enough space below, position above
            top = y - (menuHeight - (height - 5));
        }

        setMenuStyle({
            position: 'absolute',
            top: top,
            left: left,
            width: menuWidth,
            opacity: 1, // Show now that position is calculated
        });
        setIsPositioned(true);
    };


    const [initialFilter, setInitialFilter] = useState(options.length > 0 ? options[0].label : null);




    const handleFilter =(opt)=>{
        setInitialFilter(opt.label); 


        if (opt?.action){

            if (profileTabMode.value === "timeline"){ 

                AsyncStorage.setItem("profile_timeline_filter", opt.value); // Store selected filter in AsyncStorage
            }

            opt.action()

        }
        closeMenu(); 
    }



    return (
        <View style={styles.container}>
            <View style={styles.containerHeader}>
                <View style={styles.containerHeaderLeft}>
                    <Text style={styles.headerTitle}>{name}</Text>
                </View>

            {
                options.length > 0 &&

                <View style={styles.containerHeaderRight}>
                    <TouchableOpacity ref={filterButtonRef} onPress={openOptionsModal} style={styles.containerHeaderRightAll}>
                        <Text style={[styles.filterText, {marginRight:5}]}>{initialFilter}</Text>
                        <SvgIcon name="arrowDown" width={12} height={12} color="#000" />
                    </TouchableOpacity>
                </View>
            }

            </View>

            <Modal
                transparent
                animationType="none"
                visible={menuVisible}
                onRequestClose={closeMenu}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
                    <View style={[styles.menuContainer, menuStyle]} onLayout={onMenuLayout}>
                        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{paddingBottom:8}}>
                            {(options && options.length > 0 ? options : []).map((opt, idx) => (
                                <TouchableOpacity key={opt.value || idx}
                                 style={[styles.menuItem, {backgroundColor: initialFilter === opt.label ? AppDetails.primaryColor : 'transparent'}]}
                                 onPress={()=> handleFilter(opt)}>
                                    <Text style={[styles.filterText, {color: initialFilter === opt.label ? '#fff' : '#000'}]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#fff',
    },
    containerHeader: {
        height: 52,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    containerHeaderLeft: {
        width: "60%",
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        fontFamily: AppDetails.fontFamily.redex.bold,
    },
    containerHeaderRight: {
        width: "40%",
        height: 40,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: 'center',
    },
    containerHeaderRightExplore: {
        height: 34,
        paddingHorizontal: 12,
        backgroundColor: "#e9e9e9ff",
        flexDirection: "row",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    exploreText: {
        fontSize: 12,
        color: "#8e8e8eff",
        marginLeft: 5,
        fontFamily: AppDetails.fontFamily.redex.regular,
    },
    containerHeaderRightAll: {
        minHeight: 25,
        minWidth:50,
        paddingHorizontal:12,
        paddingVertical: 4,
        flexDirection: "row",
        backgroundColor: "#e9e9e9ff",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    modalOverlay: {
        flex: 1,
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingVertical:10,
        elevation: 5,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },

    filterText: {
        fontSize: 14,
        color: '#000',
        fontFamily: AppDetails.fontFamily.body
    }
});

export default FilterHeader;