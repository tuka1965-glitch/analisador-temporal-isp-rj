const idFields = new Set(["cisp", "mes", "ano", "mes_ano", "aisp", "risp", "munic", "mcirc", "regiao", "fase"]);

const state = {
  rows: [],
  headers: [],
  indicators: [],
  populationByMunicipalityYear: new Map(),
  populationLoaded: false,
};

const els = {
  fileInput: document.getElementById("fileInput"),
  indicatorSelect: document.getElementById("indicatorSelect"),
  periodSelect: document.getElementById("periodSelect"),
  scaleSelect: document.getElementById("scaleSelect"),
  geoLevel: document.getElementById("geoLevel"),
  startYear: document.getElementById("startYear"),
  endYear: document.getElementById("endYear"),
  movingAverage: document.getElementById("movingAverage"),
  analyzeButton: document.getElementById("analyzeButton"),
  printButton: document.getElementById("printButton"),
  statusBox: document.getElementById("statusBox"),
  rowsUsed: document.getElementById("rowsUsed"),
  totalValue: document.getElementById("totalValue"),
  trendValue: document.getElementById("trendValue"),
  anomalyCount: document.getElementById("anomalyCount"),
  territoryCount: document.getElementById("territoryCount"),
  municFilter: document.getElementById("municFilter"),
  aispFilter: document.getElementById("aispFilter"),
  rispFilter: document.getElementById("rispFilter"),
  regiaoFilter: document.getElementById("regiaoFilter"),
  clearFilters: document.getElementById("clearFilters"),
  chart: document.getElementById("chart"),
  chartSubtitle: document.getElementById("chartSubtitle"),
  analysisText: document.getElementById("analysisText"),
  copyAnalysis: document.getElementById("copyAnalysis"),
  forecastText: document.getElementById("forecastText"),
  forecastBody: document.getElementById("forecastBody"),
  territoryText: document.getElementById("territoryText"),
  territoryBody: document.getElementById("territoryBody"),
  summaryBody: document.getElementById("summaryBody"),
};

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  loadCsv(await file.text(), file.name);
});

for (const element of [
  els.indicatorSelect,
  els.periodSelect,
  els.scaleSelect,
  els.geoLevel,
  els.startYear,
  els.endYear,
  els.movingAverage,
  els.municFilter,
  els.aispFilter,
  els.rispFilter,
  els.regiaoFilter,
]) {
  element.addEventListener("change", analyze);
}

els.analyzeButton.addEventListener("click", analyze);
els.printButton.addEventListener("click", () => window.print());
els.clearFilters.addEventListener("click", () => {
  for (const select of [els.municFilter, els.aispFilter, els.rispFilter, els.regiaoFilter]) {
    for (const option of select.options) option.selected = false;
  }
  analyze();
});
els.copyAnalysis.addEventListener("click", async () => {
  const text = els.analysisText.innerText.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  els.copyAnalysis.textContent = "Copiado";
  setTimeout(() => {
    els.copyAnalysis.textContent = "Copiar";
  }, 1200);
});

loadDefaultCsv();

async function loadDefaultCsv() {
  await loadPopulationCsv();
  try {
    const response = await fetch("data/BaseDPEvolucaoMensalCisp.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    loadCsv(await response.text(), "data/BaseDPEvolucaoMensalCisp.csv");
  } catch (error) {
    els.statusBox.textContent =
      "Nao consegui carregar a base padrao neste ambiente. Se estiver abrindo o HTML localmente, use Abrir CSV.";
  }
}

async function loadPopulationCsv() {
  try {
    const response = await fetch("data/populacao_municipios_rj_ano.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseCsv(await response.text());
    state.populationByMunicipalityYear.clear();
    for (const row of parsed.rows) {
      const code = String(row.codigo_municipio || "").trim();
      const year = Number(row.ano);
      const population = parseNumber(row.populacao);
      if (!code || !Number.isInteger(year) || !Number.isFinite(population) || population <= 0) continue;
      state.populationByMunicipalityYear.set(`${code}|${year}`, {
        code,
        year,
        population,
        source: row.fonte || "",
        method: row.metodo || "",
      });
    }
    state.populationLoaded = state.populationByMunicipalityYear.size > 0;
  } catch (error) {
    state.populationLoaded = false;
  }
}

function loadCsv(text, sourceName) {
  const parsed = parseCsv(text);
  state.headers = parsed.headers;
  state.rows = parsed.rows;
  state.indicators = parsed.headers.filter((header) => !idFields.has(header) && parsed.rows.some((row) => isFiniteNumber(row[header])));

  populateSelect(els.indicatorSelect, state.indicators, state.indicators.includes("letalidade_violenta") ? "letalidade_violenta" : state.indicators[0]);
  populateFilter(els.municFilter, uniqueValues("munic"));
  populateFilter(els.aispFilter, uniqueValues("aisp"), numericSort);
  populateFilter(els.rispFilter, uniqueValues("risp"), numericSort);
  populateFilter(els.regiaoFilter, uniqueValues("regiao"));

  const years = uniqueValues("ano").map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (years.length) {
    els.startYear.value = years[0];
    els.endYear.value = years[years.length - 1];
  }

  els.statusBox.textContent = `${sourceName}: ${state.rows.length.toLocaleString("pt-BR")} linhas, ${state.indicators.length} indicadores criminais.`;
  els.analyzeButton.disabled = false;
  els.printButton.disabled = false;
  analyze();
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.trim().replace(/^\uFEFF/, ""));
  return {
    headers,
    rows: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
  };
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const candidates = [";", ",", "\t"];
  return candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
}

function populateSelect(select, values, selectedValue) {
  select.innerHTML = "";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labelize(value);
    option.selected = value === selectedValue;
    select.appendChild(option);
  }
}

function populateFilter(select, values, sorter = (a, b) => a.localeCompare(b, "pt-BR")) {
  select.innerHTML = "";
  for (const value of values.sort(sorter)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function uniqueValues(field) {
  return Array.from(new Set(state.rows.map((row) => row[field]).filter((value) => value !== "" && value != null)));
}

function numericSort(a, b) {
  return Number(a) - Number(b);
}

function analyze() {
  if (!state.rows.length) return;

  const indicator = els.indicatorSelect.value;
  const period = els.periodSelect.value;
  const scale = els.scaleSelect.value;
  const geoLevel = els.geoLevel.value;
  const startYear = Number(els.startYear.value);
  const endYear = Number(els.endYear.value);
  const movingAverageSize = Math.max(1, Number(els.movingAverage.value) || 3);
  const filters = selectedFilters();

  const buckets = new Map();
  const rateBuckets = new Map();
  const territoryBuckets = new Map();
  const territoryRateBuckets = new Map();
  let rowsUsed = 0;
  let missingPopulation = 0;

  for (const row of state.rows) {
    const year = Number(row.ano);
    const month = Number(row.mes);
    const value = parseNumber(row[indicator]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isFinite(value)) continue;
    if (year < startYear || year > endYear) continue;
    if (!passesFilters(row, filters)) continue;

    const key = periodKey(year, month, period);
    buckets.set(key, (buckets.get(key) || 0) + value);

    const territory = row[geoLevel] || "(vazio)";
    const territoryMap = territoryBuckets.get(territory) || new Map();
    territoryMap.set(key, (territoryMap.get(key) || 0) + value);
    territoryBuckets.set(territory, territoryMap);

    const municipalityCode = String(row.mcirc || "").trim();
    if (scale === "rate") {
      const population = state.populationByMunicipalityYear.get(`${municipalityCode}|${year}`);
      if (population) {
        addRatePart(rateBuckets, key, municipalityCode, value, population.population);
        addTerritoryRatePart(territoryRateBuckets, territory, key, municipalityCode, value, population.population);
      } else {
        missingPopulation += 1;
      }
    }
    rowsUsed += 1;
  }

  const sourceBuckets = scale === "rate" ? rateBucketsToValues(rateBuckets) : buckets;
  const sourceTerritories = scale === "rate" ? rateTerritoryBucketsToValues(territoryRateBuckets) : territoryBuckets;
  const series = Array.from(sourceBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));

  addMovingAverage(series, movingAverageSize);
  addChangeAndAnomalies(series);
  addYearOverYear(series, period);

  const territories = buildTerritoryResults(sourceTerritories, series);
  renderMetrics(series, territories, rowsUsed);
  renderChart(series);
  renderSummaryTable(series);
  renderNarrative(series, territories, { indicator, period, geoLevel, startYear, endYear, scale, missingPopulation });
  renderForecast(series, period);
  renderTerritoryTable(territories);
}

function selectedFilters() {
  return {
    munic: selectedValues(els.municFilter),
    aisp: selectedValues(els.aispFilter),
    risp: selectedValues(els.rispFilter),
    regiao: selectedValues(els.regiaoFilter),
  };
}

function selectedValues(select) {
  return new Set(Array.from(select.selectedOptions).map((option) => option.value));
}

function passesFilters(row, filters) {
  for (const [field, selected] of Object.entries(filters)) {
    if (selected.size && !selected.has(row[field])) return false;
  }
  return true;
}

function addRatePart(map, period, municipalityCode, cases, population) {
  const item = map.get(period) || { cases: 0, populationByMunicipality: new Map() };
  item.cases += cases;
  item.populationByMunicipality.set(municipalityCode, population);
  map.set(period, item);
}

function addTerritoryRatePart(map, territory, period, municipalityCode, cases, population) {
  const territoryMap = map.get(territory) || new Map();
  addRatePart(territoryMap, period, municipalityCode, cases, population);
  map.set(territory, territoryMap);
}

function rateBucketsToValues(map) {
  const values = new Map();
  for (const [period, item] of map.entries()) {
    const population = Array.from(item.populationByMunicipality.values()).reduce((sum, value) => sum + value, 0);
    values.set(period, population ? (item.cases / population) * 100000 : 0);
  }
  return values;
}

function rateTerritoryBucketsToValues(map) {
  const values = new Map();
  for (const [territory, territoryMap] of map.entries()) {
    values.set(territory, rateBucketsToValues(territoryMap));
  }
  return values;
}

function periodKey(year, month, period) {
  if (period === "year") return String(year);
  if (period === "quarter") return `${year}-T${Math.ceil(month / 3)}`;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMovingAverage(series, size) {
  for (let index = 0; index < series.length; index += 1) {
    const slice = series.slice(Math.max(0, index - size + 1), index + 1);
    series[index].movingAverage = slice.reduce((sum, point) => sum + point.value, 0) / slice.length;
  }
}

function addChangeAndAnomalies(series) {
  const values = series.map((point) => point.value);
  const mean = average(values);
  const sd = standardDeviation(values);
  for (let index = 0; index < series.length; index += 1) {
    const previous = series[index - 1]?.value;
    series[index].change = previous ? (series[index].value - previous) / previous : null;
    series[index].z = sd ? (series[index].value - mean) / sd : 0;
    series[index].anomaly = Math.abs(series[index].z) >= 2;
  }
}

function addYearOverYear(series, period) {
  const offset = period === "month" ? 12 : period === "quarter" ? 4 : 1;
  for (let index = 0; index < series.length; index += 1) {
    const previous = series[index - offset];
    const expected = previous ? priorKey(series[index].key, period) : "";
    series[index].yearOverYear = previous && previous.key === expected && previous.value ? (series[index].value - previous.value) / previous.value : null;
  }
}

function priorKey(key, period) {
  if (period === "year") return String(Number(key) - 1);
  if (period === "quarter") {
    const [year, quarter] = key.split("-T");
    return `${Number(year) - 1}-T${quarter}`;
  }
  const [year, month] = key.split("-");
  return `${Number(year) - 1}-${month}`;
}

function buildTerritoryResults(territoryBuckets, nationalSeries) {
  const nationalTotal = nationalSeries.reduce((sum, point) => sum + point.value, 0);
  return Array.from(territoryBuckets.entries())
    .map(([territory, map]) => {
      const points = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value], index) => ({ key, value, index }));
      const total = points.reduce((sum, point) => sum + point.value, 0);
      return {
        territory,
        total,
        share: nationalTotal ? total / nationalTotal : 0,
        slope: linearSlope(points.map((point, index) => [index, point.value])),
      };
    })
    .sort((a, b) => b.total - a.total);
}

function renderMetrics(series, territories, rowsUsed) {
  const total = series.reduce((sum, point) => sum + point.value, 0);
  const slope = linearSlope(series.map((point, index) => [index, point.value]));
  els.rowsUsed.textContent = rowsUsed.toLocaleString("pt-BR");
  els.totalValue.textContent = formatNumber(total);
  els.trendValue.textContent = trendLabel(slope);
  els.trendValue.className = slope > 0 ? "up" : slope < 0 ? "down" : "flat";
  els.anomalyCount.textContent = series.filter((point) => point.anomaly).length.toLocaleString("pt-BR");
  els.territoryCount.textContent = territories.length.toLocaleString("pt-BR");
  els.chartSubtitle.textContent = `${series.length} periodos analisados`;
}

function renderChart(series) {
  const width = 960;
  const height = 430;
  const padding = { top: 20, right: 24, bottom: 44, left: 70 };
  els.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.chart.innerHTML = "";

  if (!series.length) {
    els.chart.innerHTML = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#667176">Sem dados para o recorte.</text>`;
    return;
  }

  const max = Math.max(...series.map((point) => point.value), 1);
  const x = (index) => padding.left + (index / Math.max(series.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value) => height - padding.bottom - (value / max) * (height - padding.top - padding.bottom);
  const points = series.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const maPoints = series.map((point, index) => `${x(index)},${y(point.movingAverage)}`).join(" ");

  els.chart.innerHTML = `
    <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#d8dfdc" />
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#d8dfdc" />
    <polyline points="${points}" fill="none" stroke="#0f766e" stroke-width="3" />
    <polyline points="${maPoints}" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 5" />
    ${series
      .filter((point) => point.anomaly)
      .map((point) => `<circle cx="${x(series.indexOf(point))}" cy="${y(point.value)}" r="5" fill="#b42318" />`)
      .join("")}
    <text x="${padding.left}" y="16" fill="#667176" font-size="12">max ${formatNumber(max)}</text>
    <text x="${padding.left}" y="${height - 12}" fill="#667176" font-size="12">${series[0].key}</text>
    <text x="${width - padding.right}" y="${height - 12}" fill="#667176" font-size="12" text-anchor="end">${series[series.length - 1].key}</text>
  `;
}

function renderSummaryTable(series) {
  els.summaryBody.innerHTML = "";
  if (!series.length) {
    els.summaryBody.innerHTML = '<tr><td colspan="6">Sem dados.</td></tr>';
    return;
  }
  for (const point of series) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${point.key}</td>
      <td>${formatNumber(point.value)}</td>
      <td>${formatNumber(point.movingAverage)}</td>
      <td class="${classForChange(point.change)}">${formatPercent(point.change)}</td>
      <td class="${classForChange(point.yearOverYear)}">${formatPercent(point.yearOverYear)}</td>
      <td>${point.anomaly ? "Atipico" : "Normal"}</td>
    `;
    els.summaryBody.appendChild(tr);
  }
}

function renderNarrative(series, territories, context) {
  if (series.length < 3) {
    els.analysisText.textContent = "Nao ha periodos suficientes para gerar a analise.";
    els.copyAnalysis.disabled = true;
    return;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const totalChange = first.value ? (last.value - first.value) / first.value : null;
  const slope = linearSlope(series.map((point, index) => [index, point.value]));
  const abrupt = abruptChanges(series).slice(0, 3).map((point) => `${point.key} (${formatPercent(point.change)})`);
  const anomalies = series.filter((point) => point.anomaly).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const seasonal = seasonality(series, context.period);
  const topTerritories = territories.slice(0, 5).map((item) => `${item.territory} (${formatPercent(item.share)})`);
  const risingTerritories = territories.filter((item) => item.slope > 0).length;
  const fallingTerritories = territories.filter((item) => item.slope < 0).length;
  const scaleText =
    context.scale === "rate"
      ? "Os valores estao expressos como taxa por 100 mil habitantes, usando populacao municipal anual do IBGE e o codigo `mcirc` como chave."
      : "Os valores estao expressos em casos absolutos.";
  const populationWarning =
    context.scale === "rate" && context.missingPopulation
      ? ` Foram ignoradas ${context.missingPopulation.toLocaleString("pt-BR")} linhas sem populacao municipal correspondente.`
      : "";
  const geoWarning =
    context.scale === "rate" && context.geoLevel !== "munic"
      ? " Para AISP, RISP e CISP, a taxa usa a soma das populacoes dos municipios presentes no recorte; isso e uma aproximacao, porque essas areas nao equivalem necessariamente a municipios inteiros."
      : "";

  const paragraphs = [
    `O indicador ${labelize(context.indicator)} foi analisado entre ${context.startYear} e ${context.endYear}. ${scaleText}${populationWarning}${geoWarning} A serie vai de ${formatNumber(first.value)} em ${first.key} para ${formatNumber(last.value)} em ${last.key}, uma variacao acumulada de ${formatPercent(totalChange)}. A inclinacao linear e de ${formatNumber(slope)} por periodo, classificada como ${trendLabel(slope).toLowerCase()}.`,
    seasonal,
    abrupt.length
      ? `As quebras percentuais mais fortes aparecem em ${abrupt.join(", ")}. Esses pontos merecem verificacao porque podem indicar choque real, mudanca operacional, revisao de registro ou efeito de base quando o periodo anterior era muito baixo.`
      : "Nao foram encontradas quebras percentuais fortes no recorte atual.",
    anomalies.length
      ? `A serie tem ${anomalies.length} ponto(s) atipico(s) pelo criterio de 2 desvios-padrao. Os mais extremos sao ${anomalies.slice(0, 5).map((point) => `${point.key} (desvio ${formatNumber(point.z)})`).join(", ")}.`
      : "Nao ha pontos atipicos pelo criterio de 2 desvios-padrao no recorte selecionado.",
    `No nivel territorial ${labelize(context.geoLevel)}, os maiores pesos no total sao ${topTerritories.join(", ") || "indisponiveis"}. Entre os territorios filtrados, ${risingTerritories} mostram inclinacao positiva e ${fallingTerritories} mostram inclinacao negativa, o que ajuda a separar uma tendencia estadual ampla de movimentos concentrados em poucos lugares.`,
  ];

  els.analysisText.innerHTML = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  els.copyAnalysis.disabled = false;
}

function renderForecast(series, period) {
  if (series.length < 3) {
    els.forecastText.textContent = "Sao necessarios pelo menos 3 periodos.";
    els.forecastBody.innerHTML = '<tr><td colspan="2">Sem dados.</td></tr>';
    return;
  }
  const slope = linearSlope(series.map((point, index) => [index, point.value]));
  const intercept = linearIntercept(series.map((point, index) => [index, point.value]), slope);
  const forecast = [1, 2, 3].map((step) => {
    const index = series.length - 1 + step;
    return {
      key: nextPeriodKey(series[series.length - 1].key, period, step),
      value: Math.max(0, intercept + slope * index),
    };
  });
  els.forecastText.textContent = `Projecao linear simples: ${forecast.map((item) => `${item.key}: ${formatNumber(item.value)}`).join(", ")}.`;
  els.forecastBody.innerHTML = "";
  for (const item of forecast) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.key}</td><td>${formatNumber(item.value)}</td>`;
    els.forecastBody.appendChild(tr);
  }
}

function renderTerritoryTable(territories) {
  els.territoryBody.innerHTML = "";
  if (!territories.length) {
    els.territoryText.textContent = "Sem territorios para o recorte atual.";
    els.territoryBody.innerHTML = '<tr><td colspan="4">Sem dados.</td></tr>';
    return;
  }

  const top = territories[0];
  const topFiveShare = territories.slice(0, 5).reduce((sum, item) => sum + item.share, 0);
  els.territoryText.textContent = `O maior territorio no recorte e ${top.territory}, com ${formatPercent(top.share)} do total. Os cinco maiores somam ${formatPercent(topFiveShare)}.`;
  for (const item of territories.slice(0, 80)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.territory}</td>
      <td>${formatNumber(item.total)}</td>
      <td>${formatPercent(item.share)}</td>
      <td class="${item.slope > 0 ? "up" : item.slope < 0 ? "down" : "flat"}">${formatNumber(item.slope)}</td>
    `;
    els.territoryBody.appendChild(tr);
  }
}

function abruptChanges(series) {
  return series
    .filter((point) => Number.isFinite(point.change))
    .map((point) => ({ key: point.key, change: point.change, magnitude: Math.abs(point.change) }))
    .sort((a, b) => b.magnitude - a.magnitude);
}

function seasonality(series, period) {
  if (period !== "month") return "A sazonalidade mensal nao foi calculada porque o agrupamento selecionado nao e mensal.";
  const byMonth = new Map();
  for (const point of series) {
    const month = point.key.slice(5, 7);
    const values = byMonth.get(month) || [];
    values.push(point.value);
    byMonth.set(month, values);
  }
  const monthly = Array.from(byMonth.entries()).map(([month, values]) => ({ month, average: average(values) }));
  if (monthly.length < 12) return "Ainda nao ha cobertura mensal suficiente para comparar todos os meses do ano.";
  monthly.sort((a, b) => b.average - a.average);
  return `A leitura sazonal mostra medias mais altas em ${monthly.slice(0, 3).map((item) => monthName(item.month)).join(", ")} e mais baixas em ${monthly.slice(-3).map((item) => monthName(item.month)).join(", ")}. Isso ajuda a interpretar a variacao contra o mesmo mes do ano anterior.`;
}

function nextPeriodKey(key, period, step) {
  if (period === "year") return String(Number(key) + step);
  if (period === "quarter") {
    const [yearText, quarterText] = key.split("-T");
    const total = Number(yearText) * 4 + Number(quarterText) - 1 + step;
    return `${Math.floor(total / 4)}-T${(total % 4) + 1}`;
  }
  const [yearText, monthText] = key.split("-");
  const total = Number(yearText) * 12 + Number(monthText) - 1 + step;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  let cleaned = text.replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  if (comma > -1 && dot > -1) {
    cleaned = comma > dot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (comma > -1) {
    cleaned = cleaned.replace(",", ".");
  }
  return Number(cleaned);
}

function isFiniteNumber(value) {
  return Number.isFinite(parseNumber(value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function linearSlope(points) {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((sum, point) => sum + point[0], 0);
  const sumY = points.reduce((sum, point) => sum + point[1], 0);
  const sumXY = points.reduce((sum, point) => sum + point[0] * point[1], 0);
  const sumXX = points.reduce((sum, point) => sum + point[0] * point[0], 0);
  const denominator = n * sumXX - sumX * sumX;
  return denominator ? (n * sumXY - sumX * sumY) / denominator : 0;
}

function linearIntercept(points, slope) {
  return average(points.map((point) => point[1])) - slope * average(points.map((point) => point[0]));
}

function trendLabel(slope) {
  if (slope > 0.05) return `Alta (${formatNumber(slope)}/periodo)`;
  if (slope < -0.05) return `Queda (${formatNumber(slope)}/periodo)`;
  return "Estavel";
}

function classForChange(value) {
  if (!Number.isFinite(value) || value === null) return "flat";
  return value > 0 ? "up" : value < 0 ? "down" : "flat";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value === null) return "-";
  return value.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
}

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function monthName(month) {
  const names = {
    "01": "janeiro",
    "02": "fevereiro",
    "03": "marco",
    "04": "abril",
    "05": "maio",
    "06": "junho",
    "07": "julho",
    "08": "agosto",
    "09": "setembro",
    "10": "outubro",
    "11": "novembro",
    "12": "dezembro",
  };
  return names[month] || month;
}
