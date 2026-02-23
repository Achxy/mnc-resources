import {
  getUser,
  onAuthChange,
  refreshSession,
  signIn,
  signUp,
  signOut,
  isAdmin,
  verifyAndSetup,
  sendResetOTP,
  resetWithOTP,
} from "./auth.js";
import { CMS_API_URL } from "./config.js";

let modalContainer;
let authButton;

const createModal = (title, contentHTML) => {
  modalContainer.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">${contentHTML}</div>
  `;
  modal.querySelector(".modal-close").addEventListener("click", closeModal);

  overlay.appendChild(modal);
  modalContainer.appendChild(overlay);
  modalContainer.hidden = false;

  const firstInput = modal.querySelector("input");
  if (firstInput) firstInput.focus();

  return modal;
};

const closeModal = () => {
  modalContainer.innerHTML = "";
  modalContainer.hidden = true;
};

const randomPassword = () => {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
};

const showSignInModal = () => {
  const modal = createModal(
    "Sign In",
    `
    <form id="signin-form" class="auth-form">
      <label class="auth-label">
        Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>
      <label class="auth-label">
        Password
        <input type="password" name="password" required autocomplete="current-password" class="auth-input" />
      </label>
      <p class="auth-forgot"><button type="button" class="auth-link" id="goto-forgot">Forgot password?</button></p>
      <p id="signin-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Sign In</button>
      <p class="auth-switch">
        Don't have an account? <button type="button" class="auth-link" id="goto-signup">Sign Up</button>
      </p>
    </form>
  `
  );

  modal.querySelector("#goto-signup").addEventListener("click", showSignUpModal);
  modal.querySelector("#goto-forgot").addEventListener("click", showForgotPasswordModal);
  modal.querySelector("#signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#signin-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      await signIn(form.email.value, form.password.value);
      closeModal();
    } catch (err) {
      const msg = err.message || "Sign in failed";
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("verify")) {
        errorEl.textContent = "Email not verified. Please complete the sign-up process first.";
      } else {
        errorEl.textContent = msg;
      }
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });
};

const showSignUpModal = () => {
  const modal = createModal(
    "Sign Up",
    `
    <div id="signup-step1" class="auth-form">
      <label class="auth-label">
        Roll Number
        <div class="roll-input-row">
          <span class="roll-prefix">240957</span>
          <input type="text" id="roll-suffix" inputmode="numeric" pattern="\\d{3}" maxlength="3" placeholder="001" required class="auth-input roll-suffix-input" />
        </div>
      </label>
      <p id="lookup-error" class="auth-error" hidden></p>
      <button type="button" id="lookup-btn" class="auth-submit">Look up</button>
      <p class="auth-switch">
        Already have an account? <button type="button" class="auth-link" id="goto-signin">Sign In</button>
      </p>
    </div>
    <div id="signup-step2" class="auth-form" hidden>
      <p class="signup-welcome">Welcome, <strong id="signup-name"></strong></p>
      <p class="auth-hint">We'll send a verification code to:</p>
      <p class="signup-email-display" id="signup-email-display"></p>
      <p id="signup-error" class="auth-error" hidden></p>
      <button type="button" id="signup-send-btn" class="auth-submit">Send Verification Code</button>
      <button type="button" id="signup-back" class="auth-link">Back</button>
    </div>
    <form id="signup-step3" class="auth-form" hidden>
      <p class="auth-hint">Enter the 6-digit code sent to <strong id="signup-otp-email"></strong></p>
      <label class="auth-label">
        Verification Code
        <input type="text" name="code" inputmode="numeric" pattern="\\d{6}" maxlength="6" required autocomplete="one-time-code" class="auth-input otp-input" placeholder="000000" />
      </label>
      <label class="auth-label">
        Password
        <input type="password" name="password" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <label class="auth-label">
        Confirm Password
        <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <p id="verify-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Complete Registration</button>
    </form>
  `
  );

  let lookupData = null;

  modal.querySelector("#goto-signin").addEventListener("click", showSignInModal);

  const suffixInput = modal.querySelector("#roll-suffix");
  const lookupBtn = modal.querySelector("#lookup-btn");
  const lookupError = modal.querySelector("#lookup-error");
  const step1 = modal.querySelector("#signup-step1");
  const step2 = modal.querySelector("#signup-step2");
  const step3 = modal.querySelector("#signup-step3");

  lookupBtn.addEventListener("click", async () => {
    const suffix = suffixInput.value.trim();
    if (!/^\d{3}$/.test(suffix)) {
      lookupError.textContent = "Enter exactly 3 digits";
      lookupError.hidden = false;
      return;
    }
    lookupError.hidden = true;
    lookupBtn.disabled = true;
    lookupBtn.textContent = "Looking up...";

    try {
      const res = await fetch(
        `${CMS_API_URL || ""}/api/roster/lookup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suffix }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        lookupError.hidden = false;
        if (data.error === "Already registered") {
          lookupError.innerHTML = 'Already registered. <button type="button" class="auth-link" id="lookup-goto-signin">Sign in instead</button>';
          modal.querySelector("#lookup-goto-signin").addEventListener("click", showSignInModal);
        } else {
          lookupError.textContent = data.error || "Lookup failed";
        }
        return;
      }
      lookupData = { ...data, rollNumber: "240957" + suffix };
      modal.querySelector("#signup-name").textContent = data.name;
      modal.querySelector("#signup-email-display").textContent = data.email;
      step1.hidden = true;
      step2.hidden = false;
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = "Look up";
    }
  });

  suffixInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupBtn.click();
  });

  modal.querySelector("#signup-back").addEventListener("click", () => {
    step2.hidden = true;
    step1.hidden = false;
    suffixInput.focus();
  });

  modal.querySelector("#signup-send-btn").addEventListener("click", async () => {
    const errorEl = step2.querySelector("#signup-error");
    const submitBtn = step2.querySelector("#signup-send-btn");
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await signUp(
        lookupData.email,
        randomPassword(),
        lookupData.name,
        lookupData.rollNumber
      );
      modal.querySelector("#signup-otp-email").textContent = lookupData.email;
      step2.hidden = true;
      step3.hidden = false;
      step3.querySelector('[name="code"]').focus();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Verification Code";
    }
  });

  step3.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#verify-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;

    if (form.password.value !== form.confirmPassword.value) {
      errorEl.textContent = "Passwords do not match";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      await verifyAndSetup(lookupData.email, form.code.value, form.password.value);
      // Now sign in with the password they just set
      await signIn(lookupData.email, form.password.value);
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Complete Registration";
    }
  });
};

const showForgotPasswordModal = () => {
  const modal = createModal(
    "Forgot Password",
    `
    <div id="forgot-step1" class="auth-form">
      <p class="auth-hint">Enter your email and we'll send a code to reset your password.</p>
      <label class="auth-label">
        Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>
      <p id="forgot-error" class="auth-error" hidden></p>
      <button type="button" id="forgot-send-btn" class="auth-submit">Send Reset Code</button>
      <p class="auth-switch">
        <button type="button" class="auth-link" id="forgot-back-signin">Back to Sign In</button>
      </p>
    </div>
    <form id="forgot-step2" class="auth-form" hidden>
      <p class="auth-hint">Enter the 6-digit code sent to <strong id="forgot-otp-email"></strong></p>
      <label class="auth-label">
        Reset Code
        <input type="text" name="code" inputmode="numeric" pattern="\\d{6}" maxlength="6" required autocomplete="one-time-code" class="auth-input otp-input" placeholder="000000" />
      </label>
      <label class="auth-label">
        New Password
        <input type="password" name="password" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <label class="auth-label">
        Confirm Password
        <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <p id="reset-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Reset Password</button>
    </form>
  `
  );

  let resetEmail = "";

  modal.querySelector("#forgot-back-signin").addEventListener("click", showSignInModal);

  const step1 = modal.querySelector("#forgot-step1");
  const step2 = modal.querySelector("#forgot-step2");

  modal.querySelector("#forgot-send-btn").addEventListener("click", async () => {
    const emailInput = step1.querySelector('[name="email"]');
    const errorEl = step1.querySelector("#forgot-error");
    const submitBtn = step1.querySelector("#forgot-send-btn");

    if (!emailInput.reportValidity()) return;

    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await sendResetOTP(emailInput.value);
      resetEmail = emailInput.value;
      modal.querySelector("#forgot-otp-email").textContent = resetEmail;
      step1.hidden = true;
      step2.hidden = false;
      step2.querySelector('[name="code"]').focus();
    } catch (err) {
      errorEl.textContent = err.message || "Failed to send reset code";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Code";
    }
  });

  step2.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#reset-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;

    if (form.password.value !== form.confirmPassword.value) {
      errorEl.textContent = "Passwords do not match";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Resetting...";

    try {
      await resetWithOTP(resetEmail, form.code.value, form.password.value);
      closeModal();
      showSignInModal();
    } catch (err) {
      errorEl.textContent = err.message || "Reset failed";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Reset Password";
    }
  });
};

const updateAuthButton = (user) => {
  if (!authButton) return;
  if (user) {
    authButton.textContent = user.name || user.email;
    authButton.classList.add("auth-btn-signed-in");
    authButton.onclick = showUserMenu;
  } else {
    authButton.textContent = "Sign In";
    authButton.classList.remove("auth-btn-signed-in");
    authButton.onclick = showSignInModal;
  }
};

const showUserMenu = () => {
  const user = getUser();
  if (!user) return;

  const adminBtn = isAdmin()
    ? `<button class="user-menu-item" id="user-menu-admin">Admin Panel</button>`
    : "";

  const modal = createModal(
    user.name || "Account",
    `
    <div class="user-menu">
      <p class="user-menu-email">${user.email.replace(/</g, "&lt;")}</p>
      ${user.role === "admin" ? '<span class="user-menu-badge">Admin</span>' : ""}
      <hr class="user-menu-divider" />
      ${adminBtn}
      <button class="user-menu-item" id="user-menu-upload">Upload File</button>
      <button class="user-menu-item" id="user-menu-submissions">My Submissions</button>
      <button class="user-menu-item user-menu-signout" id="user-menu-signout">Sign Out</button>
    </div>
  `
  );

  modal.querySelector("#user-menu-signout").addEventListener("click", async () => {
    await signOut();
    closeModal();
  });

  const uploadBtn = modal.querySelector("#user-menu-upload");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      closeModal();
      import("./cms-ui.js").then((m) => m.showMultiUploadForm("/contents"));
    });
  }

  const submissionsBtn = modal.querySelector("#user-menu-submissions");
  if (submissionsBtn) {
    submissionsBtn.addEventListener("click", () => {
      closeModal();
      import("./cms-ui.js").then((m) => m.showSubmissions());
    });
  }

  const adminBtnEl = modal.querySelector("#user-menu-admin");
  if (adminBtnEl) {
    adminBtnEl.addEventListener("click", () => {
      closeModal();
      import("./admin-ui.js").then((m) => m.showAdminPanel());
    });
  }
};

export const initAuthUI = (headerEl, modalContainerEl) => {
  modalContainer = modalContainerEl;

  // Create auth button in header
  authButton = document.createElement("button");
  authButton.id = "auth-btn";
  authButton.className = "auth-btn";
  authButton.textContent = "Sign In";
  authButton.onclick = showSignInModal;
  headerEl.appendChild(authButton);

  onAuthChange(updateAuthButton);
  refreshSession();
};
