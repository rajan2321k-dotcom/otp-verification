require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");

const app = express();

// Render gives PORT automatically
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));


// ===============================
// Gmail SMTP Configuration
// ===============================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// ===============================
// Check SMTP Connection
// ===============================

transporter.verify((error, success) => {

    if (error) {
        console.error("❌ SMTP ERROR:", error.message);
    } else {
        console.log("✅ SMTP SERVER READY");
    }

});


// ===============================
// OTP Storage
// ===============================

const otpStore = {};


// ===============================
// Generate OTP
// ===============================

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}


// ===============================
// SEND / RESEND OTP
// ===============================

app.post("/send-otp", async (req, res) => {

    const { email } = req.body;

    console.log("📧 OTP request received for:", email);

    // Check email
    if (!email) {

        return res.status(400).json({
            success: false,
            message: "Email is required"
        });

    }


    // Gmail validation
    if (!email.toLowerCase().endsWith("@gmail.com")) {

        return res.status(400).json({
            success: false,
            message: "Please enter a valid Gmail address"
        });

    }


    // Generate OTP
    const otp = generateOTP();

    console.log("🔢 OTP generated for:", email);


    // Store OTP
    otpStore[email] = {

        otp: otp,

        // 5 minutes
        expires: Date.now() + (5 * 60 * 1000),

        // Wrong attempts
        attempts: 0

    };


    try {

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: email,

            subject: "Your Email Verification OTP",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 25px;
                    border: 1px solid #ddd;
                    border-radius: 12px;
                ">

                    <h2 style="text-align:center;">
                        ✉️ Email Verification
                    </h2>

                    <p>
                        Your verification OTP is:
                    </p>

                    <div style="
                        text-align:center;
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                        padding:20px;
                        background:#f3f4ff;
                        border-radius:10px;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This OTP will expire in
                        <strong>5 minutes</strong>.
                    </p>

                    <p>
                        If you didn't request this OTP,
                        you can safely ignore this email.
                    </p>

                </div>
            `

        });


        console.log("✅ OTP email sent successfully to:", email);


        return res.json({

            success: true,

            message: "OTP sent successfully"

        });


    } catch (error) {

        console.error("❌ EMAIL SEND ERROR:", error.message);

        return res.status(500).json({

            success: false,

            message: "Failed to send OTP. Please try again."

        });

    }

});


// ===============================
// VERIFY OTP
// ===============================

app.post("/verify-otp", (req, res) => {

    const { email, otp } = req.body;

    console.log("🔐 OTP verification request:", email);


    // Find OTP
    const data = otpStore[email];


    if (!data) {

        return res.status(400).json({

            success: false,

            message: "OTP not found. Please resend OTP."

        });

    }


    // ===============================
    // Check Expiry
    // ===============================

    if (Date.now() > data.expires) {

        delete otpStore[email];

        return res.status(400).json({

            success: false,

            message: "OTP expired. Please resend OTP."

        });

    }


    // ===============================
    // Check Maximum Attempts
    // ===============================

    if (data.attempts >= 3) {

        delete otpStore[email];

        return res.status(400).json({

            success: false,

            message: "Maximum 3 attempts reached. Please resend OTP."

        });

    }


    // ===============================
    // Check OTP
    // ===============================

    if (String(otp) !== String(data.otp)) {

        data.attempts++;

        const remainingAttempts = 3 - data.attempts;


        if (remainingAttempts === 0) {

            delete otpStore[email];

            return res.status(400).json({

                success: false,

                message: "3 wrong attempts. Please resend OTP."

            });

        }


        return res.status(400).json({

            success: false,

            message:
                `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`

        });

    }


    // ===============================
    // Correct OTP
    // ===============================

    delete otpStore[email];

    console.log("✅ Email verified:", email);


    return res.json({

        success: true,

        message: "Email verified successfully! ✅"

    });

});


// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {

    res.sendFile(__dirname + "/public/index.html");

});


// ===============================
// Start Server
// ===============================

app.listen(PORT, "0.0.0.0", () => {

    console.log(`🚀 Server running on port ${PORT}`);

});