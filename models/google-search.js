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
            renderGoogleSearchStage2(modelData);

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

        <div id="digitol-google-search-stage2" style="
          margin-top:28px;
          padding-top:28px;
          border-top:1px solid #e3e7ea;
        ">
          <div style="
            font-size:13px;
            font-weight:600;
            color:#0096c7;
            text-transform:uppercase;
            letter-spacing:1px;
            margin-bottom:8px;
          ">
            Organic Traffic Distribution
          </div>

          <h3 style="
            margin:0 0 8px;
            color:#263238;
          ">
            What This Means for a Website Like Yours
          </h3>

          <div id="digitol-stage2-content" style="
            color:#66757f;
            font-size:15px;
            line-height:1.5;
          ">
            Loading organic traffic model...
          </div>
        </div>

      </div>
    `;

  // Load the default model immediately on page open.
  // Alex can later replace this with the visitor's actual DA.
  updateGoogleSearchModel({
    domain_authority: 24
  });
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

function renderGoogleSearchStage2(modelData) {
  const content = document.getElementById("digitol-stage2-content");

  if (!content || !modelData?.stage2?.series?.length) return;

  const series = modelData.stage2.series;
  const first = series[0];
  const last = series[series.length - 1];

  const formatNumber = (value, decimals = 1) =>
    Number(value).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

  const formatCompact = (value) => {
    const n = Number(value);

    if (n >= 1000000000) {
      return `${(n / 1000000000).toFixed(2)}B`;
    }

    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(1)}M`;
    }

    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`;
    }

    return n.toFixed(0);
  };

  /* -----------------------------------------------------
     Build SVG line chart from production API series
     ----------------------------------------------------- */

  const chartWidth = 900;
  const chartHeight = 300;

  const padding = {
    top: 25,
    right: 25,
    bottom: 45,
    left: 65
  };

  const plotWidth =
    chartWidth - padding.left - padding.right;

  const plotHeight =
    chartHeight - padding.top - padding.bottom;

  const values = series.map(
    item => Number(item.visits_per_site_per_day)
  );

  const maxValue = Math.max(...values);

  // Give the top of the chart a little breathing room.
  const yMax = maxValue * 1.1;

  const xForIndex = (index) =>
    padding.left +
    (index / (series.length - 1)) * plotWidth;

  const yForValue = (value) =>
    padding.top +
    plotHeight -
    (Number(value) / yMax) * plotHeight;

  const points = series
    .map((item, index) => {
      return `${xForIndex(index)},${yForValue(
        item.visits_per_site_per_day
      )}`;
    })
    .join(" ");

  const yTicks = 4;

  let gridLines = "";

  for (let i = 0; i <= yTicks; i++) {
    const value = (yMax / yTicks) * i;
    const y = yForValue(value);

    gridLines += `
      <line
        x1="${padding.left}"
        y1="${y}"
        x2="${chartWidth - padding.right}"
        y2="${y}"
        stroke="#e3e7ea"
        stroke-width="1"
      />

      <text
        x="${padding.left - 12}"
        y="${y + 4}"
        text-anchor="end"
        font-size="12"
        fill="#66757f"
      >
        ${formatNumber(value, 1)}
      </text>
    `;
  }

  const labelYears = [2014, 2018, 2022, 2026, 2030];

  const xLabels = labelYears
    .map(year => {
      const index = series.findIndex(
        item => Number(item.year) === year
      );

      if (index === -1) return "";

      const x = xForIndex(index);

      return `
        <text
          x="${x}"
          y="${chartHeight - 12}"
          text-anchor="middle"
          font-size="12"
          fill="#66757f"
        >
          ${year}
        </text>
      `;
    })
    .join("");

  const dataPoints = series
    .map((item, index) => {
      const x = xForIndex(index);
      const y = yForValue(
        item.visits_per_site_per_day
      );

      return `
        <circle
          cx="${x}"
          cy="${y}"
          r="3.5"
          fill="#0096c7"
        >
          <title>
            ${item.year}: ${formatNumber(
              item.visits_per_site_per_day,
              2
            )} visits/site/day
          </title>
        </circle>
      `;
    })
    .join("");

  content.innerHTML = `

    <div style="
      display:flex;
      flex-wrap:wrap;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      margin-bottom:24px;
    ">

      <div>
        <div style="
          font-size:13px;
          color:#66757f;
          margin-bottom:5px;
        ">
          Domain Authority
        </div>

        <div style="
          font-size:24px;
          font-weight:700;
          color:#263238;
        ">
          ${modelData.domain_authority}
        </div>
      </div>

      <div style="
        padding:8px 14px;
        background:#eef8fb;
        border:1px solid #cceaf3;
        border-radius:20px;
        font-size:13px;
        font-weight:600;
        color:#0096c7;
      ">
        DA Band ${modelData.da_band}
      </div>

    </div>


    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin-bottom:26px;
    ">

      <div style="
        padding:18px;
        background:#f6f8fa;
        border-radius:12px;
      ">
        <div style="
          font-size:13px;
          color:#66757f;
          margin-bottom:6px;
        ">
          ${first.year} Organic Visits / Site / Day
        </div>

        <div style="
          font-size:28px;
          font-weight:700;
          color:#263238;
        ">
          ${formatNumber(
            first.visits_per_site_per_day,
            2
          )}
        </div>
      </div>

      <div style="
        padding:18px;
        background:#eef8fb;
        border:1px solid #cceaf3;
        border-radius:12px;
      ">
        <div style="
          font-size:13px;
          color:#66757f;
          margin-bottom:6px;
        ">
          ${last.year} Organic Visits / Site / Day
        </div>

        <div style="
          font-size:28px;
          font-weight:700;
          color:#263238;
        ">
          ${formatNumber(
            last.visits_per_site_per_day,
            2
          )}
        </div>
      </div>

    </div>


    <div style="
      margin-bottom:10px;
      font-size:14px;
      font-weight:600;
      color:#263238;
    ">
      Estimated Organic Visits per Website / Day
    </div>

    <div style="
      width:100%;
      overflow-x:auto;
      margin-bottom:28px;
    ">

      <svg
        viewBox="0 0 ${chartWidth} ${chartHeight}"
        role="img"
        aria-label="Organic visits per website per day from ${first.year} to ${last.year}"
        style="
          width:100%;
          min-width:620px;
          height:auto;
          display:block;
        "
      >

        ${gridLines}

        <polyline
          points="${points}"
          fill="none"
          stroke="#0096c7"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${dataPoints}

        ${xLabels}

      </svg>

    </div>


    <div style="
      display:grid;
      grid-template-columns:repeat(3, 1fr);
      gap:16px;
    ">

      <div style="
        padding:16px;
        background:#f6f8fa;
        border-radius:10px;
      ">
        <div style="
          font-size:12px;
          color:#66757f;
          margin-bottom:5px;
        ">
          ${last.year} Active Websites in DA Band ${modelData.da_band}
        </div>
      
        <div style="
          font-size:20px;
          font-weight:700;
          color:#263238;
        ">
          ${formatCompact(last.active_websites_in_da_band)}
        </div>
      </div>
      
      <div style="
        padding:16px;
        background:#f6f8fa;
        border-radius:10px;
      ">
        <div style="
          font-size:12px;
          color:#66757f;
          margin-bottom:5px;
        ">
          ${last.year} Organic Distribution
        </div>

        <div style="
          font-size:20px;
          font-weight:700;
          color:#263238;
        ">
          ${formatNumber(
            last.organic_distribution_pct,
            1
          )}%
        </div>
      </div>

      <div style="
        padding:16px;
        background:#f6f8fa;
        border-radius:10px;
      ">
        <div style="
          font-size:12px;
          color:#66757f;
          margin-bottom:5px;
        ">
          ${last.year} Organic Traffic in DA Band / Day
        </div>

        <div style="
          font-size:20px;
          font-weight:700;
          color:#263238;
        ">
          ${formatCompact(
            last.organic_traffic_in_da_band_per_day
          )}
        </div>
      </div>

    </div>
  `;

  console.log(
    "✅ Google Search Stage 2 rendered:",
    modelData.da_band,
    series
  );
}
   
  // Expose only the functions bootstrap.js needs.
  window.DigitolGoogleSearchModel = {
    init: initGoogleSearchModel,
    update: updateGoogleSearchModel
  };

})();
