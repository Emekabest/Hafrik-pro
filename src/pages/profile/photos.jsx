import { ScrollView } from "react-native";
import ProfileTabs from "./tabs";
import { useMemo, useState } from "react";
import ProfileTabList from "./profiletablist/profiletablist";


const Photos = ({ header, tabs, activeTab, onTabChange, userId }) =>{

    const mainList = [
         {
                "id": 18654,
                "type": "photo",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "photo", url:"https://stimg.cardekho.com/images/carexteriorimages/930x620/Land-Rover/Range-Rover-Velar/12767/1767783260921/front-left-side-47.jpg"}],
        },
        {
                "id": 18655,
                "type": "video",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "video", thumbnail:"https://i.ytimg.com/vi/9PlNxlb4tFc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLApLynbT8h6_y_HnoCj3P1yjVljAQ"}],
        },
        {
                "id": 18656,
                "type": "video",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "video", thumbnail:"https://images.carloha.com.ng/gina/22/11/30/070f852dc89e48fa92e1f6dfe7eefef5.webp"}],
        },
        {
                "id": 18657,
                "type": "photo",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "photo", url:"https://stimg.cardekho.com/images/carexteriorimages/930x620/Land-Rover/Range-Rover-Velar/12767/1758105499465/rear-left-view-121.jpg"}],
        },
        {
                "id": 18658,
                "type": "photo",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "photo", url:"https://stimg.cardekho.com/images/carexteriorimages/930x620/Land-Rover/Range-Rover-Velar/12767/1758105499465/rear-left-view-121.jpg"}],
        },
        {
                "id": 18659,
                "type": "video",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "video", thumbnail:"https://i.ytimg.com/vi/9PlNxlb4tFc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLApLynbT8h6_y_HnoCj3P1yjVljAQ"}],
        },
        {
                "id": 18660,
                "type": "video",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [{type: "video", thumbnail:"https://i.ytimg.com/vi/9PlNxlb4tFc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLApLynbT8h6_y_HnoCj3P1yjVljAQ"}],
        },

        {
                "id": 18661,
                "type": "album",
                "text": "Today is definitely extra boring to all foreigners lol",
                "media": [
                    {type: "photo", url:"https://stimg.cardekho.com/images/carexteriorimages/930x620/Land-Rover/Range-Rover-Velar/12767/1758105499465/rear-left-view-121.jpg"}, 
                    {type: "photo", url:"https://s1.cdn.autoevolution.com/images/models/Mercedes-AMG_GLE-63-4MATIC--Coupe-2021_main.jpg"}
                ],
        },
    ]
           
    const [list, setList] = useState(mainList);
    
    const options =[
        { label: "Photos", value: "photos", icon:"photos" , action: null},
        { label: "Albums", value: "albums" , icon:"document", action: null},
    ]
    
    const combinedData = useMemo(() => {
        const profileHeader = { type: 'profileHeader', header };
        const profileTabs = { type: 'tabs', tabs, activeTab: activeTab, onTabChange };
        const filterHeader = { type: 'filterHeader', name:"Photos", options };
        
        // Ensure unique feed items and handle shared_post correctly
        
        const data = [
            profileHeader,
            profileTabs,
            filterHeader,
            ...list.map(item => {
                
                return { type: 'list', data: item };
            }),
        ];
        
        return data;
    }, [list, tabs, activeTab, onTabChange]);
    

    return(
        <ProfileTabList combinedData={combinedData}/>
    )


}



    // return(
    //          <ScrollView stickyHeaderIndices={[1]}>
    //             {header}
    //             <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />



                

              
    //         </ScrollView>
    // )

export default Photos;