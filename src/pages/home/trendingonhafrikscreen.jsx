import { ActivityIndicator, Button, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import FeedsHeader from "./feedsheader";
import GetTrendingController from "../../controllers/gettrendingcontroller";
import { useAuth } from "../../AuthContext";
import { useEffect, useRef, useState } from "react";
import useSharedStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";



const TrendingOnHafrikScreen = () => {


    return (
      <View style={styles.container}>
          <FeedsHeader />
          <Feeds />
      </View>
  );
};


const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});




export default TrendingOnHafrikScreen;