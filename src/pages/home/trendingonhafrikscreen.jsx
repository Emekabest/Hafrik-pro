import { StyleSheet, View } from "react-native";
import { useAuth } from "../../AuthContext";
import { useEffect, useMemo, useState } from "react";
import Feeds from "./feeds/feeds";
import GetFeedsController from "../../controllers/getfeedscontroller";
import useStore from "../../repository/store.js"
import mockFeeds from "../../helpers/mockfeeds.js";
import AppDetails from "../../helpers/appdetails.js";



const TrendingOnHafrikScreen = () => {
  const feedsName = "trendingFeeds";


  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  
  const clearFeedsList_store = useStore(state => state.clearFeedsList);

  const addFeedsToList_store = useStore((state)=> state.addFeedsToList)

  const ids = useStore(state => state.feeds.lists.trendingFeeds);
  const feedsById = useStore(state => state.feeds.feedsById);

  const trendingFeedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean), // filter out undefined
    [ids, feedsById]
  );


  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);




  const API_URL = AppDetails.apis.trendingApi;


  const getFeeds = async()=>{
      
      const response = await GetFeedsController(API_URL, token, 1); 

      
      if (response.status === 200) {
        addFeedsToList_store(feedsName, response.data);
      }
      else{
        Alert.alert("Error", "Failed to fetch Trending Feeds.");
      }
      
  }

  useEffect(()=>{
    clearFeedsList_store(feedsName);
      getFeeds()
  },[])

  useEffect(()=>{
      // increment version to force remount of child components
      clearFeedsList_store(feedsName);
      getFeeds()
      setVersion(v => v + 1);
  },[refreshSignal])


  useEffect(()=>{      
  
    setFeeds(trendingFeedsFromStore);
      
  },[trendingFeedsFromStore])
    


    const combinedData = useMemo(() => {
        const feedsheader = { type: 'feedsheader', name:"Trending on Hafrik", id:"trendingFeeds" }
      

        // Ensure unique feed items and handle shared_post correctly
        
        const data = [
            feedsheader,
            ...mockFeeds.map(feed => {
                
                return { type: 'feed', data: feed };
            }),
        ];
        return data;
    }, [mockFeeds]);

    

    return (
      <View style={styles.container}>
          <Feeds key={version} combinedData={combinedData} feeds={mockFeeds} setFeeds={setFeeds} API_URL={API_URL} feedsController={GetFeedsController} />
      </View>
  );
};


const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});




export default TrendingOnHafrikScreen;