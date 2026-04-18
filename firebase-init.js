import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; 
import { getDatabase } from 'firebase/database'; 

const firebaseConfig = {
  apiKey: "AIzaSyDu4OTBKEZu2pcEY7aJFO1YUME2IL5667A",
  authDomain: "lostandfoundportal-926c2.firebaseapp.com",
  databaseURL: "https://lostandfoundportal-926c2-default-rtdb.firebaseio.com",
  projectId: "lostandfoundportal-926c2",
  storageBucket: "lostandfoundportal-926c2.firebasestorage.app",
  messagingSenderId: "895099674015",
  appId: "1:895099674015:web:a1a25df7ac8b0472c031aa",
  measurementId: "G-0EQV47QP4Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);