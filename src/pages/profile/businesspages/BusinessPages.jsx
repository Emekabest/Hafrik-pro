import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import ProfileTabs from '../tabs';
import ProfileTabList from '../profiletablist/profiletablist';
import { ProfilePagesController } from '../../../controllers/profilecontroller';
import { useAuth } from '../../../AuthContext';

const BusinessPages = ({ header, tabs, activeTab, onTabChange, userId }) =>{

        const [list, setList] = useState([]);
        const [skeletonList, setSkeletonList] = useState([1,2,3,4,5]);
        const { token } = useAuth();


        const getPages = async()=>{

            const response = await ProfilePagesController(token, userId);


            if(response.status === 200){


                setList(response.data);
            }
            else{
                Alert.alert("Error", "Failed to fetch business pages.");
            }

        }

        

        useEffect(()=>{
            getPages();

        },[])
       
    

        const combinedData = useMemo(() => {
            const profileHeader = { type: 'profileHeader', header };
            const profileTabs = { type: 'tabs', tabs, activeTab: activeTab, onTabChange };
            const filterHeader = { type: 'filterHeader', name:"Business Pages"};
            
            // Ensure unique feed items and handle shared_post correctly
            
            const data = [
                profileHeader,
                profileTabs,
                filterHeader,
                ...(list && list.length > 0
                    ? list.map(item => ({ type: 'list', data: item }))
                    : skeletonList.map(() => ({ type: 'list', data: { skeleton: true } }))
                ),
            ];
            
            return data;
        }, [list, tabs, activeTab, onTabChange]);
 
    return(
        <ProfileTabList combinedData={combinedData}/>
    )
}

export default BusinessPages;
