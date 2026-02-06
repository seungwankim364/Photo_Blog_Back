import { getDb } from "./db.js";

export async function handler(event) {
  try {
    const db = await getDb();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "MongoDB connection OK",
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
}
