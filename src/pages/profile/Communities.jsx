import React from 'react';
import { ScrollView } from 'react-native';
import ProfileTabs from './tabs';

const Communities = ({ header, tabs, activeTab, onTabChange, userId }) =>{
    return(
             <ScrollView stickyHeaderIndices={[1]}>
                {header}
                <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
            </ScrollView>
    )
}

export default Communities;
