const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let rawData = [];
let charts = {};

Papa.parse(CSV_URL, {
  download: true,
  header: true,
  complete: function(results) {
    rawData = results.data;
    initFilters();
    updateDashboard();
  }
});

function initFilters() {
  const empresaSet = new Set();
  const nivelSet = new Set();
  const materialSet = new Set();

  rawData.forEach(r => {
    if (r.Empresa) empresaSet.add(r.Empresa);
    if (r.Nivel) nivelSet.add(r.Nivel);
    if (r.Material) materialSet.add(r.Material);
  });

  fillSelect("empresaFilter", empresaSet);
  fillSelect("nivelFilter", nivelSet);
  fillSelect("materialFilter", materialSet);

  document.querySelectorAll("select").forEach(s =>
    s.addEventListener("change", updateDashboard)
  );
}

function fillSelect(id, values) {
  const el = document.getElementById(id);
  values.forEach(v => {
    el.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

function getFilteredData() {
  const empresa = document.getElementById("empresaFilter").value;
  const nivel = document.getElementById("nivelFilter").value;
  const material = document.getElementById("materialFilter").value;

  return rawData.filter(r => {
    return (empresa === "all" || r.Empresa === empresa) &&
           (nivel === "all" || r.Nivel === nivel) &&
           (material === "all" || r.Material === material);
  });
}

function groupBy(data, key) {
  const map = {};
  data.forEach(r => {
    const k = r[key];
    const val = parseFloat(r.Cantidad_m) || 0;
    if (!map[k]) map[k] = 0;
    map[k] += val;
  });
  return map;
}

function updateDashboard() {
  const data = getFilteredData();

  updateKPIs(data);
  renderCharts(data);
}

function updateKPIs(data) {
  let total = 0;
  const empresaSet = new Set();
  const groupedTec = {};

  data.forEach(r => {
    const val = parseFloat(r.Cantidad_m) || 0;
    total += val;
    empresaSet.add(r.Empresa);

    if (!groupedTec[r.Tecnologia]) groupedTec[r.Tecnologia] = 0;
    groupedTec[r.Tecnologia] += val;
  });

  const topTec = Object.keys(groupedTec).reduce((a, b) =>
    groupedTec[a] > groupedTec[b] ? a : b, "-");

  document.getElementById("totalKPI").innerText = total.toLocaleString();
  document.getElementById("topTecKPI").innerText = topTec;
  document.getElementById("empresasKPI").innerText = empresaSet.size;
}

function renderCharts(data) {
  destroyCharts();

  const tech = groupBy(data, "Tecnologia");
  charts.tech = createChart("techChart", "bar", tech, "Tecnología");

  const mat = groupBy(data, "Material");
  charts.material = createChart("materialChart", "pie", mat, "Material");

  const nivel = groupBy(data, "Nivel");
  charts.nivel = createChart("nivelChart", "bar", nivel, "Nivel");
}

function createChart(id, type, dataset, label) {
  return new Chart(document.getElementById(id), {
    type: type,
    data: {
      labels: Object.keys(dataset),
      datasets: [{
        label: label,
        data: Object.values(dataset),
        backgroundColor: generateColors(Object.keys(dataset).length)
      }]
    },
    options: {
      responsive: true
    }
  });
}

function generateColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    colors.push(`hsl(${i * 40},70%,50%)`);
  }
  return colors;
}

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
}
