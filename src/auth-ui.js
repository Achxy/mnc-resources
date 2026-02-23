import {
  getUser,
  onAuthChange,
  refreshSession,
  signIn,
  signUp,
  signOut,
  isAdmin,
  requestPasswordReset,
  resetPassword,
  setInitialPassword,
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
        errorEl.textContent = "Email not verified. A new verification email has been sent — check your inbox.";
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
      <p class="auth-hint">We'll send a verification email to:</p>
      <p class="signup-email-display" id="signup-email-display"></p>
      <p id="signup-error" class="auth-error" hidden></p>
      <button type="button" id="signup-send-btn" class="auth-submit">Send Verification Email</button>
      <button type="button" id="signup-back" class="auth-link">Back</button>
    </div>
    <div id="signup-success" class="auth-form" hidden>
      <p class="signup-success-msg">Check your email at <strong id="signup-sent-email"></strong> to complete registration.</p>
      <p class="signup-success-hint">Click the verification link to activate your account and set your password.</p>
      <button type="button" id="signup-done" class="auth-link auth-close-link">Close</button>
    </div>
  `
  );

  let lookupData = null;

  modal.querySelector("#goto-signin").addEventListener("click", showSignInModal);

  const suffixInput = modal.querySelector("#roll-suffix");
  const lookupBtn = modal.querySelector("#lookup-btn");
  const lookupError = modal.querySelector("#lookup-error");
  const step1 = modal.querySelector("#signup-step1");
  const step2 = modal.querySelector("#signup-step2");
  const successEl = modal.querySelector("#signup-success");

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
      step2.hidden = true;
      modal.querySelector("#signup-sent-email").textContent = lookupData.email;
      successEl.hidden = false;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Verification Email";
    }
  });

  modal.querySelector("#signup-done").addEventListener("click", closeModal);
};

const showSetPasswordModal = () => {
  const modal = createModal(
    "Set Your Password",
    `
    <form id="setup-form" class="auth-form">
      <p class="auth-hint">Choose a password to complete your registration.</p>
      <label class="auth-label">
        Password
        <input type="password" name="password" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <label class="auth-label">
        Confirm Password
        <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <p id="setup-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Set Password</button>
    </form>
  `
  );

  // Prevent closing without setting password
  const closeBtn = modal.querySelector(".modal-close");
  closeBtn.remove();

  modal.querySelector("#setup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#setup-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;

    if (form.password.value !== form.confirmPassword.value) {
      errorEl.textContent = "Passwords do not match";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Setting password...";

    try {
      await setInitialPassword(form.password.value);
      history.replaceState(null, "", location.pathname);
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message || "Failed to set password";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
    }
  });
};

const showForgotPasswordModal = () => {
  const modal = createModal(
    "Forgot Password",
    `
    <form id="forgot-form" class="auth-form">
      <p class="auth-hint">Enter your email and we'll send you a link to reset your password.</p>
      <label class="auth-label">
        Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>
      <p id="forgot-error" class="auth-error" hidden></p>
      <p id="forgot-success" class="auth-success" hidden></p>
      <button type="submit" class="auth-submit">Send Reset Link</button>
      <p class="auth-switch">
        <button type="button" class="auth-link" id="forgot-back">Back to Sign In</button>
      </p>
    </form>
  `
  );

  modal.querySelector("#forgot-back").addEventListener("click", showSignInModal);
  modal.querySelector("#forgot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#forgot-error");
    const successEl = form.querySelector("#forgot-success");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;
    successEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await requestPasswordReset(form.email.value);
      successEl.textContent = "If that email is registered, a reset link has been sent. Check your inbox.";
      successEl.hidden = false;
      submitBtn.hidden = true;
    } catch (err) {
      // Don't reveal whether email exists — show generic success
      successEl.textContent = "If that email is registered, a reset link has been sent. Check your inbox.";
      successEl.hidden = false;
      submitBtn.hidden = true;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Link";
    }
  });
};

const showResetPasswordModal = (token) => {
  const modal = createModal(
    "Reset Password",
    `
    <form id="reset-form" class="auth-form">
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

  modal.querySelector("#reset-form").addEventListener("submit", async (e) => {
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
      await resetPassword(form.password.value, token);
      history.replaceState(null, "", location.pathname);
      closeModal();
      showSignInModal();
    } catch (err) {
      errorEl.textContent = err.message || "Reset failed. The link may have expired.";
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

  const params = new URLSearchParams(location.search);

  // After email verification: user is auto-signed-in and redirected with ?setup=1
  // Wait for session to load, then show password setup modal
  if (params.has("setup")) {
    const unsub = onAuthChange((user) => {
      if (user) {
        unsub();
        showSetPasswordModal();
      }
    });
  }

  // Password reset: user clicks reset link in email, redirected with ?token=TOKEN
  const resetToken = params.get("token");
  if (resetToken) {
    showResetPasswordModal(resetToken);
  }
};
