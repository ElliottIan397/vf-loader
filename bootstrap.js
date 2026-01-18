console.log("🚀 VF BOOTSTRAP START");

// Minimal extensions
window.vfExtensions = [];
window.vfExtensions.push({
  name: "noop",
  type: "effect",
  match: () => false,
  effect: () => {}
});

// 🔴 ADD ONLY THIS
(function testMutationObserver() {
  const observer = new MutationObserver(() => {});
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

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
