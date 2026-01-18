console.log("🚀 VF BOOTSTRAP START");

window.vfExtensions = [];

(function loadVoiceflow() {
  const script = document.createElement("script");
  script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
  script.type = "text/javascript";

  script.onload = function () {
    const target = document.getElementById("voiceflow-chat-frame");
    console.log("TARGET EXISTS?", !!target);

    window.voiceflow.chat.load({
      verify: { projectID: "68f13d16ad1237134f502fee" },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",
      autostart: false,
      render: target
        ? { mode: "embedded", target }
        : undefined,
      assistant: { extensions: window.vfExtensions }
    });
  };

  document.head.appendChild(script);
})();
