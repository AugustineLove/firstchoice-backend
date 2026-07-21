// // src/config/firebase.ts
// import { initializeApp, cert } from 'firebase-admin/app'; // <-- Import from /app
// import { getAuth } from 'firebase-admin/auth';
// import { getFirestore } from 'firebase-admin/firestore';
// import dotenv from 'dotenv';

// dotenv.config();

// const projectId = process.env.FIREBASE_PROJECTID;
// const clientEmail = process.env.FIREBASE_CLIENTEMAIL;
// const privateKey = process.env.FIREBASE_PRIVATEKEY;

// if (!projectId || !clientEmail || !privateKey) {
//   throw new Error(
//     "Missing Firebase environment variables! Please check your .env file."
//   );
// }

// // Initialize the application using modern SDK imports
// const app = initializeApp({
//   credential: cert({
//     projectId: projectId,
//     clientEmail: clientEmail,
//     privateKey: privateKey.replace(/\\n/g, '\n'), 
//   })
// });

// // Export the initialized services
// export const firebaseAuth = getAuth(app);
// export const db = getFirestore(app);
// export default app;