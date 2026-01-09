import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feeds from './feeds/feeds';
import { useAuth } from '../../AuthContext';
import GetFeedsController from '../../controllers/getfeedscontroller';
import useStore from '../../repository/store';

const WhatsNearbyScreen = () => {


  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  const API_URL = `https://hafrik.com/api/v1/feed/nearby.php`;

  const whatsNearbyFeedsFromStore = useStore((state)=> state.whatsNearbyFeeds)
  const setWhatsNearbyFeedsToStore = useStore((state)=> state.setWhatsNearbyFeeds)

  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);



  const getFeeds = async()=>{
      const response = await GetFeedsController(API_URL, token, 1); 
      
      if (response.status === 200) {
        setWhatsNearbyFeedsToStore([...response.data]);
      }
      else{
        Alert.alert("Error", "Failed to fetch What's Nearby Feeds.");

        return;
      }
      
  }


    useEffect(()=>{

        getFeeds()
    },[])
    useEffect(()=>{
        // increment version to force remount of child components
        getFeeds()
        setVersion(v => v + 1);
    },[refreshSignal])


    useEffect(()=>{      

        setFeeds(whatsNearbyFeedsFromStore);
    
    },[whatsNearbyFeedsFromStore])



    const combinedData = useMemo(() => {
      const feedsheader = { type: 'feedsheader', name: 'What\'s Nearby' };
      
        
        const data = [
            feedsheader,
            ...feeds.map(feed => {
                
                return { type: 'feed', data: feed };
            }),
        ];
        return data;
    }, [feeds]);



    return (
      <View style={styles.container}>
          <Feeds key={version} combinedData={combinedData} feeds={feeds} setFeeds={setFeeds} API_URL={API_URL} feedsController={GetFeedsController} />
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WhatsNearbyScreen;