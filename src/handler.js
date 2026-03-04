import { getDb } from "./db.js";
import serverless from "serverless-http";
import app from "./server.js";

// MongoDB 체크 API (Express 내부에서 라우트로 처리 가능)
app.get("/check-db", async (req, res) => {
  try {
    const db = await getDb();
    res.status(200).json({ message: "MongoDB connection OK" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Lambda용 핸들러 내보내기
export const handler = serverless(app);

