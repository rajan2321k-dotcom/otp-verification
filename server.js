const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const otpStore = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send OTP
app.post("/send-otp", async (req, res) => {

  try {

    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request received:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const otp =
      Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[email] = {
      otp,
      attempts: 0
    };

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`
    });

    console.log("✅ OTP sent successfully");

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {

    console.error("❌ EMAIL SEND ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again."
    });
  }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {

  const email = req.body.email?.trim().toLowerCase();
  const enteredOTP = req.body.otp?.trim();

  const data = otpStore[email];

  if (!data) {
    return res.status(400).json({
      success: false,
      message: "OTP not found"
    });
  }

  // Maximum 3 wrong attempts
  if (data.attempts >= 3) {
    delete otpStore[email];

    return res.status(400).json({
      success: false,
      message: "Maximum 3 attempts exceeded. Verification blocked."
    });
  }

  if (enteredOTP !== data.otp) {

    data.attempts++;

    const remaining = 3 - data.attempts;

    return res.status(400).json({
      success: false,
      message:
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : "Maximum 3 attempts exceeded."
    });
  }

  delete otpStore[email];

  console.log("✅ OTP verified:", email);

  res.json({
    success: true,
    message: "Email verified successfully"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});