const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let rawData = [];
let charts = {};

let selectedFilters = {
  Empresa: [],
  Nivel: [],
  Material: []
};

Papa.parse(CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,

  complete: function(results) {

    rawData = results.data
      .map(r => normalize(r))
      .filter(r => r.Cantidad_m > 0);

    console.log("DATA OK:", rawData.length);

    initFilters();
    updateDashboard();
  }
});

/* LIMPIEZA ROBUSTA */
function normalize(row) {
  return {
    Empresa: clean(row["Empresa"]),
    Tecnologia: clean(row["Tecnologia"]),
    Material: clean(row["Material"]),
    Nivel: clean(row["Nivel"]),
    Cantidad_m: parseFloat(
      clean(row["Cantidad_m"]).replace(/,/g, "")
    ) || 0
  };
}

function clean(val) {
  return (val || "").toString().trim();
}

/* FILTROS */
function initFilters() {
  createButtons("empresaFilter", getUnique("Empresa"), "Empresa");
  createButtons("nivelFilter", getUnique("Nivel"), "Nivel");
  createButtons("materialFilter", getUnique("Material"), "Material");

  document.getElementById("resetBtn").onclick = resetFilters;
}

function getUnique(field) {
  return [...new Set(rawData.map(d => d[field]).filter(v => v))];
}

function createButtons(containerId, values, key) {
  const container = document.getElementById(containerId);

  values.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.innerText = val;

    btn.addEventListener("click", () => {
      btn.classList.toggle("active");

      if (selectedFilters[key].includes(val)) {
        selectedFilters[key] = selectedFilters[key].filter(v => v !== val);
      } else {
        selectedFilters[key].push(val);
      }

      updateDashboard();
    });

    container.appendChild(btn);
  });
}

function resetFilters() {
  selectedFilters = { Empresa: [], Nivel: [], Material: [] };

  document.querySelectorAll(".filter-btn").forEach(b =>
    b.classList.remove("active")
  );

  updateDashboard();
}

/* DATA */
function getFilteredData() {
  return rawData.filter(r => {
    return (
      (!selectedFilters.Empresa.length || selectedFilters.Empresa.includes(r.Empresa)) &&
      (!selectedFilters.Nivel.length || selectedFilters.Nivel.includes(r.Nivel)) &&
      (!selectedFilters.Material.length || selectedFilters.Material.includes(r.Material))
    );
  });
}

function groupBy(data, key) {
  const map = {};
  data.forEach(r => {
    const k = r[key] || "Otros";
    map[k] = (map[k] || 0) + r.Cantidad_m;
  });
  return map;
}

/* DASHBOARD */
function updateDashboard() {
  const data = getFilteredData();

  updateKPIs(data);
  updateRanking(data);
  drawCharts(data);
}

function updateKPIs(data) {
  let total = 0;
  const empresas = new Set();
  const tech = {};
  const nivel = {};

  data.forEach(r => {
    total += r.Cantidad_m;
    empresas.add(r.Empresa);
    tech[r.Tecnologia] = (tech[r.Tecnologia] || 0) + r.Cantidad_m;
    nivel[r.Nivel] = (nivel[r.Nivel] || 0) + r.Cantidad_m;
  });

  document.getElementById("totalKPI").innerText = Math.round(total).toLocaleString();
  document.getElementById("empresasKPI").innerText = empresas.size;
  document.getElementById("topTecKPI").innerText = getTop(tech);
  document.getElementById("topNivelKPI").innerText = getTop(nivel);
}

function getTop(obj) {
  return Object.keys(obj).reduce((a, b) =>
    obj[a] > obj[b] ? a : b, "-"
  );
}

function updateRanking(data) {
  const table = document.getElementById("rankingTable");
  table.innerHTML = "";

  const grouped = groupBy(data, "Tecnologia");

  Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach((row, i) => {

      table.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${row[0]}</td>
          <td>${Math.round(row[1]).toLocaleString()}</td>
        </tr>`;
    });
}

/* CHARTS */
function drawCharts(data) {
  Object.values(charts).forEach(c => c?.destroy());

  charts.tech = createChart("techChart", "bar", groupBy(data, "Tecnologia"), "Tecnología");
  charts.material = createChart("materialChart", "pie", groupBy(data, "Material"), "Material");
  charts.nivel = createChart("nivelChart", "bar", groupBy(data, "Nivel"), "Nivel");
}

function createChart(id, type, dataset, label) {
  return new Chart(document.getElementById(id), {
    type,
    data: {
      labels: Object.keys(dataset),
      datasets: [{
        label,
        data: Object.values(dataset)
      }]
    },
    options: {
      responsive: true,
      scales: type !== "pie" ? {
        x: { title: { display: true, text: label } },
        y: { title: { display: true, text: "Cantidad (m)" } }
      } : {}
    }
  });
}
``
