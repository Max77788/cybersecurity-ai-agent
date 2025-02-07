import { MongoClient, Db, Collection } from "mongodb";


const uri = process.env.MONGODB_URI; // Your MongoDB connection string

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
let clientPromiseDb: Promise<Db>;
let clientPromiseTranscriptCollection: Promise<Collection>;
let clientPromiseTasksCollection: Promise<Collection>;

const DATABASE_NAME = process.env.DATABASE_NAME || "cs-ai-agent";
const COLLECTION_NAME = "transcriptsPlusTasks"; // Replace with your collection name

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

client = new MongoClient(uri);
clientPromise = client.connect().then(() => {
  console.log("Connected to MongoDB");
  return client;
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
  throw err;
});

clientPromiseDb = clientPromise.then((client) => {
  const db = client.db(DATABASE_NAME);
  return db;
}).catch(err => {
  console.error("Failed to get database", err);
  throw err;
});

clientPromiseTranscriptCollection = clientPromiseDb.then((db) => {
  const collection = db.collection("transcripts");
  return collection;
}).catch(err => {
  console.error("Failed to get collection", err);
  throw err;
});

clientPromiseTasksCollection = clientPromiseDb.then((db) => {
  const collection = db.collection("tasks");
  return collection;
}).catch(err => {
  console.error("Failed to get collection", err);
  throw err;
});

export { clientPromise, clientPromiseDb, clientPromiseTranscriptCollection, clientPromiseTasksCollection };