import dotenv from "dotenv";
import firebase from "firebase";
import { getNovelsCount, loadNovelsData } from "./handlers/fileManager";
import { arrayFromLength } from "./helpers/common";
import { saveChaptersData, saveNovelContent } from "./handlers/firebase";
dotenv.config();

let config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: process.env.FIREBASE_DB_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
};

firebase.initializeApp(config);

const saveNovelData = async () => {
  const novelsCount = await getNovelsCount();
  await arrayFromLength(novelsCount).forEach(async (i) => {
    const novelData = await loadNovelsData(i - 1);
    await saveNovelContent(novelData);
    await saveChaptersData(novelData);
  });
};
saveNovelData();
