import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ProfileTabs from './tabs';
import Profile from '../Profile';
import { ProfileProductsController } from '../../controllers/profilecontroller';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';

const Product = ({ header, tabs, activeTab, onTabChange, userId }) =>{

    const { token } = useAuth();
    const [products, setProducts] = useState([]);

    useEffect(()=>{
        const fetchProducts = async()=>{
            const response = await ProfileProductsController(token, userId);
            if(response.status === 200){
                setProducts(response.data);
            }
            else{
                console.warn('Failed to fetch products');
            }
        }
        fetchProducts();
    },[])



    


    return(
             <ScrollView stickyHeaderIndices={[1]}>
                {header}
                <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

                {products && products.length > 0 ? (
                    products.map((product) => (
                        <View key={product.id} style={{ padding: 10, borderBottomWidth: 1, borderColor: Colors.neutral250 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{product.name}</Text>
                            <Text style={{ color: Colors.neutral400 }}>${product.price}</Text>
                        </View>

                    ))
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Text >No products found.</Text>
                    </View>
                )}

            </ScrollView>
    )
}

export default Product;
