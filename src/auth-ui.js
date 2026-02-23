import {
  getUser,
  onAuthChange,
  refreshSession,
  signIn,
  signUp,
  signOut,
  isAdmin,
} from "./auth.js";

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
      errorEl.textContent = err.message;
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
    <form id="signup-form" class="auth-form">
      <label class="auth-label">
        Name
        <input type="text" name="name" required autocomplete="name" class="auth-input" />
      </label>
      <label class="auth-label">
        Username
        <input type="text" name="username" required autocomplete="username" class="auth-input" />
      </label>
      <label class="auth-label">
        Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>
      <label class="auth-label">
        Password
        <input type="password" name="password" required minlength="8" autocomplete="new-password" class="auth-input" />
      </label>
      <p id="signup-error" class="auth-error" hidden></p>
      <button type="submit" class="auth-submit">Sign Up</button>
      <p class="auth-switch">
        Already have an account? <button type="button" class="auth-link" id="goto-signin">Sign In</button>
      </p>
    </form>
  `
  );

  modal.querySelector("#goto-signin").addEventListener("click", showSignInModal);
  modal.querySelector("#signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector("#signup-error");
    const submitBtn = form.querySelector(".auth-submit");
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      await signUp(
        form.email.value,
        form.password.value,
        form.name.value,
        form.username.value
      );
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
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
      <p class="user-menu-email">${user.email}</p>
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
