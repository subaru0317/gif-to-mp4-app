// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// https://console.firebase.google.com/u/0/project/gif-to-mp4-app/storage/gif-to-mp4-app.appspot.com/files/~2F?hl=ja
import { getStorage } from "firebase/storage";
// functions?
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { getFunctions } from "firebase/functions";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNAFGePxKadkeyx8B_gCv92Oux_T-KTGA",
  authDomain: "gif-to-mp4-app.firebaseapp.com",
  projectId: "gif-to-mp4-app",
  storageBucket: "gif-to-mp4-app.appspot.com",
  messagingSenderId: "1034264893526",
  appId: "1:1034264893526:web:3e8354524e95ec77f143f7",
  measurementId: "G-X7P07D1E29"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

// functions?
const functions = firebase.functions();

// export default functions;
export { storage, functions };