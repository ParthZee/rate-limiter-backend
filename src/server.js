import app from "./app.js";
import "dotenv/config";

const port = process.env.PORT || 3000;

// App listens to port 3000
app.listen(port, () => {
  console.log(`App is listening on port no. ${port}`);
});
