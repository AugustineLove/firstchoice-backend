const fs = require("fs");

const json = JSON.parse(
  fs.readFileSync("firebase-service-account.json", "utf8")
);

const oneLine = JSON.stringify(json);

console.log(oneLine);