import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet as RNStyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileTabs from "../tabs";
import { memo } from "react";
import { FlatList } from "react-native-gesture-handler";
import FilterHeader from "../filterheader";
import ProfileTabListCard from "./profiletablistcard";
import useStore from "../../../repository/store";
import { Colors } from '../../../theme/colors';

// Lazy-import of MediaFilterChips from photos.jsx would be circular,
// so we render it via the item's own render function stored on the data object.


const MemoizedProfileTabs = memo(ProfileTabs);
const MemoizedFilterHeader = memo(FilterHeader);
const MemomizedProfileTabListCard = memo(ProfileTabListCard);


const ProfileTabList = ({ combinedData }) => {

    const profileTabMode = useStore(state => state.profileTabMode);

    const structuredData = useCallback(() => {
        const result = [];
        let buffer = [];

        combinedData.forEach((item) => {
            if (item.type === 'list') {
                buffer.push(item);
                if (buffer.length === 2) {
                    result.push({ type: 'list_row', items: [...buffer] });
                    buffer = [];
                }
            } else {
                if (buffer.length > 0) {
                    result.push({ type: 'list_row', items: [...buffer] });
                    buffer = [];
                }
                result.push(item);
            }
        });

        if (buffer.length > 0) {
            result.push({ type: 'list_row', items: [...buffer] });
        }

        return result;

    }, [combinedData]);

    const data = structuredData();

    const renderItem = useCallback(({ item }) => {
        switch(item.type){
            case "profileHeader":
                return item.header;
            case "tabs":
                return <MemoizedProfileTabs tabs={item.tabs} activeTab={item.activeTab} onTabChange={item.onTabChange} />

            case "filterHeader":
                return <MemoizedFilterHeader name={item.name} options={item.options} />;

            case "mediaFilter": {
                // item carries: filter, onSelect, counts, and a renderChips function
                if (item.renderChips) {
                    return item.renderChips();
                }
                // Fallback: import from photos
                const { MediaFilterChips } = require('../photos');
                if (MediaFilterChips) {
                    return <MediaFilterChips active={item.filter} onSelect={item.onSelect} counts={item.counts} />;
                }
                return null;
            }

            case "loader":
                return (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                );

            case "empty":
                return (
                    <View style={{ paddingVertical: 50, alignItems: 'center', gap: 8 }}>
                        <Ionicons name="images-outline" size={40} color={Colors.mutedBlueGray} />
                        <Text style={{ fontSize: 14, color: Colors.mutedBlueGray, fontWeight: '500' }}>
                            No {item.filter === 'all' ? 'media' : item.filter === 'photos' ? 'photos' : 'reels'} yet
                        </Text>
                    </View>
                );

            case "list_row":
                // For business pages, render items as a vertical list (full width)
                if (profileTabMode && profileTabMode.value === 'business_pages') {
                    return (
                        <View style={{paddingHorizontal: 5}}>
                            {item.items.map((subItem, index) => (
                                <View key={index} style={{paddingVertical: 6}}>
                                    <MemomizedProfileTabListCard item={subItem} />
                                </View>
                            ))}
                        </View>
                    );
                }

                return (
                    <View style={{flexDirection: 'row', paddingHorizontal: 5}}>
                        {item.items.map((subItem, index) => (
                           <View key={index} style={{flex: 1, padding: 2}}>
                                <MemomizedProfileTabListCard item={subItem} />
                           </View>
                        ))}
                        {item.items.length === 1 && <View style={{flex: 1, padding: 2}} />}
                    </View>
                );
            
            default:
                return null;
        }
        

    }, []);



    const keyExtractor = useCallback((item, index) => {
        if (item.type === 'list_row') {
            return `row-${index}`;
        }
        return `${item.type}-${index}`;
    }, []);


    return(
        <View style={{flex: 1, }}>
            <FlatList 
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                removeClippedSubviews={true}
                windowSize={1}
                stickyHeaderIndices={[1]} // Make the tabs sticky
            />
        </View>
    )
}


export default ProfileTabList;