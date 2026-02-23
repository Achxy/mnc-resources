import {
  getUser,
  onAuthChange,
  refreshSession,
  signIn,
  signUp,
  signOut,
  isAdmin,
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
      <p id="signin-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Sign In</button>
      <p class="auth-switch">
        Don't have an account? <button type="button" class="auth-link" id="goto-signup">Sign Up</button>
      </p>
    </form>
  `
  );

  modal.querySelector("#goto-signup").addEventListener("click", showSignUpModal);
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
    <form id="signup-step2" class="auth-form" hidden>
      <p class="signup-welcome">Welcome, <strong id="signup-name"></strong></p>
      <label class="auth-label">
        Email
        <input type="email" name="email" readonly class="auth-input auth-input-readonly" />
      </label>
      <label class="auth-label">
        Password
        <input type="password" name="password" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <p id="signup-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Sign Up</button>
      <button type="button" id="signup-back" class="auth-link">Back</button>
    </form>
    <div id="signup-success" class="auth-form" hidden>
      <p class="signup-success-msg">Verification email sent! Check your inbox at <strong id="signup-sent-email"></strong>.</p>
      <button type="button" id="signup-done" class="auth-submit">OK</button>
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
      step2.querySelector('[name="email"]').value = data.email;
      step1.hidden = true;
      step2.hidden = false;
      step2.querySelector('[name="password"]').focus();
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

  step2.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#signup-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      await signUp(
        lookupData.email,
        form.password.value,
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
      submitBtn.textContent = "Sign Up";
    }
  });

  modal.querySelector("#signup-done").addEventListener("click", closeModal);
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
