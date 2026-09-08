const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store OTPs temporarily
const otpStore = {};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Check SMTP connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP ERROR:", error.message);
  } else {
    console.log("✅ SMTP SERVER READY");
  }
});

// Generate 6 digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request received for:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Basic Gmail validation
    if (!email.endsWith("@gmail.com")) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Gmail address"
      });
    }

    const otp = generateOTP();

    console.log("🔢 OTP generated for:", email);

    // Save OTP for 5 minutes
    otpStore[email] = {
      otp: otp,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0
    };

    const mailOptions = {
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      text: `Your OTP is: ${otp}\n\nThis OTP is valid for 5 minutes.\nMaximum wrong attempts: 3.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:25px;border:1px solid #ddd;border-radius:12px">
          <h2 style="text-align:center">Email Verification</h2>
          <p>Your OTP verification code is:</p>

          <div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:8px;padding:20px;background:#f5f5f5;border-radius:10px">
            ${otp}
          </div>

          <p style="margin-top:20px">
            This OTP is valid for <strong>5 minutes</strong>.
          </p>

          <p>
            Maximum incorrect attempts: <strong>3</strong>
          </p>

          <p style="color:#777">
            Please do not share this OTP with anyone.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ OTP email sent successfully to:", email);

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
  try {
    const email = req.body.email?.trim().toLowerCase();
    const enteredOTP = req.body.otp?.trim();

    if (!email || !enteredOTP) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const storedData = otpStore[email];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP."
      });
    }

    // Check expiry
    if (Date.now() > storedData.expires) {
      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    // Maximum 3 wrong attempts
    if (storedData.attempts >= 3) {
      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "Maximum attempts exceeded. Please request a new OTP."
      });
    }

    // Wrong OTP
    if (enteredOTP !== storedData.otp) {
      storedData.attempts++;

      const remaining = 3 - storedData.attempts;

      if (remaining <= 0) {
        delete otpStore[email];

        return res.status(400).json({
          success: false,
          message: "Maximum attempts exceeded. Please request a new OTP."
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining} attempt(s) remaining.`
      });
    }

    // Correct OTP
    delete otpStore[email];

    console.log("✅ OTP verified successfully for:", email);

    res.json({
      success: true,
      message: "Email verified successfully!"
    });

  } catch (error) {
    console.error("❌ VERIFY ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Verification failed"
    });
  }
});

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});