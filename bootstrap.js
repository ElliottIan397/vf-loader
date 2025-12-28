/* ===============================
   Voiceflow Bootstrap Loader
   =============================== */

console.log("🚀 VF BOOTSTRAP START");

// -------------------------------
// 1. Register extensions FIRST
// -------------------------------
window.vfExtensions = [];

// --- Login form extension ---
window.vfExtensions.push({
  name: "login_form",
  type: "response",

  match: ({ trace }) => {
    console.log("🔍 VF TRACE:", trace);
    return trace?.type === "login_form";
  },

  render: ({ element }) => {
    console.log("🧩 RENDER login_form");

    const container = document.createElement("div");
    container.innerHTML = `
      <div style="font-family:system-ui,sans-serif;padding:8px">
        <form id="vfLoginForm">
          <input type="email" placeholder="Email" required style="width:100%;padding:8px;margin-bottom:8px" />
          <input type="password" placeholder="Password" required style="width:100%;padding:8px;margin-bottom:8px" />
          <button type="button" style="width:100%;padding:10px">Log in</button>
        </form>
      </div>
    `;
    element.appendChild(container);
  }
});

// --- Existing OPEN_SCHEDULER effect ---
window.vfExtensions.push({
  name: "OPEN_SCHEDULER",
  type: "effect",
  match: ({ trace }) =>
    trace?.type === "custom" && trace?.payload?.name === "OPEN_SCHEDULER",
  effect: ({ trace }) => {
    const email = trace?.payload?.payload?.email || "";
    window.parent.postMessage({ type: "OPEN_SCHEDULER", email }, "*");
  }
});

console.log("✅ VF EXTENSIONS REGISTERED", window.vfExtensions);

// -------------------------------
// 2. Load Voiceflow widget
// -------------------------------
(function loadVoiceflow() {
  const s = document.createElement("script");
  s.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  s.type = "text/javascript";

  s.onload = function () {
    console.log("📦 VF WIDGET LOADED");

    window.voiceflow.chat.load({
      verify: { projectID: "68f13d16ad1237134f502fee" },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",

      render: {
        mode: "embedded",
        target: document.getElementById("voiceflow-chat-frame")
      },

      autostart: true,
      assistant: {
        persistence: "localStorage",
        stylesheet: "https://digitolblob.azureedge.net/clientsite/css/skins/blue.css",
        extensions: window.vfExtensions   // ✅ CORRECT LOCATION
      }
    });

    console.log("🎉 VF CHAT INITIALIZED");
  };

  document.head.appendChild(s);
})();
