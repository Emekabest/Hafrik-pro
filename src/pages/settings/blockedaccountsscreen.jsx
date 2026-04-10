import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import GetBlockedAccountController from "../../controllers/getblockedaccountcontroller";
import { useAuth } from "../../AuthContext";


const BlockedAccountScreen = ()=>{

    const {token} = useAuth();

    const [blockedAccounts, setBlockedAccounts] = useState([]);

    console.log(token)


    useEffect(()=>{

        const getBlockedContactList = async () => {

            try {
                const response = await GetBlockedAccountController(token);


                if(response.status === 200){
                    setBlockedAccounts(response.data.blocked);
                    
                }
                
            } catch (error) {
                Alert.alert('Error', 'Failed to fetch blocked accounts. Please try again later.');
            }

        }

        getBlockedContactList();
    },[])


    return(
        <View>
            <Text>Blocked Accounts</Text>
        </View>
    )

}

export default BlockedAccountScreen;