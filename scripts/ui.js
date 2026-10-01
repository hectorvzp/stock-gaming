import {
  CATEGORY_COLORS,
  CATEGORIAS,
  CATEGORIAS_PECAS,
  categoriaBaseProduto,
  produtoIndividual,
} from "./constants.js";
import { state } from "./state.js";

let chartInstance = null;
const observationSaveStatus = new Map();

export function setObservationSaveStatus(id, status) {
  const productId = String(id);
  observationSaveStatus.set(productId, status);
  const statusElement = document.querySelector(
    `[data-note-status="${CSS.escape(productId)}"]`,
  );
  if (statusElement) statusElement.textContent = status;
}

function renderObservationEditor(produto) {
  const id = escapeHtml(String(produto.id));
  return `
    <textarea
      class="item-note-input"
      data-id="${id}"
      aria-label="Observação do item ${escapeHtml(produto.nome)}"
      placeholder="Adicionar ou editar observação..."
      rows="2"
    >${escapeHtml(produto.observacaoCadastro || "")}</textarea>
    <span class="note-save-status" data-note-status="${id}" aria-live="polite">${
      observationSaveStatus.get(String(produto.id)) || ""
    }</span>`;
}

export function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function itensEmEstoque() {
  return state.produtos.filter((p) => p.status === "estoque");
}

function quantidadeEmEstoque(produto) {
  const quantidade = Number(produto.quantidade);
  return Number.isFinite(quantidade) ? quantidade : 1;
}

function contarUnidades(produtos) {
  return produtos.reduce(
    (total, produto) => total + quantidadeEmEstoque(produto),
    0,
  );
}

export function itensAtribuidos() {
  const itens = state.produtos.filter((p) => p.status === "atribuido");
  const termo = document
    .getElementById("busca-atribuidos")
    ?.value.trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR") || "";
  const filtroAtlas =
    document.getElementById("filtro-atlas")?.value || "todos";

  return itens.filter((p) => {
    const categoria = p.categoriaBase || p.categoria;
    const correspondeCategoria =
      state.filtroCategoriaAtribuido === "Todas" ||
      categoria === state.filtroCategoriaAtribuido;
    const correspondeAtlas =
      filtroAtlas === "todos" ||
      (filtroAtlas === "ok" && Boolean(p.atlasOk)) ||
      (filtroAtlas === "pendente" && !p.atlasOk);
    const texto = [
      p.nome,
      p.atribuidoPara,
      p.categoria,
      p.categoriaBase,
      p.subcategoria,
      p.observacaoCadastro,
      p.dataAtribuicao,
    ]
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");

    return (
      correspondeCategoria &&
      correspondeAtlas &&
      (!termo || texto.includes(termo))
    );
  });
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
  const contagem = contarUnidades(emEstoque);
  const alertas = categoriasEmAlerta(contagem, state.minimos);

  statCount.textContent = contagem;
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
    const emEstoque = contarUnidades(
      state.produtos.filter(
        (p) => categoriaBaseProduto(p) === cat && p.status === "estoque",
      ),
    );
    const atribuidos =
      ["Mouse", "Teclado", "Webcam"].includes(cat)
      ? usoPc
      : state.produtos.filter(
          (p) =>
            categoriaBaseProduto(p) === cat &&
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
    const qtdEstoque = contarUnidades(produtos);
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
        <td data-label="${produtoIndividual(p) ? "Nome / Modelo" : "Tipo"}">
          ${escapeHtml(p.nome)}
          ${
            p.observacaoCadastro
              ? `<details class="stock-note"><summary>Observação do item</summary>${renderObservationEditor(p)}</details>`
              : `<details class="stock-note"><summary>Adicionar observação</summary>${renderObservationEditor(p)}</details>`
          }
        </td>
        <td data-label="Categoria">${escapeHtml(catExibicao)}</td>
        <td data-label="Quantidade">
          ${
            produtoIndividual(p)
              ? "—"
              : `<strong class="${quantidadeEmEstoque(p) < 0 ? "quantity-deficit" : ""}">${quantidadeEmEstoque(p)}</strong>
                 ${quantidadeEmEstoque(p) < 0 ? '<span class="quantity-deficit-label">em falta</span>' : "un."}`
          }
        </td>
        <td data-label="Ações"><div class="row-actions">
          ${
            produtoIndividual(p)
              ? `<button class="icon-btn" data-action="assign" data-id="${escapeHtml(String(p.id))}">Atribuir</button>
                 <button class="icon-btn" data-action="edit" data-id="${escapeHtml(String(p.id))}">Editar</button>
                 <button class="icon-btn danger" data-action="delete" data-id="${escapeHtml(String(p.id))}">Excluir</button>`
              : `<button class="icon-btn" data-action="adjust-quantity" data-id="${escapeHtml(String(p.id))}">Ajustar quantidade</button>`
          }
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
  const totalAtribuidos = state.produtos.filter(
    (produto) => produto.status === "atribuido",
  ).length;
  const resultCount = document.getElementById("assignedResultCount");
  if (resultCount) {
    resultCount.textContent = `${atribuidos.length} de ${totalAtribuidos} equipamento(s)`;
  }

  if (atribuidos.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    emptyState.textContent = totalAtribuidos
      ? "Nenhum equipamento corresponde aos filtros."
      : "Nenhum equipamento atribuído no momento.";
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
        <td data-label="Item">
          <span class="assigned-item-name">${escapeHtml(p.nome)}</span>
        </td>
        <td data-label="Categoria">${escapeHtml(catExibicao)}</td>
        <td data-label="Atribuído Para">${escapeHtml(p.atribuidoPara || "—")}</td>
        <td data-label="Data">${escapeHtml(p.dataAtribuicao || "—")}</td>
        <td data-label="Observação do item">${renderObservationEditor(p)}</td>
        <td data-label="Atlas"><label style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
          <input type="checkbox" class="atlas-checkbox" data-id="${p.id}" ${checked} style="cursor: pointer;" />
          <span style="font-size: 0.85rem; color: ${p.atlasOk ? "var(--mint, #3ddc97)" : "var(--text-dim)"};">${p.atlasOk ? "OK" : "Pendente"}</span>
        </label></td>
        <td data-label="Ações"><div class="row-actions">
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
  if (!listEl) return;

  const estoque = itensEmEstoque();
  const contagem = {};
  estoque.forEach((produto) => {
    const categoria = produto.subcategoria || categoriaBaseProduto(produto);
    contagem[categoria] =
      (contagem[categoria] || 0) + quantidadeEmEstoque(produto);
  });
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

  if (chartEl) {
    const chartTotal = document.getElementById("stockChartTotal");
    const categoriasGrafico = CATEGORIAS.concat(CATEGORIAS_PECAS);
    const contagemGrafico = categoriasGrafico.reduce((total, categoria) => {
      return total + Math.max(contagem[categoria] || 0, 0);
    }, 0);
    if (chartTotal) chartTotal.textContent = String(contagemGrafico);
  }

  if (window.Chart && chartEl) {
    const ctx = chartEl.getContext("2d");
    const categoriasGrafico = CATEGORIAS.concat(CATEGORIAS_PECAS);
    const labels = categoriasGrafico.filter((cat) => contagem[cat] > 0);
    const dados = labels.map((cat) => contagem[cat]);
    const cores = labels.map((cat) => CATEGORY_COLORS[cat] || "#8d99ae");

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: dados, backgroundColor: cores, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
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
  const activeElement = document.activeElement;
  const activeNote =
    activeElement instanceof HTMLTextAreaElement &&
    activeElement.classList.contains("item-note-input")
      ? {
          id: activeElement.dataset.id,
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
          detailsOpen: activeElement.closest("details")?.open || false,
        }
      : null;

  renderStats();
  renderCategoryDashboard();
  renderCategoryFilters();
  renderAssignedCategoryFilters();
  renderTable();
  renderAssignedTable();
  renderCategoryBreakdown();
  renderTarefas();

  if (activeNote?.id) {
    const replacement = [...document.querySelectorAll(".item-note-input")].find(
      (input) => input.dataset.id === activeNote.id,
    );
    if (replacement) {
      const details = replacement.closest("details");
      if (details && activeNote.detailsOpen) details.open = true;
      replacement.focus();
      replacement.setSelectionRange(activeNote.start, activeNote.end);
    }
  }
}
