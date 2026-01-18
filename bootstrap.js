/* =====================================================
   Voiceflow Bootstrap Loader (ROOT DOMAIN)
   Single Source of Truth
   ===================================================== */

console.log("🚀 VF BOOTSTRAP START");

// -----------------------------------------------------
// 1. Detect page mode
// -----------------------------------------------------
const VF_HOME_TARGET_ID = "voiceflow-chat-frame";
const isHomePage = !!document.getElementById(VF_HOME_TARGET_ID);

console.log("📍 VF PAGE MODE:", isHomePage ? "HOME (embedded)" : "NOT HOME (floating)");

// -----------------------------------------------------
// 2. Register extensions FIRST
// -----------------------------------------------------
window.vfExtensions = [];

/* ---------- LOGIN FORM EXTENSION ---------- */
window.vfExtensions.push({
  name: "login_form",
  type: "response",

  match: ({ trace }) => trace?.type === "login_form",

  render: ({ element }) => {
    const container = document.createElement("div");

    container.innerHTML = `
      <div style="font-family:system-ui,sans-serif;padding:8px">
        <form id="vfLoginForm">
          <input
            id="vfEmail"
            type="email"
            placeholder="Email"
            required
            style="width:100%;padding:8px;margin-bottom:8px;box-sizing:border-box"
          />
          <input
            id="vfPassword"
            type="password"
            placeholder="Password"
            required
            style="width:100%;padding:8px;margin-bottom:8px;box-sizing:border-box"
          />
          <button type="submit" style="width:100%;padding:10px;cursor:pointer">
            Log in
          </button>
          <div id="vfErr" style="color:#b00020;margin-top:6px"></div>
        </form>
      </div>
    `;

    element.appendChild(container);

    const form = container.querySelector("#vfLoginForm");
    const emailEl = container.querySelector("#vfEmail");
    const passEl = container.querySelector("#vfPassword");
    const errEl = container.querySelector("#vfErr");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      errEl.textContent = "";

      const email = emailEl.value.trim();
      const password = passEl.value;

      try {
        const res = await fetch(
          "https://vf-nc-gateway.onrender.com/vf/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          }
        );

        if (!res.ok) throw new Error("Login failed");

        const data = await res.json();
        if (!data.sessionToken) throw new Error("No sessionToken");

        container.innerHTML = `
          <div style="text-align:center;color:#2e7d32;font-weight:600">
            ✓ Logged in successfully
          </div>
        `;

        setTimeout(() => {
          window.voiceflow.chat.interact({
            type: "complete",
            payload: { sessionToken: data.sessionToken },
          });
        }, 300);
      } catch (err) {
        errEl.textContent = "Invalid email or password";
      } finally {
        passEl.value = "";
      }
    });
  },
});

window.vfExtensions.push({
  name: "LOGOUT",
  type: "effect",

  match: ({ trace }) =>
    trace?.type === "custom" &&
    trace?.payload?.name === "LOGOUT",

  effect: async ({ trace }) => {
    const sessionToken = trace?.payload?.payload?.sessionToken;

    if (sessionToken) {
      try {
        await fetch("https://vf-nc-gateway.onrender.com/vf/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken })
        });
      } catch (_) {
        // best-effort only
      }
    }

    // 🔴 Required: clear VF persistence
    localStorage.removeItem("voiceflow-webchat-conversation");
    localStorage.removeItem("voiceflow-webchat-session");

    // 🔄 Reset chat cleanly
    if (window.voiceflow?.chat) {
      window.voiceflow.chat.close();
      window.voiceflow.chat.open();
    }
  }
});

/* ---------- OPEN SCHEDULER EFFECT ---------- */
window.vfExtensions.push({
  name: "OPEN_SCHEDULER",
  type: "effect",
  match: ({ trace }) =>
    trace?.type === "custom" && trace?.payload?.name === "OPEN_SCHEDULER",
  effect: ({ trace }) => {
    const email = trace?.payload?.payload?.email || "";
    window.parent.postMessage({ type: "OPEN_SCHEDULER", email }, "*");
  },
});

console.log("✅ VF EXTENSIONS REGISTERED", window.vfExtensions);

/* ---------- DEAD CODE NOT REQUIRED ---------- */
/*function forceLogoutOnNewChat() {
  if (!window.voiceflow?.chat) return;

  const originalOpen = window.voiceflow.chat.open;

  window.voiceflow.chat.open = function (...args) {
    // If a previous session existed, force logout
    if (localStorage.getItem("voiceflow-webchat-session")) {
      console.warn("🔁 New chat started — forcing logout");

      window.voiceflow.chat.interact({
        type: "custom",
        payload: {
          name: "LOGOUT",
          payload: {}
        }
      });
    }

    return originalOpen.apply(this, args);
  };
}*/

(function interceptSessionExpiry() {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    if (!url || !url.includes("/vf/")) return response;

    if (response.status === 401) {
      triggerSessionExpired();
      return response;
    }

    try {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const clone = response.clone();
        const data = await clone.json();
        if (data?.reason === "SESSION_EXPIRED") {
          triggerSessionExpired();
        }
      }
    } catch (_) { }

    return response;
  };

  function triggerSessionExpired() {
    if (window.__vfSessionExpired) return;
    window.__vfSessionExpired = true;

    console.warn("⚠️ VF session expired");

    // 1️⃣ Tell the user (last message before reset)
    window.voiceflow?.chat?.interact({
      type: "text",
      payload:
        "⚠️ Your session has expired. Please log in again to continue."
    });

    // 2️⃣ Trigger the SAME logout effect used everywhere else
    setTimeout(() => {
      window.voiceflow?.chat?.interact({
        type: "custom",
        payload: {
          name: "LOGOUT",
          payload: {}
        }
      });
    }, 300);
  }
})();

// --------------------------------------------------------------
// 2a. Force Logout and variable reset in existing browser session
// --------------------------------------------------------------
function interceptStartNewChat() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (
      btn.id === "vfrc-start-chat" ||
      btn.innerText?.toLowerCase().includes("start new chat")
    ) {
      console.warn("🔁 Start new chat clicked — forcing hard reset");

      // Hard reset VF state
      // localStorage.removeItem("voiceflow-webchat-conversation");
      // localStorage.removeItem("voiceflow-webchat-session");

      // ✅ Delegate ALL reset logic to LOGOUT
      window.voiceflow?.chat?.interact({
        type: "custom",
        payload: { name: "LOGOUT", payload: {} }
      });
    }
  });
}

// -----------------------------------------------------
// 3. Load Voiceflow widget (ONCE)
// -----------------------------------------------------
(function loadVoiceflow() {
  const script = document.createElement("script");
  script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  script.type = "text/javascript";

  script.onload = function () {
    console.log("📦 VF WIDGET LOADED");

    const loadConfig = {
      verify: { projectID: "68f13d16ad1237134f502fee" },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",
      autostart: true,
      assistant: {
        persistence: "localStorage",
        stylesheet:
          "https://digitolblob.azureedge.net/clientsite/css/skins/blue.css",
        extensions: window.vfExtensions,
      },
    };

    if (isHomePage) {
      loadConfig.render = {
        mode: "embedded",
        target: document.getElementById(VF_HOME_TARGET_ID),
      };
    }

    window.voiceflow.chat.load(loadConfig).then(() => {
      console.log("🎉 VF CHAT INITIALIZED");

      // ✅ CALL IT HERE (single line)
      interceptStartNewChat();

      const hasConversation = localStorage.getItem(
        "voiceflow-webchat-conversation"
      );

      if (hasConversation) {
        window.voiceflow.chat.open();
      }
    });

    function applyFullWidthIfHome() {
      if (!isHomePage) return;

      const vfHost = document.getElementById("voiceflow-chat-frame");
      const shadowRoot = vfHost?.shadowRoot;
      if (!shadowRoot) return;

      if (shadowRoot.querySelector("#vf-fullwidth-override")) return;

      const style = document.createElement("style");
      style.id = "vf-fullwidth-override";
      style.textContent = `
    .vfrc-chat {
      width: 100% !important;
      max-width: 100% !important;
    }
  `;

      shadowRoot.appendChild(style);
    }

    if (isHomePage) {
      // Attempt immediately (covers fast-load case)
      applyFullWidthIfHome();

      // Fallback observer (covers async / delayed mount)
      const observer = new MutationObserver(() => {
        const vfHost = document.getElementById("voiceflow-chat-frame");
        if (vfHost?.shadowRoot) {
          applyFullWidthIfHome();
          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ---------- ?q= PRE-SEED SUPPORT ---------- */
    (function autoSendQuery() {
      const params = new URLSearchParams(location.search);
      const raw = params.get("q");
      if (!raw || window.__vf_preQ_sent) return;

      const preQ = raw.replace(/\+/g, " ").trim();
      let tries = 0;

      const timer = setInterval(() => {
        const api = window.voiceflow?.chat;
        if (api && typeof api.interact === "function") {
          clearInterval(timer);
          window.__vf_preQ_sent = true;

          try {
            api.open();
            api.interact({ type: "launch" });
            setTimeout(() => {
              api.interact({ type: "text", payload: preQ });
            }, 400);
          } catch (e) {
            console.error("VF preQ send failed", e);
          }
        } else if (++tries > 60) {
          clearInterval(timer);
          console.warn("VF API not ready for preQ");
        }
      }, 250);
    })();
  };

  document.head.appendChild(script);
})();

/* =====================================================
   ✅ FORCE TOP OF PAGE — REQUIRED FOR EMBEDDED VF
   ===================================================== */
window.onload = function () {
  window.scrollTo(0, 0);
};