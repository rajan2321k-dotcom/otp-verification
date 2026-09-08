require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const otpStore = {};

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP ERROR:", error.message);
    } else {
        console.log("SMTP SERVER READY ✅");
    }
});


// Send / Resend OTP
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
        otp,
        expires: Date.now() + 5 * 60 * 1000,
        attempts: 0
    };

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Verification Code",
            html: `
                <div style="font-family:Arial">
                    <h2>Email Verification</h2>
                    <p>Your OTP is:</p>
                    <h1>${otp}</h1>
                    <p>This OTP is valid for 5 minutes.</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to send OTP"
        });
    }
});


// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const data = otpStore[email];

    if (!data) {
        return res.status(400).json({
            success: false,
            message: "OTP expired. Please resend OTP."
        });
    }

    // Check expiry
    if (Date.now() > data.expires) {
        delete otpStore[email];

        return res.status(400).json({
            success: false,
            message: "OTP expired. Please resend OTP."
        });
    }

    // Maximum 3 attempts
    if (data.attempts >= 3) {
        delete otpStore[email];

        return res.status(400).json({
            success: false,
            message: "Maximum attempts reached. Please resend OTP."
        });
    }

    // Wrong OTP
    if (String(otp) !== String(data.otp)) {

        data.attempts++;

        const remaining = 3 - data.attempts;

        if (remaining === 0) {
            delete otpStore[email];

            return res.status(400).json({
                success: false,
                message: "3 wrong attempts. Please resend OTP."
            });
        }

        return res.status(400).json({
            success: false,
            message: `Invalid OTP. ${remaining} attempt(s) remaining.`
        });
    }

    // Correct OTP
    delete otpStore[email];

    res.json({
        success: true,
        message: "Email verified successfully! ✅"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});