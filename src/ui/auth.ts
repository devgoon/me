// @ts-nocheck
(function() {
  const loginButton = document.getElementById("microsoft-login");
  const messageEl = document.getElementById("auth-message");
  const LOGIN_URL = "/.auth/login/aad?post_login_redirect_uri=/admin";
  let loginRedirectStarted = false;

  /**
   * Sets the authentication message in the UI.
   * @param {string} text - The message text.
   * @param {boolean} isError - Whether the message is an error.
   * @returns {void}
   */
  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.hidden = !text;
    messageEl.textContent = text || "";
    messageEl.classList.toggle("error", Boolean(text && isError));
    messageEl.classList.toggle("ok", Boolean(text && !isError));
  }

  /**
   * Starts the login redirect to Microsoft sign-in.
   * @returns {void}
   */
  function startLoginRedirect() {
    if (loginRedirectStarted) return;
    loginRedirectStarted = true;
    setMessage("Redirecting to Microsoft sign-in...", false);
    window.location.href = LOGIN_URL;
  }

  /**
   * Checks the current authentication session and redirects if not authenticated.
   * @returns {Promise<void>}
   */
  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include"
      });
      if (response.ok) {
        window.location.href = "/admin";
        return;
      }
      startLoginRedirect();
    } catch (error) {
      startLoginRedirect();
    }
  }

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      startLoginRedirect();
    });
  }

  checkSession();
})();
