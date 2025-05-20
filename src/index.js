import express from "express";
import "dotenv/config";
const app = express();

const port = process.env.PORT || 3000;

// App send Hello World as the response in the "/ " home route.
app.get("/", (req, res) => {
  res.send("<h1>Hello World</h1>");
});

app.get("/limited", (req, res) => {
  res.send("<h1>Limited Requests on this Route.</h1>");
});

app.get("/unlimited", (req, res) => {
  res.send("<h1>Unlimited Requests on this Route.</h1>");
});

// App listens to port 3000
app.listen(port, () => {
  console.log(`App is listening on port no. ${port}`);
});
