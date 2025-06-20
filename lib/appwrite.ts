import { Client, Databases, Account } from "react-native-appwrite";
import {
    EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    EXPO_PUBLIC_APPWRITE_ENDPOINT
} from "@/config/Config";

const client = new Client();
client
  .setEndpoint("https://<REGION>.cloud.appwrite.io/v1")
  .setProject("<PROJECT_ID>") // Replace with your project ID
  .setPlatform('com.example.idea-tracker');


export const account = new Account(client);
export const databases = new Databases(client);


