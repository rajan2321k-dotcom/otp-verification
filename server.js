const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { BrevoClient } = require("@getbrevo/brevo");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary OTP storage
const otpStore = {};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// BREVO CLIENT
// ===============================

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});

// ===============================
// OTP GENERATOR
// ===============================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===============================
// EMAIL VALIDATION
// Accepts:
// Gmail: example@gmail.com
// College: student@college.ac.in
// ===============================

function isValidEmail(email) {
  const emailPattern =
    /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.ac\.in)$/;

  return emailPattern.test(email);
}

// ===============================
// SEND OTP
// ===============================

app.post("/send-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request:", email);

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Gmail or .ac.in email address."
      });
    }

    // Check Brevo configuration
    if (!process.env.BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY is missing");

      return res.status(500).json({
        success: false,
        message: "Email service is not configured."
      });
    }

    if (!process.env.BREVO_SENDER_EMAIL) {
      console.error("❌ BREVO_SENDER_EMAIL is missing");

      return res.status(500).json({
        success: false,
        message: "Sender email is not configured."
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Save OTP
    otpStore[email] = {
      otp: otp,
      attempts: 0,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log("🔢 OTP generated for:", email);

    // ===============================
    // SEND EMAIL THROUGH BREVO
    // ===============================

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "OTP Verification",
        email: process.env.BREVO_SENDER_EMAIL
      },

      to: [
        {
          email: email
        }
      ],

      subject: "Your OTP Verification Code",

      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="
          margin:0;
          padding:0;
          background:#f4f4f4;
          font-family:Arial,sans-serif;
        ">

          <div style="
            max-width:500px;
            margin:40px auto;
            background:white;
            padding:30px;
            border-radius:15px;
            box-shadow:0 5px 20px rgba(0,0,0,0.1);
          ">

            <h2 style="
              text-align:center;
              color:#222;
            ">
              Email Verification
            </h2>

            <p>
              Hello,
            </p>

            <p>
              Your OTP verification code is:
            </p>

            <div style="
              text-align:center;
              font-size:32px;
              font-weight:bold;
              letter-spacing:8px;
              padding:20px;
              margin:20px 0;
              background:#f1f1f1;
              border-radius:10px;
              color:#111;
            ">
              ${otp}
            </div>

            <p>
              This OTP is valid for <strong>5 minutes</strong>.
            </p>

            <p>
              You have a maximum of <strong>3 attempts</strong>.
            </p>

            <p style="color:#777;font-size:13px;">
              Please do not share this OTP with anyone.
            </p>

          </div>

        </body>
        </html>
      `
    });

    console.log("✅ OTP sent successfully:", result.messageId);

    return res.json({
      success: true,
      message: "OTP sent successfully."
    });

  } catch (error) {

    console.error("❌ BREVO ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP."
    });
  }
});

// ===============================
// VERIFY OTP
// ===============================

app.post("/verify-otp", (req, res) => {
  try {

    const email = req.body.email?.trim().toLowerCase();
    const enteredOTP = req.body.otp?.trim();

    console.log("🔐 OTP verification:", email);

    const record = otpStore[email];

    // OTP doesn't exist
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP."
      });
    }

    // OTP expired
    if (Date.now() > record.expires) {

      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    // Maximum attempts
    if (record.attempts >= 3) {

      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "Maximum 3 attempts exceeded."
      });
    }

    // Wrong OTP
    if (enteredOTP !== record.otp) {

      record.attempts++;

      const remainingAttempts = 3 - record.attempts;

      if (remainingAttempts <= 0) {

        delete otpStore[email];

        return res.status(400).json({
          success: false,
          message: "Maximum 3 attempts exceeded."
        });
      }

      return res.status(400).json({
        success: false,
        message:
          `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    // Correct OTP
    delete otpStore[email];

    console.log("✅ OTP verified successfully:", email);

    return res.json({
      success: true,
      message: "OTP verified successfully."
    });

  } catch (error) {

    console.error("❌ VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed."
    });
  }
});

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});