import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feeds from './feeds/feeds';
import { useAuth } from '../../AuthContext';
import GetFeedsController from '../../controllers/getfeedscontroller';

const WhatsNearbyScreen = () => {


  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  const API_URL = `https://hafrik.com/api/v1/feed/nearby.php`;

    useEffect(()=>{
        const getFeeds = async()=>{
            const response = await GetFeedsController(API_URL, token, 1);  
            setFeeds(response.data);
        }
        getFeeds()
    },[])




    const combinedData = useMemo(() => {
      
        
        const data = [
            ...feeds.map(feed => {
                
                return { type: 'feed', data: feed };
            }),
        ];
        return data;
    }, [feeds]);



    return (
      <View style={styles.container}>
          <Feeds combinedData={combinedData} feeds={feeds} setFeeds={setFeeds} API_URL={API_URL} feedsController={GetFeedsController} />
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