console.log("🚀 VF BOOTSTRAP START");

// Minimal extensions container (safe to keep)
window.vfExtensions = [];

(function loadVoiceflow() {
  const script = document.createElement("script");
  script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  script.type = "text/javascript";

  script.onload = function () {
    const target = document.getElementById("voiceflow-chat-frame");

    if (target) {
      // 🔴 KEY FIX: delay embedded render until DOM is ready
      document.addEventListener("DOMContentLoaded", () => {
        window.voiceflow.chat.load({
          verify: { projectID: "68f13d16ad1237134f502fee" },
          url: "https://general-runtime.voiceflow.com",
          versionID: "production",
          autostart: false,
          render: {
            mode: "embedded",
            target
          },
          assistant: {
            extensions: window.vfExtensions
          }
        });
      });
    } else {
      // Floating widget (non-home pages)
      window.voiceflow.chat.load({
        verify: { projectID: "68f13d16ad1237134f502fee" },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        autostart: true,
        assistant: {
          extensions: window.vfExtensions
        }
      });
    }
  };

  document.head.appendChild(script);
})();
