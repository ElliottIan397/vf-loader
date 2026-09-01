/* =====================================================
   Voiceflow Bootstrap Loader (ROOT DOMAIN)
   Single Source of Truth
   ===================================================== */

console.log("🚀 VF BOOTSTRAP START");

// 🔴 HARD RESET MODAL STATE ON LOAD
if (document.body) {
  document.body.classList.remove("vf-modal-open");
  document.body.style.top = "";
  document.querySelector(".vf-backdrop")?.remove();
  delete document.body.dataset.vfScrollY;
}

// Global State Flag (define ONCE)
window.__vfModalActivated = false;

// -----------------------------------------------------
// 1. Detect page mode
// -----------------------------------------------------
const VF_HOME_TARGET_ID = "voiceflow-chat-frame";
const isHomePage = !!document.getElementById(VF_HOME_TARGET_ID);
const isPhone = window.innerWidth < 768;

// -----------------------------------------------------
// Resolve site-specific configuration
// -----------------------------------------------------
const VF_HOSTNAME = window.location.hostname
  .toLowerCase()
  .replace(/^www\./, "");

const VF_SITE_CONFIG = window.VF_SITES?.[VF_HOSTNAME] || null;

console.log("🌐 VF HOSTNAME:", VF_HOSTNAME);
console.log("⚙️ VF SITE CONFIG:", VF_SITE_CONFIG);


console.log("🧪 isHomePage =", isHomePage);
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
    deactivateVFModal(); // ✅ ADD THIS LINE (FIRST)
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
    trace?.type === "OPEN_SCHEDULER" ||
    trace?.payload?.name === "OPEN_SCHEDULER",

  effect: ({ trace }) => {
    const discoverySummary =
      trace?.payload?.discovery_summary || "";

    if (discoverySummary) {
      sessionStorage.setItem(
        "apollo_discovery_summary",
        discoverySummary
      );

      console.log(
        "📝 Apollo discovery summary captured",
        discoverySummary
      );
    }

    // Generate a unique ID for this Voiceflow → HubSpot handoff
    const handoffId = crypto.randomUUID();

    sessionStorage.setItem(
      "apollo_ai_handoff_id",
      handoffId
    );

    console.log(
      "🔗 Apollo AI handoff ID generated",
      handoffId
    );

    openHubSpotScheduler(handoffId);
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

// Modal CSS +helper for freeze and blur
function injectVFModalCSS() {
  console.warn("🧪 injectVFModalCSS CALLED");

  if (document.getElementById("vf-modal-css")) {
    console.warn("🧪 vf-modal-css already exists");
    return;
  }

  const style = document.createElement("style");
  style.id = "vf-modal-css";
  style.textContent = `
    body.vf-modal-open {
      overflow: hidden !important;
      position: fixed;
      width: 100%;
    }

    .vf-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(6px);
      z-index: 9998;
    }

.vf-modal-close {
  position: fixed;
  top: 18px;
  right: 22px;
  z-index: 10001;

  padding: 9px 16px;

  border: 1px solid rgba(255,255,255,0.65);
  border-radius: 20px;

  background: rgba(0,0,0,0.55);
  color: #fff;

  font-size: 14px;
  font-weight: 500;
  line-height: 1;

  cursor: pointer;
}

.vf-modal-close:hover {
  background: rgba(0,0,0,0.75);
}

#voiceflow-chat-frame {
  position: relative;
  z-index: 9999;
}

/* Command Center state */
body.vf-modal-open #voiceflow-chat-frame {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;

  width: min(1000px, calc(100vw - 60px)) !important;
  height: min(680px, calc(100vh - 60px)) !important;

  margin: 0 !important;
  z-index: 9999 !important;

  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.30);
}

body.vf-modal-open #voiceflow-chat-frame {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;

  width: min(1000px, calc(100vw - 60px)) !important;
  height: min(680px, calc(100vh - 60px)) !important;

  margin: 0 !important;
  z-index: 9999 !important;

  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.30);
}

/* Tablet landscape: reserve space above Command Center for Close control */
@media (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
  body.vf-modal-open #voiceflow-chat-frame {
    top: calc(50% + 24px) !important;
    height: min(680px, calc(100vh - 108px)) !important;
  }
}

/* -------------------------------------------------
   Compact resting Agent shell
   ------------------------------------------------- */

#vf-resting-shell {
  width: 100%;
  min-height: 220px;
  margin: 24px 0;
  padding: 28px 32px;

  display: flex;
  align-items: center;
  gap: 36px;

  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 18px;

  box-shadow: 0 10px 35px rgba(0,0,0,0.10);

  box-sizing: border-box;
  cursor: pointer;
}

.vf-resting-agent {
  width: 38%;
  display: flex;
  align-items: center;
  gap: 20px;
}

.vf-resting-avatar {
  flex: 0 0 84px;
}

.vf-resting-avatar-img {
  width: 84px;
  height: 84px;
  display: block;
  object-fit: cover;
  border-radius: 50%;
}

.vf-resting-copy {
  flex: 1;
}

.vf-resting-title {
  font-size: 28px;
  line-height: 1.15;
  font-weight: 600;
  margin-bottom: 5px;
}

.vf-resting-subtitle {
  font-size: 17px;
  font-weight: 500;
  color: ${VF_SITE_CONFIG.accentColor};
  margin-bottom: 14px;
}

.vf-resting-description {
  font-size: 14px;
  line-height: 1.45;
  color: #555;
}

.vf-resting-action {
  width: 62%;
}

.vf-resting-input {
  min-height: 78px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 16px 0 22px;

  border: 2px solid #ddd;
  border-radius: 14px;

  color: #777;
  font-size: 15px;

  background: #fff;
}

.vf-resting-query {
  flex: 1;
  min-width: 0;

  border: 0;
  outline: 0;
  background: transparent;

  font: inherit;
  color: #333;

  padding: 0 18px 0 0;
}

.vf-resting-query::placeholder {
  color: #777;
  opacity: 1;
}

.vf-resting-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.vf-resting-prompt {
  padding: 7px 14px;

  border: 1px solid #d7d7d7;
  border-radius: 18px;

  background: #f7f7f7;
  color: #555;

  font-size: 13px;
  line-height: 1.2;

  cursor: pointer;

  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.vf-resting-prompt:hover {
  background: #fff;
  border-color: #aaa;
}

.vf-resting-send {
  flex: 0 0 54px;
  width: 54px;
  height: 54px;

  border: 0;
  border-radius: 50%;

  background: ${VF_SITE_CONFIG.accentColor};
  color: #fff;

  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

@media (max-width: 767px) {
  #vf-resting-shell {
    flex-direction: column;
    align-items: stretch;
    padding: 22px;
    gap: 20px;
  }

  .vf-resting-agent,
  .vf-resting-action {
    width: 100%;
  }
}
  `;
  document.head.appendChild(style);
}

function positionVFModalClose() {
  const closeButton = document.querySelector(".vf-modal-close");
  const vfFrame = document.getElementById("voiceflow-chat-frame");

  if (!closeButton || !vfFrame) return;

  const rect = vfFrame.getBoundingClientRect();

  // Anchor just above the Command Center's top-right corner
  closeButton.style.top = `${Math.max(8, rect.top - closeButton.offsetHeight - 8)}px`;
  closeButton.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
}

function activateVFModal() {
  // ✅ Ensure widget is visible BEFORE freezing
  if (isPhone) return;
  if (isHomePage && window.voiceflow?.chat) {
    window.voiceflow.chat.open();
  }

  injectVFModalCSS();

  const scrollY = window.scrollY;
  document.body.dataset.vfScrollY = scrollY;

  document.body.style.top = `-${scrollY}px`;
  document.body.classList.add("vf-modal-open");

  if (!document.querySelector(".vf-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "vf-backdrop";

    backdrop.addEventListener("click", () => {
      console.warn("🧪 Backdrop clicked → unfreeze");
      deactivateVFModal();
    });

    document.body.appendChild(backdrop);
  }
  // Visible exit control for Command Center
  if (!document.querySelector(".vf-modal-close")) {
    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "vf-modal-close";
    closeButton.innerHTML = "&times;&nbsp; Close";
    closeButton.setAttribute("aria-label", "Close Command Center");

    closeButton.addEventListener("click", () => {
      deactivateVFModal();
    });

    document.body.appendChild(closeButton);

    requestAnimationFrame(() => {
      positionVFModalClose();
    });
  }
}

function applyFullWidthIfHome() {
  if (!isHomePage) return;

  // Compact resting state for embedded home-page Agent
  const vfFrame = document.getElementById("voiceflow-chat-frame");
  if (vfFrame) {
    vfFrame.style.width = "100%";
    vfFrame.style.height = "480px";
  }

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

function deactivateVFModal() {
  const scrollY = document.body.dataset.vfScrollY;

  document.body.classList.remove("vf-modal-open");
  document.body.style.top = "";
  document.querySelector(".vf-backdrop")?.remove();
  document.querySelector(".vf-modal-close")?.remove();

  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY, 10));
    delete document.body.dataset.vfScrollY;
  }

  // After first engagement, keep the real Voiceflow conversation
  // visible in its normal embedded home-page position.
  if (isHomePage) {
    const vfHost = document.getElementById(VF_HOME_TARGET_ID);
    const shell = document.getElementById("vf-resting-shell");

    if (shell) {
      shell.style.display = "none";
    }

    if (vfHost) {
      vfHost.style.display = "block";
    }

    setTimeout(() => {
      applyFullWidthIfHome();
    }, 50);
  }

  // Re-enable Command Center activation for the next interaction.
  // Existing event listeners remain attached.
  window.__vfModalActivated = false;
}

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

      deactivateVFModal(); // ✅ ADD THIS LINE

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

// First Interaction Freeze Background    
function armFirstInteractionFreeze() {
  if (!isHomePage) return;

  const vfHost = document.getElementById("voiceflow-chat-frame");
  if (!vfHost) {
    console.warn("🧪 VF host not found — cannot arm freeze");
    return;
  }

  console.log("🧪 arming DOM-based first interaction listener");

  const handler = (e) => {
    if (window.__vfModalActivated) return;
    if (!e.isTrusted) return;

    const vfHost = document.getElementById("voiceflow-chat-frame");
    if (!vfHost) return;

    // --- POINTER EVENTS ---
    if (e.type === "pointerdown") {
      const path = e.composedPath?.() || [];
      const originatedInsideVF =
        path.includes(vfHost) || vfHost.contains(e.target);

      if (!originatedInsideVF) return;

      window.__vfModalActivated = true;
      activateVFModal();
      return;
    }

    // --- KEYBOARD EVENTS ---
    if (e.type === "keydown") {
      const active = document.activeElement;

      const vfHasFocus =
        active === vfHost ||
        vfHost.contains(active) ||
        active?.tagName === "IFRAME";

      if (!vfHasFocus) return;

      window.__vfModalActivated = true;
      activateVFModal();
    }
  };

  vfHost.addEventListener("keydown", handler, true);
  vfHost.addEventListener("pointerdown", handler, true);
}

function armWhenVFReady() {
  if (!isHomePage) return;

  console.log("🧪 armWhenVFReady: waiting for VF DOM");

  const observer = new MutationObserver(() => {
    const vfHost = document.getElementById("voiceflow-chat-frame");

    if (!vfHost) return;

    // Embedded widget DOM is now real
    console.log("🧪 VF DOM ready — arming first interaction freeze");

    observer.disconnect();
    armFirstInteractionFreeze();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// -----------------------------------------------------
// Custom compact Agent resting shell
// -----------------------------------------------------
function createVFRestingShell() {
  if (isPhone) return;
  if (!isHomePage) return;
  if (document.getElementById("vf-resting-shell")) return;

  // Ensure resting-shell styling exists immediately on page load
  injectVFModalCSS();

  const vfHost = document.getElementById(VF_HOME_TARGET_ID);
  if (!vfHost) return;

  const shell = document.createElement("div");
  shell.id = "vf-resting-shell";

  shell.innerHTML = `
    <div class="vf-resting-agent">

 <div class="vf-resting-avatar">
  <img
    class="vf-resting-avatar-img"
    src="${VF_SITE_CONFIG.avatarUrl}"
    alt="${VF_SITE_CONFIG.agentName} AI Agent"
  />
</div>

      <div class="vf-resting-copy">
        <div class="vf-resting-title">
  Chat with ${VF_SITE_CONFIG.agentName}
</div>

        <div class="vf-resting-subtitle">
  ${VF_SITE_CONFIG.subtitle}
</div>

<div class="vf-resting-description">
  ${VF_SITE_CONFIG.description}
</div>
      </div>

    </div>

    <div class="vf-resting-action">

<div class="vf-resting-input">
  <input
    type="text"
    class="vf-resting-query"
    placeholder="${VF_SITE_CONFIG.inputPlaceholder}"
    autocomplete="off"
  />

  <button
    type="button"
    class="vf-resting-send"
    aria-label="Ask AI Agent"
  >
    &#8594;
  </button>
</div>

<div class="vf-resting-prompts">
  ${VF_SITE_CONFIG.prompts.map(prompt => `
    <button
      type="button"
      class="vf-resting-prompt"
      data-query="${prompt.query}"
    >
      ${prompt.label}
    </button>
  `).join("")}
</div>

    </div>
  `;

  vfHost.parentNode.insertBefore(shell, vfHost);

  const queryInput = shell.querySelector(".vf-resting-query");
  const sendButton = shell.querySelector(".vf-resting-send");
  const promptButtons = shell.querySelectorAll(".vf-resting-prompt");

  function openCommandCenter(query = "") {
    const cleanQuery = query.trim();

    shell.style.display = "none";
    vfHost.style.display = "block";

    window.__vfModalActivated = true;
    activateVFModal();

    // If the visitor entered a question in the resting shell,
    // hand it directly to Voiceflow after Command Center opens.
    if (cleanQuery) {
      setTimeout(() => {
        const api = window.voiceflow?.chat;

        if (!api || typeof api.interact !== "function") {
          console.warn("VF API not ready for resting-shell query");
          return;
        }

        console.log("🚀 Sending resting-shell query to Voiceflow:", cleanQuery);

        api.interact({
          type: "text",
          payload: cleanQuery
        });
      }, 400);
    }
  }

  // Clicking into the input must NOT open Command Center
  queryInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Arrow: capture query and open
  sendButton.addEventListener("click", (e) => {
    e.stopPropagation();
    openCommandCenter(queryInput.value);
  });

  // Enter: capture query and open
  queryInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    e.stopPropagation();

    openCommandCenter(queryInput.value);
  });

  // Suggested prompts: open Command Center and send configured query
  promptButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const query = button.dataset.query || "";

      openCommandCenter(query);
    });
  });

  // Clicking elsewhere on the resting card opens normally
  shell.addEventListener("click", () => {
    openCommandCenter();
  });
}

/* =====================================================
   HUBSPOT MEETINGS — COMMAND CENTER SCHEDULER
   Phase 1: Inline scheduler + diagnostic event logging
   ===================================================== */

const VF_HUBSPOT_MEETING_URL =
  "https://info.digitolservices.com/meetings/ianelliott30";

function injectVFSchedulerCSS() {
  if (document.getElementById("vf-scheduler-css")) return;

  const style = document.createElement("style");
  style.id = "vf-scheduler-css";

  style.textContent = `
    #vf-scheduler-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);

      width: min(1000px, calc(100vw - 60px));
      height: min(680px, calc(100vh - 60px));

      z-index: 10000;

      display: flex;
      flex-direction: column;

      background: #fff;
      border-radius: 16px;
      overflow: hidden;

      box-shadow: 0 24px 70px rgba(0,0,0,0.30);
    }

    .vf-scheduler-header {
      flex: 0 0 auto;

      display: flex;
      align-items: center;
      gap: 22px;

      padding: 18px 24px;

      background: #fff;
      border-bottom: 1px solid #e5e5e5;
    }

    .vf-scheduler-back {
      flex: 0 0 auto;

      padding: 9px 14px;

      border: 1px solid #d5d5d5;
      border-radius: 20px;

      background: #fff;
      color: #333;

      font-size: 14px;
      font-weight: 500;

      cursor: pointer;
    }

    .vf-scheduler-back:hover {
      background: #f5f5f5;
    }

    .vf-scheduler-heading {
      min-width: 0;
    }

    .vf-scheduler-title {
      margin: 0 0 3px;

      font-size: 20px;
      line-height: 1.2;
      font-weight: 600;

      color: #222;
    }

    .vf-scheduler-subtitle {
      margin: 0;

      font-size: 14px;
      line-height: 1.35;

      color: #666;
    }

    .vf-scheduler-body {
      flex: 1 1 auto;
      min-height: 0;

      overflow-y: auto;
      background: #fff;
    }

    .vf-scheduler-body .meetings-iframe-container {
      width: 100%;
      min-height: 100%;
    }

    .vf-scheduler-body iframe {
      width: 100% !important;
      min-height: 580px !important;
      border: 0 !important;
    }

    body.vf-scheduler-open #voiceflow-chat-frame {
      visibility: hidden !important;
      pointer-events: none !important;
    }

    /* Match existing Command Center tablet treatment */
    @media (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
      #vf-scheduler-panel {
        top: calc(50% + 24px);
        height: min(680px, calc(100vh - 108px));
      }
    }
  `;

  document.head.appendChild(style);
}


function loadHubSpotMeetingsScript() {
  return new Promise((resolve, reject) => {
    if (window.__vfHubSpotMeetingsLoaded) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"]'
    );

    if (existing) {
      window.__vfHubSpotMeetingsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";

    script.type = "text/javascript";
    script.async = true;

    script.onload = () => {
      console.log("📅 HubSpot Meetings embed loaded");
      window.__vfHubSpotMeetingsLoaded = true;
      resolve();
    };

    script.onerror = (err) => {
      console.error("❌ HubSpot Meetings embed failed to load", err);
      reject(err);
    };

    document.head.appendChild(script);
  });
}


async function openHubSpotScheduler(handoffId = "") {
  if (isPhone) {
    console.warn("📅 Scheduler Command Center disabled on phone");
    return;
  }

const meetingUrl =
  VF_HUBSPOT_MEETING_URL +
  "?embed=true" +
  "&utm_campaign=" + encodeURIComponent(handoffId) +
  "&utm_source=apollo_ai" +
  "&utm_medium=voiceflow";

console.log("📅 Opening HubSpot scheduler", {
  handoffId,
  meetingUrl
});

injectVFSchedulerCSS();

  // Ensure the normal Command Center/modal environment exists.
  if (!document.body.classList.contains("vf-modal-open")) {
    window.__vfModalActivated = true;
    activateVFModal();
  }

  // Avoid duplicate scheduler panels.
  document.getElementById("vf-scheduler-panel")?.remove();

  const panel = document.createElement("div");
  panel.id = "vf-scheduler-panel";

  panel.innerHTML = `
    <div class="vf-scheduler-header">

      <button
        type="button"
        class="vf-scheduler-back"
        aria-label="Back to conversation"
      >
        &#8592; Back to conversation
      </button>

      <div class="vf-scheduler-heading">
        <div class="vf-scheduler-title">
          Schedule Your Facility Assessment
        </div>

        <div class="vf-scheduler-subtitle">
          Choose a convenient time below.
        </div>
      </div>

    </div>

    <div class="vf-scheduler-body">

      <div
        class="meetings-iframe-container"
        data-src="${meetingUrl}">
      </div>

    </div>
  `;

  panel
    .querySelector(".vf-scheduler-back")
    .addEventListener("click", () => {
      closeHubSpotScheduler();
    });

  document.body.appendChild(panel);
  document.body.classList.add("vf-scheduler-open");

  try {
    await loadHubSpotMeetingsScript();
  } catch (err) {
    console.error("Unable to initialize HubSpot scheduler", err);
  }
}


function closeHubSpotScheduler() {
  console.log("📅 Closing HubSpot scheduler");

  document.body.classList.remove("vf-scheduler-open");
  document.getElementById("vf-scheduler-panel")?.remove();

  const vfFrame = document.getElementById("voiceflow-chat-frame");

  if (vfFrame) {
    vfFrame.style.display = "block";
  }

  // Keep the existing Command Center active.
  document.body.classList.add("vf-modal-open");

  requestAnimationFrame(() => {
    positionVFModalClose();
  });

  console.log("💬 Returned to Voiceflow conversation");
}

/* -----------------------------------------------------
   HUBSPOT MESSAGE DIAGNOSTIC
   Temporary — Phase 1 only
   ----------------------------------------------------- */

window.addEventListener("message", (event) => {
  const origin = String(event.origin || "").toLowerCase();

  if (
    origin.includes("hubspot") ||
    origin.includes("hsappstatic") ||
    origin.includes("digitolservices")
  ) {
    console.log(
      "🧪 HUBSPOT MESSAGE",
      {
        origin: event.origin,
        data: event.data
      }
    );
  }
});

// -----------------------------------------------------
// 3. Load Voiceflow widget (ONCE)
// -----------------------------------------------------
(function loadVoiceflow() {
  const script = document.createElement("script");
  script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  script.type = "text/javascript";

  script.onload = function () {
    console.log("📦 VF WIDGET LOADED");

    // Build compact resting shell on embedded home page
    createVFRestingShell();

    const loadConfig = {
      verify: { projectID: VF_SITE_CONFIG.projectID },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",
      autostart: !isHomePage,
      assistant: {
        persistence: "localStorage",
        stylesheet:
          "https://digitolblob.azureedge.net/clientsite/css/skins/blue.css",
        extensions: window.vfExtensions,
      },
    };

    if (isHomePage && !isPhone) {
      loadConfig.render = {
        mode: "embedded",
        target: document.getElementById(VF_HOME_TARGET_ID),
      };
    }

    window.voiceflow.chat.load(loadConfig).then(() => {
      console.log("🎉 VF CHAT INITIALIZED");

      armWhenVFReady();
      interceptStartNewChat();

      // Home page starts with custom resting shell,
      // not the native Voiceflow interface.
      if (isHomePage) {
        const vfHost = document.getElementById(VF_HOME_TARGET_ID);
        if (vfHost) {
          vfHost.style.display = "none";
        }
      }
    });


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
