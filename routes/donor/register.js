const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
  let { phone, cnic_no, email, password, fname, lname } = req.body;

  console.log("Received donor registration request:", req.body);

  // Validate required fields
  const missingFields = [];
  if (!phone) missingFields.push("phone");
  if (!cnic_no) missingFields.push("cnic_no");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!fname) missingFields.push("fname");
  if (!lname) missingFields.push("lname");

  if (missingFields.length > 0) {
    console.error(
      "Validation error: Missing fields:",
      missingFields.join(", ")
    );
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    console.log("Checking if email exists:", email);

    // Check if email already exists
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("Database error while checking email:", userError.message);
      return res.status(500).json({
        message: "Database error",
        error: userError.message,
      });
    }

    if (existingUser) {
      console.warn("Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create user in Supabase Auth
    console.log("Creating user in Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${fname} ${lname}`,
          phone,
          user_type: "donor",
        },
      },
    });

    if (authError) throw authError;
    console.log("User created in Supabase Auth successfully.");

    const userId = authData.user.id;

    // Insert into `users` table
    console.log("Inserting into users table...");
    const { error: userInsertError } = await supabase.from("users").insert([
      {
        id: userId,
        email,
        phone,
        password: password,
        full_name: `${fname} ${lname}`,
        user_type: "donor",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (userInsertError) throw userInsertError;
    console.log("User inserted into database successfully.");

    // Insert into `donor` table
    console.log("Inserting into donor table...");
    const { error: donorInsertError } = await supabase.from("donor").insert([
      {
        user_id: userId,
        phone,
        cnic_no,
        fname,
        lname,
        // location,
      },
    ]);

    if (donorInsertError) {
      // Rollback user creation
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from("users").delete().eq("id", userId);
      throw donorInsertError;
    }

    console.log(`Donor entry created successfully for user ${email}`);
    res.status(201).json({ message: "Donor registered successfully", authData });
  } catch (error) {
    console.error("Registration failed:", error.message);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

module.exports = router;
