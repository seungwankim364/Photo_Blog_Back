import express from "express";
import path from "path";
import uploadRouter from "./routes/upload.js";
import cors from "cors";

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/upload", uploadRouter);
app.use("/uploads", express.static("uploads"));
app.use(cors());

app.get("/health", (_, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
