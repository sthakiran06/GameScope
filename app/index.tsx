import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native'
import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { useState, useEffect, useContext } from 'react'
import { ValidIndicator } from '@/components/ui/ValidIndicator'
//import { useUser } from '@/hooks/userContext'
import { router } from 'expo-router'
import { AuthContext } from '@/contexts/AuthContext'
import { ID } from 'react-native-appwrite'

export default function SignUp(props: any) {
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    // email and password validity
    const [validEmail, setValidEmail] = useState<boolean>(false)
    const [validPassword, setValidPassword] = useState<boolean>(false)
    const [auth,setAuth] = useState<null|any>(null)

    const user = useContext(AuthContext)

    const register = async () => {
        // sign up with unique id, email and password
        await user.create( ID.unique(), email, password )
        // create a session
        const session = await user.createEmailPasswordSession(email,password)
        setAuth(session)
    }

    useEffect(() => {
        if( auth ) {
            router.navigate("/(tabs)")
        }
    }, [auth])

    //const user = useUser()
    //console.log(user)
    useEffect(() => {
        if (email.indexOf('@') > 0) {
            // console.log('valid email')
            setValidEmail(true)
        }
        else {
            // console.log('invalid email')
            setValidEmail(false)
        }
    }, [email])

    useEffect(() => {
        if (password.length >= 8) {
            // valid password
            setValidPassword(true)
        }
        else {
            // invalid password
            setValidPassword(false)
        }
    }, [password])

    useEffect(()=> {
        console.log(user)
    },[user])

    return (
        <ThemedView style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.title}>Sign up</Text>
                <View style={ styles.label }>
                    <ThemedText>Email</ThemedText>
                    <ValidIndicator valid={validEmail} />
                </View>
                
                <TextInput
                    style={styles.input}
                    placeholder='you@example.com'
                    onChangeText={(val) => setEmail(val)}
                    value={email}
                />

                <View style={ styles.label }>
                    <ThemedText>Password</ThemedText>
                    <ValidIndicator valid={validPassword} />
                </View>
                <TextInput
                    style={styles.input}
                    placeholder='minimum 8 characters'
                    secureTextEntry={true}
                    value={password}
                    onChangeText={(val) => setPassword(val)}
                />

                <Pressable
                    style={(validEmail && validPassword) ? styles.button : styles.buttondisabled}
                    disabled={(validEmail && validPassword) ? false : true}
                    onPress={ () => { 
                        register()
                        }}
                >
                    <ThemedText
                        style={(validEmail && validPassword) ? styles.buttonText : styles.buttonTextDisabled}
                    >
                        Sign up
                    </ThemedText>
                </Pressable>
            </View>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    form: {
        marginHorizontal: 50,
        padding: 15,
        marginTop: 100,
    },
    input: {
        backgroundColor: "#dfe7f5",
        padding: 5,
        fontSize: 16,
        marginBottom: 15,
    },
    title: {
        fontSize: 32,
        textAlign: "center",
    },
    container: {
        flex: 1,

    },
    button: {
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#dfe7f5",
        padding: 5,
        borderRadius: 5,
    },
    buttondisabled: {
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#45474a",
        padding: 5,
        borderRadius: 5,
    },
    buttonText: {
        textAlign: "center",
    },
    buttonTextDisabled: {
        textAlign: "center",
        color: "#45474a"
    },
    label: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
})