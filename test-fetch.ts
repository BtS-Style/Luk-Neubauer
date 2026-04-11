async function test() {
  try {
    const endpoints = [
      { url: "http://localhost:3000/api/ping", method: "GET" },
      { url: "http://localhost:3000/api/posts", method: "GET" },
      { url: "http://localhost:3000/api/users/admin_master_001", method: "GET" },
    ];
    for (const item of endpoints) {
      console.log(`Testing ${item.method} ${item.url}...`);
      const res = await fetch(item.url, { method: item.method });
      console.log(`Status: ${res.status}`);
      const contentType = res.headers.get("content-type");
      console.log(`Content-Type: ${contentType}`);
      const text = await res.text();
      console.log(`Response: ${text.substring(0, 100)}`);
      if (text.trim().startsWith("<")) {
        console.error("FAILED: Received HTML instead of JSON!");
      }
      console.log("---");
    }
  } catch (e) {
    console.error(e);
  }
}
test();
