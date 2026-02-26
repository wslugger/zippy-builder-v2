import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBgrix7fRr_A51epBTEpfhqfKTxHYf6meM",
    authDomain: "zippy-builder-v2.firebaseapp.com",
    projectId: "zippy-builder-v2",
    storageBucket: "zippy-builder-v2.firebasestorage.app",
    messagingSenderId: "857649274021",
    appId: "1:857649274021:web:f40ad5c777f1c9f1a3c14c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check all projects
console.log("=== ALL PROJECTS ===");
const allSnap = await getDocs(collection(db, "projects"));
console.log(`Total projects: ${allSnap.docs.length}`);
allSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ID: ${d.id} | Name: ${data.name} | Customer: ${data.customerName} | UserId: ${data.userId} | Status: ${data.status} | Step: ${data.currentStep}`);
});

// Check user_123 projects specifically
console.log("\n=== PROJECTS FOR user_123 ===");
try {
    const q = query(
        collection(db, "projects"),
        where("userId", "==", "user_123"),
        orderBy("updatedAt", "desc")
    );
    const userSnap = await getDocs(q);
    console.log(`Projects for user_123: ${userSnap.docs.length}`);
    userSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`  ID: ${d.id} | Name: ${data.name} | Customer: ${data.customerName} | Updated: ${data.updatedAt}`);
    });
} catch (e) {
    console.log("Query with index failed, trying without orderBy...");
    const q2 = query(
        collection(db, "projects"),
        where("userId", "==", "user_123")
    );
    const userSnap2 = await getDocs(q2);
    console.log(`Projects for user_123: ${userSnap2.docs.length}`);
    userSnap2.docs.forEach(d => {
        const data = d.data();
        console.log(`  ID: ${d.id} | Name: ${data.name} | Customer: ${data.customerName} | Updated: ${data.updatedAt}`);
    });
}

process.exit(0);
