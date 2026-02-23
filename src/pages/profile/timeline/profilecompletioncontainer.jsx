import { StyleSheet, Text, View } from "react-native";
import AppDetails from "../../../helpers/appdetails";
import { Ionicons } from "@expo/vector-icons";


const ProfileCompletionContainer = () => {


    const completion = [
        { 
            task: "Add your profile picture", 
            completed: true,
        },
        {
            task:"Add your profile cover",
            completed: true,
        },
        {
            task:"Add your biography",
            completed: false,
        },
        {
            task:"Add your birthdate",
            completed: false,
        },
        {
            task:"Add your work info",
            completed: false,
        },
        {
            task:"Add your location info",
            completed: false,
        },
        {
            task:"Add your education info",
            completed: false,
        },
    ];


    const completedTasks = completion.filter(t => t.completed).length;
    const totalTasks = completion.length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);

    return (
        <View style={styles.profileCompletionContainer}>
            <View style={styles.profileCompletionTextAndProgressBarContainer}>
                <View style={styles.profileCompletionTextContainer}>
                    <Text style={styles.completionLabel}>Profile Completion</Text>
                    <Text style={styles.percentageText}>{percentage}%</Text>
                </View>

                <View style={styles.profileCompletionProgressBarContainer}>
                    <View style={[styles.profileCompletionProgressBarFill, { width: `${percentage}%` }]} />
                </View>
            </View>

            <View style={styles.tasksScrollContainer}>
                {completion.map((item, index) => (
                    <View key={index} style={styles.taskItem}>
                        <Ionicons 
                            name={item.completed ? "checkmark" : "add"} 
                            size={18} 
                            color="#333" 
                            style={styles.taskIcon} 
                        />
                        <Text style={[styles.taskText, item.completed && styles.taskTextCompleted]}>
                            {item.task}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    profileCompletionContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginHorizontal: 15,
        padding: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    profileCompletionTextAndProgressBarContainer: {
        marginBottom: 20,
    },
    profileCompletionTextContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    completionLabel: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.redex.medium,
        color: '#333',
    },
    percentageText: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.redex.regular,
        color: AppDetails.primaryColor,
    },
    profileCompletionProgressBarContainer: {
        height: 7,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    profileCompletionProgressBarFill: {
        height: '100%',
        backgroundColor: AppDetails.primaryColor,
    },
    tasksScrollContainer: {
        gap: 12,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskIcon: {
        marginRight: 10,
    },
    taskText: {
        fontSize: 13,
        fontFamily: AppDetails.fontFamily.redex.regular,
        color: '#666',
    },
    taskTextCompleted: {
        color: '#aaa',
        textDecorationLine: 'line-through',
    },
});
export default ProfileCompletionContainer;