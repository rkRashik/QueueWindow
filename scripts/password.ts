import { hashPassword } from "../src/lib/crypto";
// Read from stdin so the password is not saved in shell command history.
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const password = input.trim();
  if (password.length < 12) {
    console.error("Use a password of at least 12 characters.");
    process.exitCode = 1;
    return;
  }
  console.log(hashPassword(password));
});
