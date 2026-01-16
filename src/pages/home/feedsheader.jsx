import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { TouchableOpacity, Modal, FlatList, Pressable } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import GetCountriesController from "../../controllers/countriescontroller/getcountriescontroller";
import { useAuth } from "../../AuthContext";
import AppDetails from "../../helpers/appdetails";
import GetCountryFeedController from "../../controllers/countriescontroller/getcountryfeedcontroller";
import useStore from "../../repository/store.js"
import AsyncStorage from "@react-native-async-storage/async-storage";
import GetFeedsController from "../../controllers/getfeedscontroller.js";


const FeedsHeader = ( { name })=>{

    const {token} = useAuth();
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState({ country_id: 'all', country_name: 'All' });
    const [countryModalVisible, setCountryModalVisible] = useState(false);

    const setRecentFeedsToStore = useStore((state)=> state.setRecentUpdateFeeds)
    const triggerRefresh = useStore((state) => state.triggerRefresh);  

    

    

    useEffect(()=>{
        const getData = async ()=>{
            const response = await GetCountriesController(token);
       

            
            if (response.status === 200){
                const remote = Array.isArray(response.data.countries) ? response.data.countries : [];
                const list = [{ id: 'all', name: 'All' }, ...remote];
                setCountries(list);
            } else {
                setCountries([{ id: 'all', name: 'All' }]);
            }

        }
        getData();
    },[])

    // Load previously selected country from local storage and apply as default
    useEffect(() => {
        const loadSelectedCountry = async () => {
            try {
                const raw = await AsyncStorage.getItem('selected_country');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed) setSelectedCountry(parsed);
                }
            } catch (e) {
                // ignore parse/storage errors
            }
        };
        loadSelectedCountry();
    }, []);

    const openCountrySelector = () => setCountryModalVisible(true);
    const closeCountrySelector = () => setCountryModalVisible(false);





    const handleSelectCountry = async (country) => {
        
        AsyncStorage.setItem('selected_country', JSON.stringify(country));

        const response = await GetFeedsController("https://hafrik.com/api/v1/feed/list.php", token);

        if (response.status === 200){
            
            setRecentFeedsToStore([...response.data]);
            triggerRefresh();
        
        }

        
        setSelectedCountry(country);
        closeCountrySelector();
    }

    const displayCountryName = selectedCountry ? (selectedCountry.name || selectedCountry.title || selectedCountry.country || selectedCountry.country_name) : null;
    const countryFontSize = displayCountryName && displayCountryName.length > 16 ? 11 : 12;



    return(
        <View style = {styles.containerHeader} >
            <View style = {styles.containerHeaderLeft}>
                <Text style ={{fontSize:17, fontFamily:"ReadexPro_500Medium"}}>{name}</Text>
            </View>
            <View style = {styles.containerHeaderRight}>
                <TouchableOpacity activeOpacity={0.7} style = {styles.containerHeaderRightExplore} onPress={openCountrySelector}>  
                    <Ionicons name="globe-outline" size={20} color="#000" style={{marginRight:5}} />
                    <Text style = {{fontSize: countryFontSize, fontFamily:"ReadexPro_500Medium"}}>
                        {displayCountryName ? displayCountryName : 'Explore by country'}
                    </Text>
                </TouchableOpacity>

            </View>
                <Modal visible={countryModalVisible} transparent animationType="slide" onRequestClose={closeCountrySelector}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Select country</Text>
                            <FlatList
                                data={countries}
                                keyExtractor={(c, i) => (c.id ? String(c.id) : String(i))}
                                renderItem={({item}) => (
                                    <Pressable onPress={() => handleSelectCountry(item)} style={styles.countryItem}>
                                        <Text style={styles.countryText}>{item.name || item.title || item.country || item.country_name || 'Unknown'}</Text>
                                    </Pressable>
                                )}
                            />
                            <TouchableOpacity activeOpacity={1} onPress={closeCountrySelector} style={styles.modalClose}>
                                <Text style={{color: '#fff'}}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
        </View>
    )
}


const styles = StyleSheet.create({

    container:{
        // paddingHorizontal:10,        
    },

    containerHeader:{
        height:52,
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        paddingVertical:10,
        paddingHorizontal:12,

    },

    containerHeaderLeft:{

        width:"60%",
        height:40,

    },

    containerHeaderRight:{

        width:"40%",
        height:40,

        display:"flex",
        flexDirection:"row",
        justifyContent:"flex-end",
        alignItems: 'center'
    },

    containerHeaderRightExplore:{
        height:34,
        paddingHorizontal:12,
        backgroundColor:"#e9e9e9ff",
        display:"flex",
        flexDirection:"row",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"center",
        marginRight:8,

    },

    containerHeaderRightAll:{
        height:34,
        paddingHorizontal:10,
        display:"flex",
        flexDirection:"row",
        backgroundColor:"#e9e9e9ff",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"center",

    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '70%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
    },
    modalTitle: {
        fontSize: 16,
        fontFamily: 'ReadexPro_600SemiBold',
        marginBottom: 8,
    },
    countryItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    countryText: {
        fontSize: 14,
        fontFamily: 'ReadexPro_400Regular',
    },
    modalClose: {
        marginTop: 10,
        backgroundColor: AppDetails?.primaryColor || '#333',
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },

    containerFeeds:{

    }

})

export default FeedsHeader;