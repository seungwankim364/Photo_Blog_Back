import express from "express";
import cors from "cors";
import path from "path";
import uploadRouter from "./routes/upload.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(express.json());

app.use(cors({
  origin: "*",

}));

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/upload", uploadRouter);
app.use("/auth", authRouter);
app.use("/uploads", express.static("uploads"));

app.get("/health", (_, res) => {
  res.status(200).send("OK");
});

export default app;