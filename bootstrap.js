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
        const container = document.createElement("div");

        container.innerHTML = `
    <div style="font-family:system-ui,sans-serif;padding:8px">
      <form id="vfLoginForm">
        <input id="vfEmail" type="email" placeholder="Email" required />
        <input id="vfPassword" type="password" placeholder="Password" required />
        <button type="submit">Log in</button>
        <div id="vfErr" style="color:#b00020;margin-top:6px"></div>
      </form>
    </div>
  `;

        element.appendChild(container);

        const form = container.querySelector("#vfLoginForm");
        const emailEl = container.querySelector("#vfEmail");
        const passEl = container.querySelector("#vfPassword");
        const err = container.querySelector("#vfErr");

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const email = emailEl.value.trim();
            const password = passEl.value;

            try {
                const res = await fetch("https://vf-nc-gateway.onrender.com/vf/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();
                if (!res.ok || !data.sessionToken) throw new Error();

                // ONLY NOW VF CONTINUES
                window.voiceflow.chat.interact({
                    type: "complete",
                    payload: { sessionToken: data.sessionToken }
                });

            } catch {
                err.textContent = "Invalid email or password";
            } finally {
                passEl.value = "";
            }
        });
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
