import client from "./client.js";

const redisPractice = async () => {
  try {
    await client.set("user:1", "Parth");
    await client.set("user:2", "Jhon");
    console.log(await client.get("user:1"));
    console.log(await client.get("user:2"));
    await client.expire("user:2", 20);
    console.log("String user:1 Exists: ", await client.exists("user:1"));
    await client.del("user:1");
    console.log(
      "String user:1 Exists after deletion: ",
      await client.exists("user:1")
    );
    await client.set("counter", 1);
    console.log(await client.get("counter"));
    await client.incr("counter");
    console.log(await client.get("counter"));
    await client.incrby("counter", 5);
    console.log(await client.get("counter"));
    console.log("user:2 John Expires in seconds: ", await client.ttl("user:2"));
    console.log("user:2 exists: ", await client.exists("user:2"));
  } catch (err) {
    console.error("Redis error: ", err);
  } finally {
    await client.quit();
  }
};

redisPractice();
