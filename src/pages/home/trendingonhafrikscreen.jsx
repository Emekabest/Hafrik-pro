import { StyleSheet, View } from "react-native";
import { useAuth } from "../../AuthContext";
import { useEffect, useMemo, useState } from "react";
import Feeds from "./feeds/feeds";
import GetFeedsController from "../../controllers/getfeedscontroller";



const TrendingOnHafrikScreen = () => {


  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  const API_URL = `https://hafrik.com/api/v1/feed/trending.php`;


  useEffect(()=>{
        const getFeeds = async()=>{
            const response = await GetFeedsController(API_URL, token, 1);  
            setFeeds(response.data);
        }
        getFeeds()
  },[])




    const combinedData = useMemo(() => {
        const feedsheader = { type: 'feedsheader' }

        // console.log(feeds)
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
          <Feeds combinedData={combinedData} feeds={feeds} setFeeds={setFeeds} API_URL={API_URL} feedsController={GetFeedsController} />
      </View>
  );
};


const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});




export default TrendingOnHafrikScreen;