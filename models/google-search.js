/* =====================================================
   DIGITOL INTERACTIVE MODEL
   Google Search vs. AI Ask & Answer
   ===================================================== */

(function () {

  console.log("📊 Google Search model module loaded");

  async function updateGoogleSearchModel(data) {
    const model = document.getElementById("digitol-model");

    if (!model) {
      console.warn("📊 No Digitol model container found");
      return;
    }

    if (model.dataset.model !== "google-search") {
      console.warn("📊 Google Search update ignored — wrong model");
      return;
    }

    const domainAuthority = Number(data.domain_authority);

    if (
      !Number.isFinite(domainAuthority) ||
      domainAuthority < 0 ||
      domainAuthority > 100
    ) {
      console.error(
        "❌ Invalid Domain Authority received:",
        data.domain_authority
      );
      return;
    }

    console.log(
      "📊 Loading production Google Search Model for DA:",
      domainAuthority
    );

    try {
      const response = await fetch(
        "https://models.digitolservices.com/models/google-search" +
        "?domain_authority=" +
        encodeURIComponent(domainAuthority)
      );

      if (!response.ok) {
        throw new Error(
          `Google Search Model API returned ${response.status}`
        );
      }

      const modelData = await response.json();

      console.log(
        "✅ Production Google Search Model loaded:",
        modelData
      );

      window.__digitolGoogleSearchModel = modelData;

      renderGoogleSearchStage1(modelData);

    } catch (err) {
      console.error(
        "❌ Google Search Model could not be loaded:",
        err
      );
    }
  }


  function initGoogleSearchModel() {
    const model = document.getElementById("digitol-model");

    if (!model) return;

    if (model.dataset.model !== "google-search") return;

    console.log("📊 Initializing Google Search model");

    const results = document.getElementById("digitol-model-results");

    if (!results) return;

    results.innerHTML = `
      <div id="digitol-google-search-stage1" style="
        padding:32px;
        border:1px solid #e3e7ea;
        border-radius:16px;
        background:#ffffff;
        box-shadow:0 8px 28px rgba(0,0,0,0.08);
        font-family:Roboto,Arial,sans-serif;
      ">

        <div style="
          font-size:13px;
          font-weight:600;
          color:#0096c7;
          text-transform:uppercase;
          letter-spacing:1px;
          margin-bottom:8px;
        ">
          Digitol Interactive Model
        </div>

        <h2 style="
          margin:0 0 8px;
          color:#263238;
        ">
          Google Search vs. AI Ask & Answer
        </h2>

        <div style="
          color:#66757f;
          font-size:15px;
          line-height:1.5;
          margin-bottom:28px;
        ">
          Ask Alex to run the model using your website's Domain Authority.
        </div>

        <div id="digitol-stage1-content">
          <div style="
            padding:30px;
            text-align:center;
            background:#f6f8fa;
            border-radius:12px;
            color:#66757f;
          ">
            Waiting for model results...
          </div>
        </div>

      </div>
    `;
  }


  function renderGoogleSearchStage1(modelData) {
    const content = document.getElementById("digitol-stage1-content");

    if (!content || !modelData?.stage1) return;

    const stage1 = modelData.stage1;
    const time = stage1.time;
    const traffic = stage1.traffic;

    const billions = (value) =>
      `${(Number(value) / 1000000000).toFixed(2)}B`;

    const minutes = (value) =>
      Number(value).toFixed(2);

    const percent = (value) =>
      `${(Number(value) * 100).toFixed(0)}%`;

    content.innerHTML = `
      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:20px;
      ">

        <div style="
          padding:24px;
          background:#f6f8fa;
          border-radius:14px;
        ">
          <div style="
            font-size:13px;
            font-weight:600;
            text-transform:uppercase;
            letter-spacing:.8px;
            color:#66757f;
            margin-bottom:18px;
          ">
            Legacy Google Search
          </div>

          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#66757f;">
              Time per Search
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${minutes(time.legacy_minutes_per_search)} min
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#66757f;">
              No-Click Rate
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${percent(traffic.legacy_no_click_rate)}
            </div>
          </div>

          <div>
            <div style="font-size:13px;color:#66757f;">
              Organic Traffic / Day
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${billions(traffic.legacy_organic_traffic)}
            </div>
          </div>
        </div>

        <div style="
          padding:24px;
          background:#eef8fb;
          border:1px solid #cceaf3;
          border-radius:14px;
        ">
          <div style="
            font-size:13px;
            font-weight:600;
            text-transform:uppercase;
            letter-spacing:.8px;
            color:#0096c7;
            margin-bottom:18px;
          ">
            AI Ask & Answer
          </div>

          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#66757f;">
              Time per Search
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${minutes(time.ai_minutes_per_search)} min
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#66757f;">
              No-Click Rate
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${percent(traffic.ai_no_click_rate)}
            </div>
          </div>

          <div>
            <div style="font-size:13px;color:#66757f;">
              Organic Traffic / Day
            </div>
            <div style="font-size:30px;font-weight:700;color:#263238;">
              ${billions(traffic.ai_organic_traffic)}
            </div>
          </div>
        </div>

      </div>
    `;

    console.log("✅ Google Search Stage 1 rendered");
  }


  // Expose only the functions bootstrap.js needs.
  window.DigitolGoogleSearchModel = {
    init: initGoogleSearchModel,
    update: updateGoogleSearchModel
  };

})();
