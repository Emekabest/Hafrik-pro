import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppDetails from "../../../../helpers/appdetails";
import {Image as ExpoImage} from 'expo-image';
import { parse } from "superagent";
import { Colors } from '../../../../theme/colors';


const JobPostContent = ({ feed }) => {

    const coverPhoto = feed.media && feed.media[0] && feed.media[0].url ? feed.media[0].url : null;
    const title = feed.payload?.title || "Job Title";
    const currency = "$";
    const salaryMinimum = parseFloat(feed.payload?.salary_minimum).toFixed(2) || "0.00";
    const salaryMaximum = parseFloat(feed.payload?.salary_maximum).toFixed(2) || "0.00";
    const salaryPeriod = feed.payload?.pay_salary_per === "per_month" ? " / Month" : feed.payload?.pay_salary_per === "per_year" ? "/ Year" : "/ Hour";
    const location = feed.payload?.location || "Location not specified";
    const type = feed.payload?.type === "full_time" ? "Full Time" : feed.payload?.type === "part_time" ? "Part Time" : "Other";
    const status = feed.payload?.available ? "Open" : "Close";
    
    
    
    return(
        <View style={styles.container}>
            <View style={styles.imageContainer}>
                <ExpoImage 
                    source={{ uri: coverPhoto }} 
                    style={{ height: "100%", width: "100%" }} 
                    contentFit="cover"
                />

            </View>
            <View style={styles.detailsContainer}>
                <Text style={styles.jobTitle}>{title}</Text>
                <Text >
                    <Text style={styles.salary}>{currency}{salaryMinimum} {"-"}  {currency}{salaryMaximum}</Text>
                    <Text style={styles.salaryMonth}>{salaryPeriod}</Text>
                </Text>
                <View style={styles.locationTypeStatusContainer}>
                    <View style={styles.locationTypeStatusContainerChild}>
                        <Text style={styles.label}>Location</Text>
                        <Text style={styles.value}>{location}</Text>
                    </View>
                    <View style={styles.locationTypeStatusContainerChild}>
                         <Text style={styles.label}>Type</Text>
                        <Text style={styles.value}>{type}</Text>
                    </View>
                    <View style={styles.locationTypeStatusContainerChild}>
                        <Text style={styles.label}>Status</Text>
                        <Text style={[styles.value, styles[status]]}>{status}</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.viewCandidatesContainer} activeOpacity={1}>
               <Text style={styles.viewCandidatesText}>Apply Now</Text>
            </TouchableOpacity>
        </View>
    )
}


const styles = StyleSheet.create({
    container:{

    },

    imageContainer:{
        height:200,
        backgroundColor:Colors.neutral170,
        borderRadius:15,
        overflow:"hidden",
    },

    detailsContainer:{

    },

    jobTitle:{
        fontSize:18, 
        fontFamily:AppDetails.fontFamily.redex.medium,
        color:AppDetails.bodyColor,
        marginTop:10
    },
    salary:{
        fontSize:13,
        fontFamily:AppDetails.fontFamily.body,
        color:AppDetails.linkColor,
    },

    salaryMonth:{
        fontSize:13,
        color:Colors.neutral700,
        fontFamily:AppDetails.fontFamily.title,
    },

    locationTypeStatusContainer:{
        height:80,
        borderWidth:1,
        borderColor:Colors.neutral206,
        borderRadius:10,
        display:"flex",
        flexDirection:"row",
        marginVertical:10,
        // marginTop:10,
    },
    locationTypeStatusContainerChild:{
        height:"100%",
        width:"33.33%",
        alignItems:"center",
        justifyContent:"center",
    },
    type:{
        backgroundColor:Colors.neutral170,
        height:"100%",
        width:"33.33%",
    },
    status:{
        backgroundColor:Colors.neutral206,
        height:"100%",
        width:"33.33%",
    },

    label:{
        fontSize:13,
        color:AppDetails.bodyColor,
        fontFamily:AppDetails.fontFamily.title,
    },
    value:{
        fontSize:12,
        color:"gray",
        fontFamily:AppDetails.fontFamily.body,
        marginTop:5,
    },
    Open:{
        backgroundColor:Colors.successAlt,
        color:Colors.white,
        paddingHorizontal:10,
        paddingVertical:1,
        borderRadius:5,
    },
    Close:{
        backgroundColor:Colors.dangerDeep,
        color:Colors.white,
        paddingHorizontal:10,
        paddingVertical:2,
        borderRadius:5,
    },

    viewCandidatesContainer:{
        height:45,
        backgroundColor:AppDetails.primaryColor,
        borderRadius:50,
        alignItems:"center",
        justifyContent:"center",
        // marginBottom:10,
    },
    viewCandidatesText:{
        color:Colors.white,
        fontFamily:AppDetails.fontFamily.redex.medium,
        fontSize:15,
    }

})

export default JobPostContent;