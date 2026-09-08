let userEmail = "";
let timerInterval;
let timeLeft = 300;


// Send OTP
async function sendOTP() {

    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message");
    const button = document.getElementById("sendBtn");

    if (!email) {
        showMessage("Please enter your Gmail address.", "error");
        return;
    }

    const validEmailPattern = /(?:@gmail\.com|@kgisliim\.ac\.in)$/i;

    if (!validEmailPattern.test(email)) {
        showMessage("Please enter a valid Gmail or KGISLIIM email address.", "error");
        return;
    }

    button.disabled = true;
    button.innerText = "Sending...";

    try {

        const response = await fetch("/send-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {

            userEmail = email;

            document.getElementById("emailSection")
                .classList.add("hidden");

            document.getElementById("otpSection")
                .classList.remove("hidden");

            document.getElementById("emailText")
                .innerText = email;

            showMessage("OTP sent successfully 📧", "success");

            startTimer();

        } else {
            showMessage(data.message, "error");
        }

    } catch (error) {

        showMessage("Something went wrong.", "error");

    } finally {

        button.disabled = false;
        button.innerText = "Send OTP";
    }
}


// Verify OTP
async function verifyOTP() {

    const otp = document.getElementById("otp").value.trim();
    const button = document.getElementById("verifyBtn");

    if (!otp || otp.length !== 6) {

        showMessage("Enter the 6-digit OTP.", "error");

        return;
    }

    button.disabled = true;
    button.innerText = "Verifying...";

    try {

        const response = await fetch("/verify-otp", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: userEmail,
                otp: otp
            })

        });

        const data = await response.json();

        if (data.success) {

            clearInterval(timerInterval);

            showMessage(
                "Email verified successfully! ✅ Redirecting...",
                "success"
            );

            document.getElementById("otp").disabled = true;
            button.disabled = true;

            document.getElementById("resendBtn").disabled = true;

            setTimeout(() => {
                window.location.href = "https://www.kgisliim.ac.in/";
            }, 1200);

        } else {

            showMessage(data.message, "error");

            document.getElementById("otp").value = "";

        }

    } catch (error) {

        showMessage("Verification failed.", "error");

    } finally {

        if (!document.getElementById("otp").disabled) {
            button.disabled = false;
            button.innerText = "Verify OTP";
        }
    }
}


// Resend OTP
async function resendOTP() {

    const button = document.getElementById("resendBtn");

    button.disabled = true;
    button.innerText = "Sending...";

    try {

        const response = await fetch("/send-otp", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: userEmail
            })

        });

        const data = await response.json();

        if (data.success) {

            document.getElementById("otp").value = "";

            showMessage(
                "New OTP sent successfully 📧",
                "success"
            );

            startTimer();

        } else {

            showMessage(data.message, "error");

        }

    } catch (error) {

        showMessage("Failed to resend OTP.", "error");

    }
}


// 5 minute countdown
function startTimer() {

    clearInterval(timerInterval);

    timeLeft = 300;

    updateTimer();

    const resendBtn = document.getElementById("resendBtn");

    resendBtn.disabled = true;
    resendBtn.innerText = "Resend OTP";

    timerInterval = setInterval(() => {

        timeLeft--;

        updateTimer();

        if (timeLeft <= 0) {

            clearInterval(timerInterval);

            document.getElementById("timer").innerText = "00:00";

            resendBtn.disabled = false;
            resendBtn.innerText = "Resend OTP";

            showMessage(
                "OTP expired. You can resend OTP.",
                "error"
            );
        }

    }, 1000);
}


// Update timer display
function updateTimer() {

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    document.getElementById("timer").innerText =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


// Message
function showMessage(text, type) {

    const message = document.getElementById("message");

    message.innerText = text;

    message.className = type;
}