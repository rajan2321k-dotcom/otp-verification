document.addEventListener("DOMContentLoaded", () => {

  const emailInput = document.getElementById("email");
  const otpInput = document.getElementById("otp");

  const sendBtn = document.getElementById("sendBtn");
  const verifyBtn = document.getElementById("verifyBtn");

  const emailSection = document.getElementById("emailSection");
  const otpSection = document.getElementById("otpSection");

  const emailMessage = document.getElementById("emailMessage");
  const otpMessage = document.getElementById("otpMessage");

  // Send OTP
  sendBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim().toLowerCase();

    emailMessage.textContent = "";
    otpMessage.textContent = "";

    if (!email) {
      showMessage(emailMessage, "Please enter your Gmail address.", "error");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      showMessage(emailMessage, "Please enter a valid Gmail address.", "error");
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    try {

      const response = await fetch("/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP");
      }

      showMessage(
        emailMessage,
        "OTP sent successfully. Check your Gmail.",
        "success"
      );

      emailSection.classList.add("hidden");
      otpSection.classList.remove("hidden");

      otpInput.focus();

    } catch (error) {

      console.error("Send OTP error:", error);

      showMessage(
        emailMessage,
        error.message || "Failed to send OTP.",
        "error"
      );

    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send OTP";
    }
  });

  // Verify OTP
  verifyBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim().toLowerCase();
    const otp = otpInput.value.trim();

    otpMessage.textContent = "";

    if (!otp) {
      showMessage(otpMessage, "Please enter the OTP.", "error");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showMessage(
        otpMessage,
        "OTP must be exactly 6 digits.",
        "error"
      );
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
          email,
          otp
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP");
      }

      showMessage(
        otpMessage,
        "✅ Email verified successfully!",
        "success"
      );

      verifyBtn.textContent = "Verified ✓";

    } catch (error) {

      console.error("Verify OTP error:", error);

      showMessage(
        otpMessage,
        error.message || "Verification failed.",
        "error"
      );

      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify OTP";
    }
  });

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
  }

});