import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import Header from "../header";
import DrawerNavigation from "../home/drawernavigation";


const SearchScreen = ()=>{
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);


      const openDrawer = useCallback(() => {
        setIsDrawerVisible(true);
      }, []);

        const closeDrawer = useCallback(() => {
          setIsDrawerVisible(false);
        }, []);
    

    return(
        <View>
            <Header onOpenDrawer={openDrawer} />

            <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
        </View>
    )



}

export default SearchScreen;