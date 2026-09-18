import { CATEGORY_COLORS, CATEGORIAS, CATEGORIAS_PECAS } from "./constants.js";
import { state } from "./state.js";

let chartInstance = null;

export function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function itensEmEstoque() {
  return state.produtos.filter((p) => p.status === "estoque");
}

export function itensAtribuidos() {
  const itens = state.produtos.filter((p) => p.status === "atribuido");
  if (state.filtroCategoriaAtribuido === "Todas") return itens;
  return itens.filter(
    (p) => (p.categoriaBase || p.categoria) === state.filtroCategoriaAtribuido,
  );
}

export function produtosFiltrados() {
  const itens = itensEmEstoque();
  if (state.filtroCategoria === "Todas") return itens;
  return itens.filter((p) => {
    const catBase = p.categoriaBase || p.categoria;
    const sub = p.subcategoria;
    return catBase === state.filtroCategoria || sub === state.filtroCategoria;
  });
}

function contarPorCategoriaRecursivo(produtos, indice = 0, acumulado = {}) {
  if (indice >= produtos.length) return acumulado;
  const produto = produtos[indice];
  const chaveCat =
    produto.subcategoria || produto.categoriaBase || produto.categoria;
  acumulado[chaveCat] = (acumulado[chaveCat] || 0) + 1;
  return contarPorCategoriaRecursivo(produtos, indice + 1, acumulado);
}

function categoriasEmAlerta(contagem, minimos) {
  return CATEGORIAS.concat(CATEGORIAS_PECAS).filter((cat) => {
    const qtd = contagem[cat] || 0;
    const minimo = minimos[cat] || 0;
    return minimo > 0 && qtd < minimo;
  });
}

export function renderStats() {
  const statCount = document.getElementById("statCount");
  const statAssigned = document.getElementById("statAssigned");
  const statLow = document.getElementById("statLow");
  if (!statCount || !statAssigned || !statLow) return;

  const emEstoque = itensEmEstoque();
  const atribuidos = state.produtos.filter((p) => p.status === "atribuido");
  const contagem = contarPorCategoriaRecursivo(emEstoque);
  const alertas = categoriasEmAlerta(contagem, state.minimos);

  statCount.textContent = emEstoque.length;
  statAssigned.textContent = atribuidos.length;
  statLow.textContent = alertas.length;
}

export function renderCategoryDashboard() {
  const container = document.getElementById("categoryDashboardGrid");
  if (!container) return;

  const usoPc = state.produtos.filter(
    (p) =>
      (p.categoriaBase || p.categoria) === "PC" && p.status === "atribuido",
  ).length;

  container.innerHTML = CATEGORIAS.map((cat) => {
    const emEstoque = state.produtos.filter(
      (p) => (p.categoriaBase || p.categoria) === cat && p.status === "estoque",
    ).length;
    let atribuidos = ["Mouse", "Teclado", "Wacom", "Webcam"].includes(cat)
      ? usoPc
      : state.produtos.filter(
          (p) =>
            (p.categoriaBase || p.categoria) === cat &&
            p.status === "atribuido",
        ).length;

    const total = emEstoque + atribuidos;
    const cor = CATEGORY_COLORS[cat] || "#9aa1b4";

    return `
      <div style="background: var(--bg-elev-2); border: 1px solid var(--line); border-radius: 8px; padding: 0.85rem; border-left: 4px solid ${cor};">
        <p style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.3rem; font-weight: 600;">${cat}</p>
        <p style="font-size: 1.5rem; font-weight: 700; color: var(--text); margin: 0 0 0.4rem 0;">${total}</p>
        <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between;">
          <span>Estoque: <strong>${emEstoque}</strong></span>
          <span>Uso: <strong>${atribuidos}</strong></span>
        </div>
      </div>`;
  }).join("");
}

export function renderTable() {
  const tbody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tbody || !emptyState) return;

  const produtos = produtosFiltrados();

  // ALERTA AUTOMÁTICO: se uma categoria específica estiver selecionada e tiver 3 ou menos itens
  if (state.filtroCategoria !== "Todas") {
    const qtdEstoque = produtos.length;
    if (qtdEstoque <= 3) {
      if (window.Swal) {
        Swal.fire({
          icon: "warning",
          title: "Estoque Baixo! ⚠️",
          text: `A categoria "${state.filtroCategoria}" possui apenas ${qtdEstoque} item(ns) em estoque. Recomenda-se comprar mais!`,
          background: "var(--bg-elev)",
          color: "var(--text)",
          confirmButtonColor: "#ffb238",
          confirmButtonText: "Entendido",
        });
      } else {
        alert(
          `Atenção: A categoria "${state.filtroCategoria}" está com estoque baixo (${qtdEstoque} itens). Comprar mais!`,
        );
      }
    }
  }

  if (produtos.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = produtos
    .map((p) => {
      const catExibicao = p.subcategoria
        ? `Outro (${p.subcategoria})`
        : p.categoria;
      return `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(catExibicao)}</td>
        <td><div class="row-actions">
          <button class="icon-btn" data-action="assign" data-id="${p.id}">Atribuir</button>
          <button class="icon-btn" data-action="edit" data-id="${p.id}">Editar</button>
          <button class="icon-btn danger" data-action="delete" data-id="${p.id}">Excluir</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

export function renderAssignedTable() {
  const tbody = document.getElementById("assignedTableBody");
  const emptyState = document.getElementById("assignedEmptyState");
  if (!tbody || !emptyState) return;

  const atribuidos = itensAtribuidos();

  if (atribuidos.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = atribuidos
    .map((p) => {
      const checked = p.atlasOk ? "checked" : "";
      const catExibicao = p.subcategoria
        ? `Outro (${p.subcategoria})`
        : p.categoria;
      return `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(catExibicao)}</td>
        <td>${escapeHtml(p.atribuidoPara || "—")}</td>
        <td>${p.dataAtribuicao || "—"}</td>
        <td><input type="text" class="obs-input" data-id="${p.id}" value="${escapeHtml(p.observacao)}" placeholder="Adicionar obs..." style="width: 100%; min-width: 130px; padding: 0.3rem 0.5rem; background: var(--bg-elev-2); border: 1px solid var(--line); color: var(--text); border-radius: 4px; font-size: 0.85rem;" /></td>
        <td><label style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
          <input type="checkbox" class="atlas-checkbox" data-id="${p.id}" ${checked} style="cursor: pointer;" />
          <span style="font-size: 0.85rem; color: ${p.atlasOk ? "var(--mint, #3ddc97)" : "var(--text-dim)"};">${p.atlasOk ? "OK" : "Pendente"}</span>
        </label></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-action="return" data-id="${p.id}">Devolver ao estoque</button>
          <button class="icon-btn danger" data-action="delete" data-id="${p.id}">Excluir</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

export function renderCategoryFilters() {
  const container = document.getElementById("categoryFilters");
  if (!container) return;

  const emEstoque = itensEmEstoque();
  const opcoes = ["Todas"].concat(CATEGORIAS).concat(CATEGORIAS_PECAS);

  const categoriasUsadas = opcoes.filter((c) => {
    if (c === "Todas") return true;
    return emEstoque.some(
      (p) => (p.categoriaBase || p.categoria) === c || p.subcategoria === c,
    );
  });

  container.innerHTML = categoriasUsadas
    .map((cat) => {
      const ativo = cat === state.filtroCategoria ? " active" : "";
      return `<button class="chip${ativo}" data-cat="${cat}">${cat}</button>`;
    })
    .join("");
}

export function renderAssignedCategoryFilters() {
  const container = document.getElementById("assignedCategoryFilters");
  if (!container) return;

  const categoriasFiltro = ["Todas", "PC", "Monitor", "Wacom"];

  container.innerHTML = categoriasFiltro
    .map((cat) => {
      const ativo = cat === state.filtroCategoriaAtribuido ? " active" : "";
      const rotulo = cat === "Todas" ? "Todos" : cat;
      return `<button class="chip${ativo}" data-cat="${cat}">${rotulo}</button>`;
    })
    .join("");
}

export function renderCategoryBreakdown() {
  const listEl = document.getElementById("categoryList");
  const chartEl = document.getElementById("categoryChart");
  if (!listEl || !chartEl) return;

  const contagem = contarPorCategoriaRecursivo(itensEmEstoque());
  const todasCategoriasPainel = CATEGORIAS.concat(CATEGORIAS_PECAS);

  listEl.innerHTML = todasCategoriasPainel
    .map((cat) => {
      const qtd = contagem[cat] || 0;
      const minimo = state.minimos[cat] || 0;
      const baixo = minimo > 0 && qtd < minimo;
      const statusTexto = baixo ? "Baixo" : "OK";
      const statusEstilo = baixo
        ? "color: var(--amber); font-weight: 600;"
        : "color: var(--mint);";

      return `
      <div class="cat-row" style="grid-template-columns: 140px 60px 90px 60px;">
        <span>${cat}</span>
        <span style="color: var(--text-dim);">${qtd} itens</span>
        <span><input type="number" min="0" class="minimo-input" data-cat="${cat}" value="${minimo}" style="width: 100%; padding: 0.3rem 0.4rem; background: var(--bg-elev-2); border: 1px solid var(--line); color: var(--text); border-radius: 4px;"></span>
        <span style="${statusEstilo} text-align:right;">${statusTexto}</span>
      </div>`;
    })
    .join("");

  if (window.Chart) {
    const ctx = chartEl.getContext("2d");
    const labels = CATEGORIAS.filter((cat) => contagem[cat] > 0);
    const dados = labels.map((cat) => contagem[cat]);
    const cores = labels.map((cat) => CATEGORY_COLORS[cat]);

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: dados, backgroundColor: cores, borderWidth: 0 }],
      },
      options: {
        plugins: { legend: { display: false } },
        cutout: "68%",
      },
    });
  }
}

export function renderTarefas() {
  const ul = document.getElementById("taskList");
  const emptyState = document.getElementById("taskEmptyState");
  if (!ul || !emptyState) return;

  if (!state.tarefas || state.tarefas.length === 0) {
    ul.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  ul.innerHTML = state.tarefas
    .map(
      (t) => `
    <li style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-elev-2); border: 1px solid var(--line); border-radius: 6px;">
      <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; flex: 1;">
        <input type="checkbox" class="task-checkbox" data-id="${t.id}" style="cursor: pointer; width: 18px; height: 18px;" />
        <span style="font-size: 0.95rem; color: var(--text);">${escapeHtml(t.texto)}</span>
      </label>
      <span style="font-size: 0.75rem; color: var(--text-dim);">${t.criadaEm}</span>
    </li>
  `,
    )
    .join("");
}

export function renderAll() {
  renderStats();
  renderCategoryDashboard();
  renderCategoryFilters();
  renderAssignedCategoryFilters();
  renderTable();
  renderAssignedTable();
  renderCategoryBreakdown();
  renderTarefas();
}
