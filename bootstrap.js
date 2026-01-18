console.log("🚀 VF BOOTSTRAP START");

// 🔴 ADD ONLY THESE DOM READS
const VF_HOME_TARGET_ID = "voiceflow-chat-frame";
const isHomePage = !!document.getElementById(VF_HOME_TARGET_ID);
console.log("isHomePage =", isHomePage);

// Minimal extensions
window.vfExtensions = [];
window.vfExtensions.push({
  name: "noop",
  type: "effect",
  match: () => false,
  effect: () => {}
});

(function loadVoiceflow() {
  const script = document.createElement("script");
  script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  script.type = "text/javascript";

  script.onload = function () {
    window.voiceflow.chat.load({
      verify: { projectID: "68f13d16ad1237134f502fee" },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",
      autostart: false,
      assistant: {
        extensions: window.vfExtensions
      }
    });
  };

  document.head.appendChild(script);
})();
