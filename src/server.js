import express from "express";
import cors from "cors";
import path from "path";
import uploadRouter from "./routes/upload.js";


const app = express();

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/upload", uploadRouter);
app.use("/uploads", express.static("uploads"));

app.get("/health", (_, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
