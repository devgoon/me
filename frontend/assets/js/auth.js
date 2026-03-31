// @ts-nocheck
(function () {
    const loginButton = document.getElementById("microsoft-login");
    const messageEl = document.getElementById("auth-message");
    const LOGIN_URL = "/.auth/login/aad?post_login_redirect_uri=/admin";
    let loginRedirectStarted = false;
    function setMessage(text, isError) {
        if (!messageEl)
            return;
        messageEl.hidden = !text;
        messageEl.textContent = text || "";
        messageEl.classList.toggle("error", Boolean(text && isError));
        messageEl.classList.toggle("ok", Boolean(text && !isError));
    }
    function startLoginRedirect() {
        if (loginRedirectStarted)
            return;
        loginRedirectStarted = true;
        setMessage("Redirecting to Microsoft sign-in...", false);
        window.location.href = LOGIN_URL;
    }
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
        }
        catch (error) {
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
