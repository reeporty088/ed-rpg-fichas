import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAt6x2nvUKqlhF4wzse0OQANHB6_WsAHhU",
  authDomain: "veu-rpg.firebaseapp.com",
  projectId: "veu-rpg",
  storageBucket: "veu-rpg.firebasestorage.app",
  messagingSenderId: "727051483755",
  appId: "1:727051483755:web:25efe9390a667966204f2e",
  measurementId: "G-PHQH699YKM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
