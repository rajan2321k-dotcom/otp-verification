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


// =============================
// BREVO API SETUP
// =============================

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);


// =============================
// GENERATE OTP
// =============================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// =============================
// SEND OTP
// =============================

app.post("/send-otp", async (req, res) => {

  try {

    const email = req.body.email?.trim().toLowerCase();

    console.log("📧 OTP request:", email);

    // Allow Gmail and .ac.in
    const emailPattern =
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.ac\.in)$/;

    if (!email || !emailPattern.test(email)) {

      return res.status(400).json({
        success: false,
        message: "Enter a valid Gmail or .ac.in email address"
      });

    }

    const otp = generateOTP();

    // Store OTP
    otpStore[email] = {
      otp: otp,
      attempts: 0,
      expires: Date.now() + 5 * 60 * 1000
    };


    // =============================
    // BREVO EMAIL
    // =============================

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

    sendSmtpEmail.subject =
      "Your OTP Verification Code";

    sendSmtpEmail.htmlContent = `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: auto;
        padding: 25px;
        border-radius: 12px;
        border: 1px solid #ddd;
      ">

        <h2>Email Verification</h2>

        <p>Your OTP verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          background: #f4f4f4;
          border-radius: 10px;
        ">
          ${otp}
        </div>

        <p style="margin-top:20px;">
          This OTP is valid for <strong>5 minutes</strong>.
        </p>

        <p>
          Maximum wrong attempts: <strong>3</strong>
        </p>

        <p style="color:#777;">
          Please do not share this OTP with anyone.
        </p>

      </div>
    `;


    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ OTP sent successfully:", email);

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  }

  catch (error) {

    console.error("❌ BREVO ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });

  }

});


// =============================
// VERIFY OTP
// =============================

app.post("/verify-otp", (req, res) => {

  const email = req.body.email?.trim().toLowerCase();
  const enteredOTP = req.body.otp?.trim();

  const record = otpStore[email];


  if (!record) {

    return res.status(400).json({
      success: false,
      message: "OTP not found. Please request OTP again."
    });

  }


  // OTP expiry
  if (Date.now() > record.expires) {

    delete otpStore[email];

    return res.status(400).json({
      success: false,
      message: "OTP expired."
    });

  }


  // Maximum 3 attempts
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

    if (record.attempts >= 3) {

      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "Maximum 3 attempts exceeded."
      });

    }

    return res.status(400).json({
      success: false,
      message:
        `Invalid OTP. ${3 - record.attempts} attempt(s) remaining.`
    });

  }


  // Correct OTP
  delete otpStore[email];

  console.log("✅ OTP verified:", email);

  res.json({
    success: true,
    message: "OTP verified successfully"
  });

});


// =============================
// HOME PAGE
// =============================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );

});


// =============================
// START SERVER
// =============================

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `🚀 Server running on port ${PORT}`
  );

});