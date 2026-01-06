// const TrendingOnHafrikScreen = () => {

//     const [trendingFeeds, setTrendingFeeds] = useState([]);
//     const setTrendingFeedsToStore = useSharedStore((state) => state.setTrendingFeeds);
//     const trendingFeedsFromStore = useSharedStore((state) => state.trendingFeeds);

//     const [currentPlayingId, setCurrentPlayingId] = useState(null);

//     const { token } = useAuth();




//     useEffect(()=>{
//         const getData = async()=>{

//             const response = await GetTrendingController(token);

//             if (response.status === 200){
//                 setTrendingFeedsToStore([...response.data]);

//             }
//         }

//         getData();
//     },[])

    

//     const handlePaging = async()=>{
//         const nextPage = trendingFeedsFromStore.length + 1;

//         const response = await GetTrendingController(token, nextPage);

//         if (response.status === 200){
//             setTrendingFeedsToStore([...trendingFeedsFromStore, ...response.data]);
//         }
//     }


//     useEffect(()=>{
        
//         console.log(trendingFeedsFromStore.length);
//     },[trendingFeedsFromStore])



//     const renderFeedsHeader = ()=>{

//         return <FeedsHeader />
//     }


//     const renderTrendingFeedItem = ({item})=>(
//         <FeedCard 
//             feed={item}
//             currentPlayingId={currentPlayingId}
//             setCurrentPlayingId={setCurrentPlayingId} 
//             isFocused={true}
//         />
//     )


//     const renderFooter = () => (
//         <View style={styles.footerContainer}>
//             <ActivityIndicator size="small" color="#000" style={{ opacity: loadingMore ? 1 : 0 }} />
//         </View>
//     );


// //  <FeedsHeader />
//     const viewabilityConfig = useRef({
//         itemVisiblePercentThreshold: 50, // Item must be 50% visible to be considered "viewable"
//         waitForInteraction: true,
//     }).current;

//     return (
//         <View style={{backgroundColor: '#fff', flex: 1}}>
           
//                <FlatList 
//                 data={trendingFeedsFromStore}
//                 keyExtractor={(item) => item.id.stringify()}
//                 renderItem={renderTrendingFeedItem}
//                 // onScroll={handleScroll}
//                 scrollEventThrottle={AppDetails.flatList.scrollEventThrottle} // Adjust the throttle rate (16ms for ~60fps)
//                 decelerationRate={AppDetails.flatList.decelerationRate} // Slows down the scroll momentum
//                 ListHeaderComponent={renderFeedsHeader}
//                 ListFooterComponent={renderFooter}
//                 onEndReached={handlePaging}
//                 onEndReachedThreshold={0.5}
//                 initialNumToRender={3}
//                 maxToRenderPerBatch={3}
//                 windowSize={5}
//                 removeClippedSubviews={Platform.OS === 'android'}
//                 contentContainerStyle={styles.containerFeeds}
//                 // onViewableItemsChanged={onViewableItemsChanged}
//                 viewabilityConfig={viewabilityConfig}
//             />

//         </View>
//     )
// }


// const styles = StyleSheet.create({

//     footerContainer: {
//         paddingVertical: 20,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },

// })

// export default TrendingOnHafrikScreen;