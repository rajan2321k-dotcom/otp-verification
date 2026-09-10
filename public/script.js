document.addEventListener("DOMContentLoaded", () => {

  console.log("✅ script.js loaded");

  const email = document.getElementById("email");
  const otp = document.getElementById("otp");

  const sendBtn = document.getElementById("sendBtn");
  const verifyBtn = document.getElementById("verifyBtn");

  const emailSection = document.getElementById("emailSection");
  const otpSection = document.getElementById("otpSection");

  const emailMessage = document.getElementById("emailMessage");
  const otpMessage = document.getElementById("otpMessage");

  // Make sure all elements exist
  if (
    !email ||
    !otp ||
    !sendBtn ||
    !verifyBtn ||
    !emailSection ||
    !otpSection ||
    !emailMessage ||
    !otpMessage
  ) {
    console.error("❌ HTML element missing");
    return;
  }

  // =========================
  // SEND OTP
  // =========================

  sendBtn.addEventListener("click", async () => {

    console.log("🟢 Send OTP button clicked");

    const emailValue = email.value.trim().toLowerCase();

    emailMessage.textContent = "";

    if (!emailValue) {
      emailMessage.textContent = "Please enter your Gmail address.";
      emailMessage.className = "message error";
      return;
    }
const emailPattern =
  /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.ac\.in)$/;

if (!emailPattern.test(emailValue)) {
  emailMessage.textContent =
    "Please enter a valid Gmail or .ac.in email address.";
  emailMessage.className = "message error";
  return;
}
  
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    try {

      console.log("📤 Sending request to /send-otp");

      const response = await fetch("/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailValue
        })
      });

      console.log("📥 Server response:", response.status);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP");
      }

      console.log("✅ OTP sent");

      emailMessage.textContent =
        "OTP sent successfully. Check your Gmail.";

      emailMessage.className = "message success";

      emailSection.classList.add("hidden");
      otpSection.classList.remove("hidden");

      otp.focus();

    } catch (error) {

      console.error("❌ Send OTP error:", error);

      emailMessage.textContent =
        error.message || "Failed to send OTP.";

      emailMessage.className = "message error";

    } finally {

      sendBtn.disabled = false;
      sendBtn.textContent = "Send OTP";
    }

  });


  // =========================
  // VERIFY OTP
  // =========================

  verifyBtn.addEventListener("click", async () => {

    console.log("🟢 Verify button clicked");

    const emailValue = email.value.trim().toLowerCase();
    const otpValue = otp.value.trim();

    otpMessage.textContent = "";

    if (!otpValue) {
      otpMessage.textContent = "Please enter the OTP.";
      otpMessage.className = "message error";
      return;
    }

    if (!/^\d{6}$/.test(otpValue)) {
      otpMessage.textContent = "OTP must contain 6 digits.";
      otpMessage.className = "message error";
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    try {

      const response = await fetch("/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailValue,
          otp: otpValue
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Verification failed");
      }

      otpMessage.textContent =
        "✅ OTP verified successfully!";

      otpMessage.className = "message success";

      verifyBtn.textContent = "Verified ✓";

      // Redirect to Netflix
      setTimeout(() => {
        window.location.href = "https://www.netflix.com/";
      }, 1500);

    } catch (error) {

      console.error("❌ Verify error:", error);

      otpMessage.textContent =
        error.message || "Verification failed.";

      otpMessage.className = "message error";

      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify OTP";
    }

  });

});