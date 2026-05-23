import fs from "fs";

const csv = fs.readFileSync("./dora/dora-data.csv", "utf-8").trim();

const lines = csv.split("\n");
const headers = lines[0].split(",");

const rows = lines.slice(1).map((line) => {
  const values = line.split(",");
  const obj = {};

  headers.forEach((header, index) => {
    obj[header.trim()] = values[index]?.trim() || "";
  });

  return obj;
});

function toDate(value) {
  if (!value) return null;
  return new Date(value.replace(" ", "T"));
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  return (end - start) / 1000 / 60;
}

const totalDeployments = rows.length;
const successfulDeployments = rows.filter(r => r.status === "success").length;
const failedDeployments = rows.filter(r => r.status === "failed").length;

const leadTimes = rows
  .filter(r => r.status === "success")
  .map(r => {
    return minutesBetween(
      toDate(r.commit_time),
      toDate(r.deploy_end)
    );
  });

const mttrs = rows
  .filter(r => r.failure_time && r.recovery_time)
  .map(r => {
    return minutesBetween(
      toDate(r.failure_time),
      toDate(r.recovery_time)
    );
  });

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

console.log("\n===== DORA METRICS =====\n");

console.log("Deployment Frequency:");
console.log(successfulDeployments, "successful deployments");

console.log("\nLead Time for Changes:");
console.log(average(leadTimes).toFixed(2), "minutes");

console.log("\nChange Failure Rate:");
console.log(((failedDeployments / totalDeployments) * 100).toFixed(2) + "%");

console.log("\nMTTR:");
console.log(average(mttrs).toFixed(2), "minutes");