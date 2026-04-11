import Database from "better-sqlite3";
const db = new Database(":memory:");
db.exec("CREATE TABLE test (id TEXT)");
try {
  db.prepare("SELECT * FROM test WHERE id = ?").all(undefined);
  console.log("Success with undefined");
} catch (e) {
  console.error("Error with undefined:", e.message);
}
