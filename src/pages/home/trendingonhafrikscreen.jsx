import { StyleSheet, View } from "react-native";
import { useAuth } from "../../AuthContext";
import { useEffect, useMemo, useState } from "react";
import Feeds from "./feeds/feeds";
import GetFeedsController from "../../controllers/getfeedscontroller";
import useStore from "../../repository/store.js"



const TrendingOnHafrikScreen = () => {


  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  
  const trendingFeedsFromStore = useStore((state)=> state.trendingFeeds)
  const setTrendingFeedsToStore = useStore((state)=> state.setTrendingFeeds)


  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);



  const url = `https://hafrik.com/api/v1/feed/nearby.php`;

  const API_URL = `https://hafrik.com/api/v1/feed/trending.php`;


  const getFeeds = async()=>{
      const response = await GetFeedsController(API_URL, token);  
      if (response.status === 200) {
        setTrendingFeedsToStore([...response.data]);

      }
      else{
        Alert.alert("Error", "Failed to fetch Trending Feeds.");
      }
  }

  useEffect(()=>{
      getFeeds()
  },[])
  
  useEffect(()=>{
      // increment version to force remount of child components
      setVersion(v => v + 1);
      getFeeds()
  },[refreshSignal])


  useEffect(()=>{      
  
    setFeeds(trendingFeedsFromStore);
      
  },[trendingFeedsFromStore])
    


    const combinedData = useMemo(() => {
        const feedsheader = { type: 'feedsheader', name:"Trending on Hafrik" }

        // Ensure unique feed items and handle shared_post correctly
        
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
  container:{
    flex: 1,
  }

});




export default TrendingOnHafrikScreen;