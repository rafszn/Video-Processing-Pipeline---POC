import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "online" });
});

app.listen(5001, () => {
  console.log("Auth is running");
});
