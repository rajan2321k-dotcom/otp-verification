document.addEventListener("DOMContentLoaded", () => {

  const emailInput = document.getElementById("email");
  const otpInput = document.getElementById("otp");

  const sendBtn = document.getElementById("sendBtn");
  const verifyBtn = document.getElementById("verifyBtn");
  const resendBtn = document.getElementById("resendBtn");

  const emailSection = document.getElementById("emailSection");
  const otpSection = document.getElementById("otpSection");

  const emailMessage = document.getElementById("emailMessage");
  const otpMessage = document.getElementById("otpMessage");

  const timerElement = document.getElementById("timer");

  let countdown = null;
  let remainingSeconds = 300;

  // Check HTML elements
  if (
    !emailInput ||
    !otpInput ||
    !sendBtn ||
    !verifyBtn ||
    !resendBtn ||
    !emailSection ||
    !otpSection ||
    !emailMessage ||
    !otpMessage ||
    !timerElement
  ) {
    console.error("❌ Required HTML elements are missing.");
    return;
  }

  // Send OTP
  sendBtn.addEventListener("click", () => {
    sendOTP(false);
  });

  // Resend OTP
  resendBtn.addEventListener("click", () => {
    sendOTP(true);
  });

  // Verify OTP
  verifyBtn.addEventListener("click", verifyOTP);

  // Send OTP
  async function sendOTP(isResend = false) {

    const email = emailInput.value.trim().toLowerCase();

    clearMessages();

    if (!email) {
      showMessage(
        isResend ? otpMessage : emailMessage,
        "Please enter your Gmail address.",
        "error"
      );
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      showMessage(
        isResend ? otpMessage : emailMessage,
        "Please enter a valid Gmail address.",
        "error"
      );
      return;
    }

    const button = isResend ? resendBtn : sendBtn;

    button.disabled = true;
    button.textContent = "Sending...";

    try {

      console.log("📤 Sending OTP request...");

      const response = await fetch("/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email
        })
      });

      console.log("📥 Response status:", response.status);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to send OTP"
        );
      }

      console.log("✅ OTP sent successfully");

      showMessage(
        isResend ? otpMessage : emailMessage,
        "OTP sent successfully! Check your Gmail.",
        "success"
      );

      if (!isResend) {
        emailSection.classList.add("hidden");
        otpSection.classList.remove("hidden");
      }

      otpInput.value = "";
      otpInput.focus();

      startTimer();

    } catch (error) {

      console.error("❌ Send OTP error:", error);

      showMessage(
        isResend ? otpMessage : emailMessage,
        error.message || "Failed to send OTP. Please try again.",
        "error"
      );

    } finally {

      if (isResend) {
        resendBtn.textContent = "Resend OTP";
      } else {
        sendBtn.textContent = "Send OTP";
      }

      button.disabled = false;

      // Resend stays disabled until timer ends
      if (isResend && remainingSeconds > 0) {
        resendBtn.disabled = true;
      }
    }
  }

  // Verify OTP
  async function verifyOTP() {

    const email = emailInput.value.trim().toLowerCase();
    const otp = otpInput.value.trim();

    clearMessage(otpMessage);

    if (!otp) {
      showMessage(
        otpMessage,
        "Please enter the OTP.",
        "error"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showMessage(
        otpMessage,
        "OTP must contain exactly 6 digits.",
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
          email: email,
          otp: otp
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Verification failed"
        );
      }

      showMessage(
        otpMessage,
        "✅ Email verified successfully!",
        "success"
      );

      verifyBtn.textContent = "Verified ✓";
      verifyBtn.disabled = true;
      resendBtn.disabled = true;

      clearInterval(countdown);

    } catch (error) {

      console.error("❌ Verify error:", error);

      showMessage(
        otpMessage,
        error.message || "Invalid OTP",
        "error"
      );

      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify OTP";
    }
  }

  // Timer
  function startTimer() {

    clearInterval(countdown);

    remainingSeconds = 300;

    resendBtn.disabled = true;

    updateTimer();

    countdown = setInterval(() => {

      remainingSeconds--;

      updateTimer();

      if (remainingSeconds <= 0) {

        clearInterval(countdown);

        timerElement.textContent = "00:00";

        resendBtn.disabled = false;

        showMessage(
          otpMessage,
          "OTP expired. You can request a new OTP.",
          "error"
        );
      }

    }, 1000);
  }

  // Update timer
  function updateTimer() {

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timerElement.textContent =
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0");
  }

  // Show message
  function showMessage(element, message, type) {

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
  }

  // Clear one message
  function clearMessage(element) {

    if (!element) return;

    element.textContent = "";
    element.className = "message";
  }

  // Clear all messages
  function clearMessages() {

    clearMessage(emailMessage);
    clearMessage(otpMessage);
  }

});