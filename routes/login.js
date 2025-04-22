const express = require("express");
const jwt = require("jsonwebtoken");
const supabase = require("../supabaseClient");
require("dotenv").config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("\n🔹 [Login Attempt] Email:", email);

  if (!email || !password) {
    console.warn("⚠️ [Validation Error] Missing email or password");
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    console.log("🔍 [Step 1] Checking if user exists in 'users' table...");

    // Step 1: Fetch user from `users` table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password, user_type")
      .eq("email", email)
      .maybeSingle();

    if (userError || !user) {
      console.warn("⛔ [Auth Error] Invalid email or password");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ [User Found] ID:", user.id, "| Type:", user.user_type);

    // Step 2: Compare hashed password
    console.log("🔍 [Step 2] Verifying password...");
    const isMatch = password === user.password;
    if (!isMatch) {
      console.warn("⛔ [Auth Error] Incorrect password");
      return res.status(401).json({ message: "Invalid email or password" });
    }
    console.log("✅ [Password Verified]");

    let userData = {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
    };

    // Step 3: Fetch role-specific details
    let roleTable;
    if (user.user_type === "donor") {
      roleTable = "donor";
    } else if (user.user_type === "organization") {
      roleTable = "organisation";
    } else if (user.user_type === "admin") {
      roleTable = "admin";
    }

    if (roleTable) {
      console.log(`🔍 [Step 3] Fetching details from '${roleTable}' table...`);
      const { data: roleData, error: roleError } = await supabase
        .from(roleTable)
        .select("*")
        .eq("user_id", user.id) // `user_id` links role tables to `users`
        .maybeSingle();

      if (roleError) {
        console.error(
          `⛔ [DB Error] Failed to fetch ${user.user_type} details:`,
          roleError.message
        );
        return res
          .status(500)
          .json({ message: `Error fetching ${user.user_type} details` });
      }

      if (roleData) {
        console.log(`✅ [${user.user_type} Data Fetched]`, roleData);
        userData = { ...userData, ...roleData };
      }
    }

    // Remove password before responding
    delete userData.password;

    // Step 4: Generate JWT Token
    console.log("🔐 [Step 4] Generating JWT Token...");
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    console.log("✅ [Login Successful] Sending response...");
    res.status(200).json({
      message: "Login successful",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("⛔ [Unexpected Error] Login failed:", error.message);
    return res
      .status(500)
      .json({ message: "Login failed", error: error.message });
  }
});

module.exports = router;
