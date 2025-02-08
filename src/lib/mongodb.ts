import { MongoClient, Db, Collection } from "mongodb";


const uri = process.env.MONGODB_URI; // Your MongoDB connection string

/*
let client: MongoClient;
let clientPromise: Promise<MongoClient>;
let clientPromiseDb: Promise<Db>;
let clientPromiseTranscriptCollection: Promise<Collection>;
let clientPromiseTasksCollection: Promise<Collection>;
*/

export let clientPromise: Promise<MongoClient> | null = null;
export let dbPromise: Promise<Db> | null = null;

const DATABASE_NAME = process.env.DATABASE_NAME || "cs-ai-agent";
// const COLLECTION_NAME = "transcriptsPlusTasks"; // Replace with your collection name

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const initializeMongo = () => {
  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri, { maxPoolSize: 75 })
      .then((client) => {
        console.log("✅ MongoDB Client connected successfully!");
        return client;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection error:", error);
        throw error;
      });
  }

  if (!dbPromise) {
    dbPromise = clientPromise.then(client => client.db(DATABASE_NAME));
  }

  const getClient = async () => await clientPromise;
  const getDb = async () => await dbPromise;

  const getCollection = async (name: string) => {
    const db = await getDb();
    return db?.collection(name);
  };

  return { getClient, getDb, getCollection };
};

// Export initialized instance to ensure reuse
export const { getClient, getDb, getCollection } = initializeMongo();
