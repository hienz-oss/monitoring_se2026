const API_URL = "https://script.google.com/macros/s/AKfycbzUib9Ac3cFUT7weTn2U0SoHvezLu79mlFkZhxKVzih5bM_R67VX-k90eHCxhzQ_3KYnA/exec";

let allData = [];
let previousProgress = {}; // key: pplName -> progress
let prevTopPplProgress = {};

let currentPage = 1;
const rowsPerPage = 10;

function createDataSignature(data) {
  return JSON.stringify(
    data
      .map(item => ({
        desa: item.NAMA_DESA || "",
        sls: item.NAMA_SLS || "",
        ppl: item.NAMA_PPL || "",
        pml: item.NAMA_PML || "",
        muatan: getMuatan(item),
        submit: angka(item.SUBMIT),
        reject: angka(item.REJECT),
        approved: angka(item.APPROVED)
      }))
      .sort((a, b) =>
        `${a.desa}-${a.sls}-${a.ppl}`.localeCompare(
          `${b.desa}-${b.sls}-${b.ppl}`,
          "id"
        )
      )
  );
}

async function loadData() {
  const loader =
    document.getElementById("tableLoader");

  updateSyncStatus("Memeriksa data...");
  renderTopPplSkeleton();
  renderTopDesaSkeleton();

  if (loader) {
    loader.classList.remove("hide");
  }

  try {
    const response =
      await fetch(API_URL);

    const newData =
      await response.json();

    const newSignature =
      createDataSignature(newData);

    const oldSignature =
      localStorage.getItem("lastDataSignature");

    const lastUpdateTime =
      localStorage.getItem("lastDataUpdateTime");

    const isFirstLoad =
      !oldSignature;

    const isDataChanged =
      newSignature !== oldSignature;

    allData = newData.filter(item =>
      String(item.NAMA_PML || "")
        .trim()
        .toLowerCase() ===
      "uhin awaludin"
    );

    if (
      document.getElementById("pplFilter").options.length === 1
    ) {
      renderFilter();
    }

    renderDashboard();

    if (isFirstLoad || isDataChanged) {
      const now =
        new Date();

      const updateTime =
        now.toLocaleTimeString("en-GB");

      localStorage.setItem(
        "lastDataSignature",
        newSignature
      );

      localStorage.setItem(
        "lastDataUpdateTime",
        updateTime
      );

      updateSyncStatus(
        "Update : " + updateTime
      );
    } else {
      updateSyncStatus(
        lastUpdateTime
          ? "Update : " + lastUpdateTime
          : "Data belum berubah"
      );
    }

  } catch (error) {
    console.error("Gagal mengambil data:", error);
    updateSyncStatus("Gagal sinkron");
  } finally {
    if (loader) {
      loader.classList.add("hide");
    }
  }
}

function getMuatan(item) {
  const prelist =
    angka(item.PRELIST);

  const totalMuatan =
    angka(item.TOTAL_MUATAN);

  return prelist > 0
    ? prelist
    : totalMuatan;
}

function angka(value) {
  return Number(value) || 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPercent(value) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + "%";
}

function updateSyncStatus(text) {
  document.getElementById("syncStatus").textContent = text;
}

function renderFilter() {
  const pplFilter = document.getElementById("pplFilter");

  const pplList = [...new Set(
    allData.map(item => item.NAMA_PPL).filter(Boolean)
  )];

  pplList.forEach(ppl => {
    const option = document.createElement("option");
    option.value = ppl;
    option.textContent = ppl;
    pplFilter.appendChild(option);
  });
}

function getFilteredData() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const ppl = document.getElementById("pplFilter").value;
  const statusValue = document.getElementById("statusFilter").value;

  return allData.filter(item => {
    const matchSearch =
      String(item.NAMA_DESA || "").toLowerCase().includes(search) ||
      String(item.NAMA_SLS || "").toLowerCase().includes(search) ||
      String(item.NAMA_PPL || "").toLowerCase().includes(search);

    const matchPpl =
      !ppl || item.NAMA_PPL === ppl;

    const status =
      getStatus(item).text;

    const matchStatus =
      !statusValue || status === statusValue;

    return matchSearch && matchPpl && matchStatus;
  });
}

function getStatus(item) {
  const total = getMuatan(item)
  const approve = angka(item.APPROVED);

  const progress =
    total > 0
      ? (approve / total) * 100
      : 0;

  if (progress >= 100) {
    return {
      text: "Selesai",
      className: "done"
    };
  }

  if (progress > 0) {
    return {
      text: "Belum Selesai",
      className: "pending"
    };
  }

  return {
    text: "Belum Mulai",
    className: "empty"
  };
}

function renderRegionInfo() {
  if (!allData.length) return;

  const first = allData[0];

  const titleCase = text =>
    String(text || "")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());

  const kecamatan =
    titleCase(first.NAMA_KEC || "-");

  const kode =
    first.KODE_KEC || "-";

  const kabupaten =
    titleCase(first.NAMA_KAB || "-");

  const provinsi =
    titleCase(first.NAMA_PROV || "-");

  const totalDesa =
    new Set(
      allData
        .map(item => item.NAMA_DESA)
        .filter(Boolean)
    ).size;

  const totalSls =
    allData.length;

  const totalPpl =
    new Set(
      allData
        .map(item => item.NAMA_PPL)
        .filter(Boolean)
    ).size;

  const totalMuatan =
    allData.reduce(
      (sum, item) =>
        sum + getMuatan(item),
      0
    );

  const totalApprove =
    allData.reduce(
      (sum, item) =>
        sum + angka(item.APPROVED),
      0
    );

  const progress =
    totalMuatan > 0
      ? (totalApprove / totalMuatan) * 100
      : 0;

  document.getElementById("regionBtn").innerHTML = `
    Uhin Awaludin
    <i class="fa-solid fa-chevron-down"></i>
  `;

  document.getElementById("regionTitle").textContent =
    "Uhin Awaludin";

  document.getElementById("regionKec").textContent =
    kecamatan;

  document.getElementById("regionKab").textContent =
    kabupaten;

  document.getElementById("regionProv").textContent =
    provinsi;

  document.getElementById("regionDesa").textContent =
    formatNumber(totalDesa);

  document.getElementById("regionSls").textContent =
    formatNumber(totalSls);

  document.getElementById("regionPpl").textContent =
    formatNumber(totalPpl);
}

function renderDashboard() {
  renderRegionInfo();
  const data = getFilteredData();

  const totalMuatan = allData.reduce((sum, item) => {
    return sum + getMuatan(item);
  }, 0);

  const totalSubmit = allData.reduce((sum, item) => {
    return sum + angka(item.SUBMIT);
  }, 0);

  const totalReject = allData.reduce((sum, item) => {
    return sum + angka(item.REJECT);
  }, 0);

  const totalApprove = allData.reduce((sum, item) => {
    return sum + angka(item.APPROVED);
  }, 0);

  const totalOpen =
    Math.max(
      totalMuatan -
      totalSubmit -
      totalReject -
      totalApprove,
      0
    );

  const progress =
    totalMuatan > 0
      ? (totalApprove / totalMuatan) * 100
      : 0;

  document.getElementById("totalMuatan").textContent =
    formatNumber(totalMuatan);

  document.getElementById("totalOpen").textContent =
    formatNumber(totalOpen);

  document.getElementById("totalApprove").textContent =
    formatNumber(totalApprove);

  document.getElementById("totalProgress").textContent =
    formatPercent(progress);

  renderTeamCompare();
  renderTopPpl();
  renderTopDesa();
  renderPplCards();
  renderPplSummary();
  renderTable(data);
  renderPagination(data);
}

function getTeamProgress(members) {

  let totalMuatan = 0;
  let totalApproved = 0;

  members.forEach(name => {

    const rows =
      allData.filter(item =>
        String(item.NAMA_PPL || "")
          .trim()
          .toLowerCase() ===
        name.trim().toLowerCase()
      );

    totalMuatan +=
      rows.reduce(
        (sum, item) =>
          sum + getMuatan(item),
        0
      );

    totalApproved +=
      rows.reduce(
        (sum, item) =>
          sum + angka(item.APPROVED),
        0
      );

  });

  return totalMuatan > 0
    ? (totalApproved / totalMuatan) * 100
    : 0;
}

function renderTeamCompare() {
  const teamOneContainer =
    document.getElementById("teamOneList");

  const teamTwoContainer =
    document.getElementById("teamTwoList");

  if (!teamOneContainer || !teamTwoContainer) return;

  const teamOne = [
    "Syifa Hindun Dalillah",
    "Destiyani Nurhikmah",
    "Imas Suhaeni",
    "Putri Septiana Mubarokah",
    "Gina Nuranggita Faridah",
    "Deni Nugraha"
  ];

  const teamTwo = [
    "Maya Mutiasari",
    "Aris Widayanto",
    "Pipit Pitriawati",
    "Cecep Rusmanto",
    "Anisa Tri Wulandari",
    "Rika Rahayu"
  ];

  const getRowsByPpl = (pplName) => {
    return allData.filter(item =>
      String(item.NAMA_PPL || "")
        .trim()
        .toLowerCase() ===
      pplName.trim().toLowerCase()
    );
  };

  const getPplProgress = (pplName) => {
    const rows =
      getRowsByPpl(pplName);

    const muatan =
      rows.reduce((sum, item) =>
        sum + getMuatan(item), 0
      );

    const approved =
      rows.reduce((sum, item) =>
        sum + angka(item.APPROVED), 0
      );

    return muatan > 0
      ? (approved / muatan) * 100
      : 0;
  };

  const getTeamProgress = (members) => {
    let totalMuatan = 0;
    let totalApproved = 0;

    members.forEach(name => {
      const rows =
        getRowsByPpl(name);

      totalMuatan += rows.reduce((sum, item) =>
        sum + getMuatan(item), 0
      );

      totalApproved += rows.reduce((sum, item) =>
        sum + angka(item.APPROVED), 0
      );
    });

    return totalMuatan > 0
      ? (totalApproved / totalMuatan) * 100
      : 0;
  };

  const teamOneProgress =
    getTeamProgress(teamOne);

  const teamTwoProgress =
    getTeamProgress(teamTwo);

  const teamOneProgressEl =
    document.getElementById("teamOneProgress");

  const teamTwoProgressEl =
    document.getElementById("teamTwoProgress");

  if (teamOneProgressEl) {
    teamOneProgressEl.textContent =
      formatPercent(teamOneProgress);
  }

  if (teamTwoProgressEl) {
    teamTwoProgressEl.textContent =
      formatPercent(teamTwoProgress);
  }

  const renderList = (container, members) => {
    let html = "";

    members
      .slice()
      .sort((a, b) =>
        a.localeCompare(
          b,
          "id",
          { sensitivity: "base" }
        )
      )
      .forEach(name => {
        const progress =
          getPplProgress(name);

        html += `
          <div class="team-person">
            <div class="team-person-head">
              <div class="team-person-name">
                ${name}
              </div>

              <div class="team-person-progress">
                ${formatPercent(progress)}
              </div>
            </div>

            <div class="team-progress-track">
              <div
                class="team-progress-fill"
                style="width:${Math.min(progress, 100)}%">
              </div>
            </div>
          </div>
        `;
      });

    container.innerHTML = html;
  };

  renderList(teamOneContainer, teamOne);
  renderList(teamTwoContainer, teamTwo);
}

function renderTopPpl() {
  const container = document.getElementById("topPplList");

  const summary = {};

  allData.forEach(item => {
    const ppl = item.NAMA_PPL || "-";

    if (!summary[ppl]) {
      summary[ppl] = {
        muatan: 0,
        approve: 0
      };
    }

    summary[ppl].muatan += getMuatan(item);
    summary[ppl].approve += angka(item.APPROVED);
  });

  const ranking = Object.entries(summary)
    .map(([ppl, data]) => {
      const progress =
        data.muatan > 0
          ? (data.approve / data.muatan) * 100
          : 0;

      return { ppl, progress };
    })
    .sort((a, b) => b.progress - a.progress);

  container.innerHTML = "";

  ranking.slice(0, 3).forEach((item, index) => {

    const prev = prevTopPplProgress[item.ppl] ?? item.progress;
    const trend = getTrend(item.progress, prev);

    // update cache
    prevTopPplProgress[item.ppl] = item.progress;

    container.innerHTML += `
      <div class="top-item">
        <div>
          ${index + 1}. ${item.ppl}
        </div>

        <div class="top-progress">
          ${formatPercent(item.progress)}
          <span class="trend ${trend.class}">
            ${trend.icon} ${trend.text}
          </span>
        </div>
      </div>
    `;
  });

  if (ranking.length > 3) {
    container.innerHTML += `
      <div class="more-ppl">
        + ${ranking.length - 3} PPL lainnya
      </div>
    `;
  }
}

function getTrend(current, previous) {
  const diff = current - previous;

  if (diff > 0) return { icon: "▲", class: "up", text: `+${diff.toFixed(1)}%` };
  if (diff < 0) return { icon: "▼", class: "down", text: `${diff.toFixed(1)}%` };
  return { icon: "●", class: "stable", text: "0%" };
}

function renderTopPplSkeleton() {
  const container =
    document.getElementById("topPplList");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    container.innerHTML += `
      <div class="top-skeleton"></div>
    `;
  }
}

function renderTopDesa() {
  const container =
    document.getElementById("topDesaList");

  if (!container) return;

  const summary = {};

  allData.forEach(item => {
    const desa = item.NAMA_DESA || "-";

    if (!summary[desa]) {
      summary[desa] = {
        muatan: 0,
        approve: 0
      };
    }

    summary[desa].muatan += getMuatan(item);
    summary[desa].approve += angka(item.APPROVED);
  });

  const ranking =
    Object.entries(summary)
      .map(([desa, data]) => ({
        desa,
        progress:
          data.muatan > 0
            ? (data.approve / data.muatan) * 100
            : 0
      }))
      .sort((a, b) => b.progress - a.progress);

  container.innerHTML = "";

  ranking.slice(0, 3).forEach((item, index) => {
    container.innerHTML += `
      <div class="top-item">
        <div>
          ${index + 1}. ${item.desa}
        </div>

        <div class="top-progress">
          ${formatPercent(item.progress)}
        </div>
      </div>
    `;
  });

  if (ranking.length > 3) {
    container.innerHTML += `
      <div class="more-ppl">
        + ${ranking.length - 3} desa lainnya
      </div>
    `;
  }
}

function renderTopDesaSkeleton() {

  const container =
    document.getElementById("topDesaList");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 4; i++) {

    container.innerHTML += `
      <div class="top-skeleton"></div>
    `;

  }

}

function renderPplSummary() {
  const tbody = document.getElementById("pplBody");

  tbody.innerHTML = "";

  const summary = {};

  allData.forEach(item => {
    const ppl = item.NAMA_PPL || "-";

    if (!summary[ppl]) {
      summary[ppl] = {
        muatan: 0,
        open: 0,
        submit: 0,
        reject: 0,
        approve: 0
      };
    }

    summary[ppl].muatan += getMuatan(item);
    summary[ppl].submit += angka(item.SUBMIT);
    summary[ppl].reject += angka(item.REJECT);
    summary[ppl].approve += angka(item.APPROVED);
  });

  Object.entries(summary)
    .sort((a, b) =>
      a[0].localeCompare(
        b[0],
        "id",
        { sensitivity: "base" }
      )
    )
    .forEach(([ppl, data]) => {

      data.open =
        Math.max(
          data.muatan -
          data.submit -
          data.reject -
          data.approve,
          0
        );

      const progress =
        data.muatan > 0
          ? (data.approve / data.muatan) * 100
          : 0;

      let status = "Belum Mulai";
      let statusClass = "empty";

      if (progress >= 100) {
        status = "Selesai";
        statusClass = "done";
      } else if (progress > 0) {
        status = "Belum Selesai";
        statusClass = "pending";
      }

      tbody.innerHTML += `
        <tr>
          <td>${ppl}</td>
          <td align="center">${formatNumber(data.muatan)}</td>
          <td align="center">${formatNumber(data.open)}</td>
          <td align="center">${formatNumber(data.submit)}</td>
          <td align="center">${formatNumber(data.reject)}</td>
          <td align="center">${formatNumber(data.approve)}</td>
          <td align="center">${formatPercent(progress)}</td>
          <td>
            <span class="status ${statusClass}">
              ${status}
            </span>
          </td>
        </tr>
      `;
    });
}

function renderPplCards() {
  const container = document.getElementById("pplCards");

  container.innerHTML = "";

  const summary = {};

  allData.forEach(item => {
    const ppl = item.NAMA_PPL || "-";

    if (!summary[ppl]) {
      summary[ppl] = {
        muatan: 0,
        submit: 0,
        reject: 0,
        approve: 0
      };
    }

    summary[ppl].muatan += getMuatan(item);
    summary[ppl].submit += angka(item.SUBMIT);
    summary[ppl].reject += angka(item.REJECT);
    summary[ppl].approve += angka(item.APPROVED);
  });

  Object.entries(summary)
    .sort((a, b) =>
      a[0].localeCompare(
        b[0],
        "id",
        { sensitivity: "base" }
      )
    )
    .forEach(([ppl, data]) => {
      const progress =
        data.muatan > 0
          ? (data.approve / data.muatan) * 100
          : 0;

      const open =
        Math.max(
          angka(data.muatan) -
          angka(data.submit) -
          angka(data.reject) -
          angka(data.approve),
          0
        );

      const initials = ppl
        .trim()
        .charAt(0)
        .toUpperCase();

      container.innerHTML += `
        <div class="ppl-card">
          <div class="ppl-name">
            <span class="ppl-avatar">
              ${initials}
            </span>
            <span>${ppl}</span>
            <strong>${formatPercent(progress)}</strong>
          </div>

          <div class="ppl-progress">
            <div class="ppl-progress-track">
              <div
                class="ppl-progress-fill"
                style="width:${Math.min(progress, 100)}%">
              </div>
            </div>
          </div>

          <div class="ppl-stats">
            <div class="ppl-stat">
              <span>Assignment</span>
              <strong>${formatNumber(data.muatan)}</strong>
            </div>

            <div class="ppl-stat">
              <span>Open</span>
              <strong>${formatNumber(open)}</strong>
            </div>

            <div class="ppl-stat">
              <span>Submit</span>
              <strong>${formatNumber(data.submit)}</strong>
            </div>

            <div class="ppl-stat">
              <span>Approved</span>
              <strong>${formatNumber(data.approve)}</strong>
            </div>
          </div>
        </div>
      `;
    });
}

function renderTable(data) {
  const start =
    (currentPage - 1) * rowsPerPage;

  const end =
    start + rowsPerPage;

  const pageData =
    data.slice(start, end);

  const tbody =
    document.getElementById("dataBody");

  const emptyState =
    document.getElementById("emptyState");

  const table =
    tbody.closest("table");

  tbody.innerHTML = "";

  if (data.length === 0) {

    table.style.display = "none";

    emptyState.classList.remove("hide");

    return;
  }

  table.style.display = "";

  emptyState.classList.add("hide");

  pageData.forEach(item => {

    const total =
      getMuatan(item);

    const submit =
      angka(item.SUBMIT);

    const reject =
      angka(item.REJECT);

    const approve =
      angka(item.APPROVED);

    const open =
      Math.max(
        total -
        submit -
        reject -
        approve,
        0
      );

    const progress =
      total > 0
        ? (approve / total) * 100
        : 0;

    const status =
      getStatus(item);

    tbody.innerHTML += `
      <tr>
        <td>${item.NAMA_DESA || ""}</td>
        <td>${item.NAMA_SLS || ""}</td>
        <td>${item.NAMA_PPL || ""}</td>
        <td align="center">${formatNumber(total)}</td>
        <td align="center">${formatNumber(open)}</td>
        <td align="center">${formatNumber(submit)}</td>
        <td align="center">${formatNumber(approve)}</td>
        <td align="center">${formatPercent(progress)}</td>
        <td><span class="status ${status.className}">${status.text}</span></td>
      </tr>
    `;
  });
}

function renderPagination(data) {
  const container =
    document.getElementById("pagination");

  const totalPages =
    Math.ceil(data.length / rowsPerPage);

  if (data.length === 0 || totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const startRecord =
    (currentPage - 1) * rowsPerPage + 1;

  const endRecord =
    Math.min(
      currentPage * rowsPerPage,
      data.length
    );

  const visiblePages = 5;

  let startPage =
    Math.max(
      1,
      currentPage -
      Math.floor(visiblePages / 2)
    );

  let endPage =
    startPage + visiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;

    startPage =
      Math.max(
        1,
        endPage - visiblePages + 1
      );
  }

  let pages = "";

  for (let i = startPage; i <= endPage; i++) {
    pages += `
      <button
        class="page-btn ${i === currentPage ? "active" : ""}"
        onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  container.innerHTML = `
    <div class="pagination-info">
      Menampilkan
      <strong>${startRecord}</strong>–
      <strong>${endRecord}</strong>
      dari
      <strong>${formatNumber(data.length)}</strong>
      data
    </div>

    <div class="pagination-nav">
      <button
        class="nav-btn"
        ${currentPage === 1 ? "disabled" : ""}
        onclick="changePage(${currentPage - 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>

      ${pages}

      <button
        class="nav-btn"
        ${currentPage === totalPages ? "disabled" : ""}
        onclick="changePage(${currentPage + 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function changePage(page) {

  const data =
    getFilteredData();

  const totalPages =
    Math.ceil(data.length / rowsPerPage);

  currentPage =
    Math.max(
      1,
      Math.min(page, totalPages)
    );

  renderDashboard();
}

/* =========================
   THEME
========================= */

const themeToggle =
  document.getElementById("themeToggle");

const savedTheme =
  localStorage.getItem("theme") || "light";

document.documentElement.setAttribute(
  "data-theme",
  savedTheme
);

themeToggle.checked =
  savedTheme === "dark";

themeToggle.addEventListener("change", () => {
  const theme =
    themeToggle.checked
      ? "dark"
      : "light";

  document.documentElement.setAttribute(
    "data-theme",
    theme
  );

  localStorage.setItem("theme", theme);
});

/* =========================
   FILTER & SEARCH
========================= */

const searchInput =
  document.getElementById("searchInput");

const clearSearch =
  document.getElementById("clearSearch");

function resetPageAndRender() {
  currentPage = 1;
  renderDashboard();
}

searchInput.addEventListener("input", () => {
  clearSearch.style.display =
    searchInput.value.trim()
      ? "block"
      : "none";

  resetPageAndRender();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  clearSearch.style.display = "none";

  resetPageAndRender();

  searchInput.focus();
});

document
  .getElementById("pplFilter")
  .addEventListener("change", resetPageAndRender);

document
  .getElementById("statusFilter")
  .addEventListener("change", resetPageAndRender);

/* =========================
   SETTING PANEL
========================= */

const settingBtn =
  document.getElementById("settingBtn");

const settingPanel =
  document.getElementById("settingPanel");

const togglePplTable =
  document.getElementById("togglePplTable");

const toggleDetailTable =
  document.getElementById("toggleDetailTable");

const pplTableSection =
  document.getElementById("pplTableSection");

const detailTableSection =
  document.getElementById("detailTableSection");

settingBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingPanel.classList.toggle("hide");
});

function applyTableSettings() {
  const showPplTable =
    localStorage.getItem("showPplTable") !== "false";

  const showDetailTable =
    localStorage.getItem("showDetailTable") !== "false";

  togglePplTable.checked =
    showPplTable;

  toggleDetailTable.checked =
    showDetailTable;

  pplTableSection.style.display =
    showPplTable
      ? "block"
      : "none";

  detailTableSection.style.display =
    showDetailTable
      ? "block"
      : "none";
}

togglePplTable.addEventListener("change", () => {
  localStorage.setItem(
    "showPplTable",
    togglePplTable.checked
  );

  applyTableSettings();
});

toggleDetailTable.addEventListener("change", () => {
  localStorage.setItem(
    "showDetailTable",
    toggleDetailTable.checked
  );

  applyTableSettings();
});

/* =========================
   REGION PANEL
========================= */

const regionBtn =
  document.getElementById("regionBtn");

const regionPanel =
  document.getElementById("regionPanel");

if (regionBtn && regionPanel) {
  regionBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    regionPanel.classList.toggle("hide");

    regionBtn.classList.toggle(
      "active",
      !regionPanel.classList.contains("hide")
    );
  });
}

/* =========================
   GLOBAL CLICK
========================= */

document.addEventListener("click", (e) => {
  if (
    regionBtn &&
    regionPanel &&
    !regionPanel.contains(e.target) &&
    !regionBtn.contains(e.target)
  ) {
    regionPanel.classList.add("hide");
    regionBtn.classList.remove("active");
  }

  if (
    !settingPanel.contains(e.target) &&
    !settingBtn.contains(e.target)
  ) {
    settingPanel.classList.add("hide");
  }
});

/* =========================
   INIT
========================= */

applyTableSettings();
loadData();

const refreshBtn =
  document.getElementById("refreshBtn");

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    if (refreshBtn.classList.contains("loading")) return;

    refreshBtn.classList.add("loading");

    try {
      await loadData();
    } finally {
      refreshBtn.classList.remove("loading");
    }
  });
}