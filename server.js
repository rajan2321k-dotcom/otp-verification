const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const otpStore = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP ERROR:", error.message);
  } else {
    console.log("✅ Gmail SMTP READY");
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request:", email);

    if (!email || !email.endsWith("@gmail.com")) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Gmail address"
      });
    }

    const otp = generateOTP();

    otpStore[email] = {
      otp,
      attempts: 0,
      expires: Date.now() + 5 * 60 * 1000
    };

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>Email Verification</h2>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing:8px">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `
    });

    console.log("✅ OTP sent to:", email);

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {
    console.error("❌ EMAIL ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const enteredOTP = req.body.otp?.trim();

  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "OTP not found"
    });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];

    return res.status(400).json({
      success: false,
      message: "OTP expired"
    });
  }

  if (record.attempts >= 3) {
    delete otpStore[email];

    return res.status(400).json({
      success: false,
      message: "Maximum 3 attempts exceeded"
    });
  }

  if (enteredOTP !== record.otp) {
    record.attempts++;

    return res.status(400).json({
      success: false,
      message:
        record.attempts >= 3
          ? "Maximum 3 attempts exceeded"
          : `Invalid OTP. ${3 - record.attempts} attempt(s) remaining.`
    });
  }

  delete otpStore[email];

  console.log("✅ OTP verified:", email);

  res.json({
    success: true,
    message: "OTP verified successfully"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});