const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const brevo = require("@getbrevo/brevo");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const otpStore = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SEND OTP
app.post("/send-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request:", email);

    const emailPattern =
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.ac\.in)$/;

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Gmail or .ac.in email address"
      });
    }

    const otp = generateOTP();

    otpStore[email] = {
      otp: otp,
      attempts: 0,
      expires: Date.now() + 5 * 60 * 1000
    };

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: "OTP Verification",
      email: process.env.BREVO_SENDER_EMAIL
    };

    sendSmtpEmail.to = [
      {
        email: email
      }
    ];

    sendSmtpEmail.subject = "Your OTP Verification Code";

    sendSmtpEmail.htmlContent = `
      <div style="font-family:Arial;padding:20px">
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>

        <h1 style="
          letter-spacing:8px;
          background:#f3f3f3;
          padding:15px;
          text-align:center;
        ">
          ${otp}
        </h1>

        <p>This OTP is valid for 5 minutes.</p>
        <p>Maximum attempts: 3.</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ OTP sent:", email);

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {

    console.error("❌ BREVO ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

// VERIFY OTP
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

    if (record.attempts >= 3) {
      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "Maximum 3 attempts exceeded"
      });
    }

    return res.status(400).json({
      success: false,
      message: `Invalid OTP. ${3 - record.attempts} attempt(s) remaining.`
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