import bcrypt from "bcryptjs";

async function generateHash() {
  const password = "admin123"; // change this to your desired password
  const salt = await bcrypt.genSalt(10); // 10 rounds
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log("Password:", password);
  console.log("Hashed:", hashedPassword);
}

generateHash();
