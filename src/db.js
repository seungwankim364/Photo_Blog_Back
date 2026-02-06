import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
let client;
let db;

export async function getDb() {
  if (db) return db;

  client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db("photo_upload"); // DB 이름
  console.log("✅ MongoDB connected");

  return db;
}
