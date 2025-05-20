import express from "express";
import "dotenv/config";
const app = express();

const port = process.env.PORT || 3000;

// App send Hello World as the response in the "/ " home route.
app.get("/", (req, res) => {
  res.send("Hello World");
});

// App listens to port 3000
app.listen(port, () => {
  console.log(`App is listening on port no. ${port}`);
});
