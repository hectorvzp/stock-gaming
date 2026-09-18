import { STORAGE_KEY, MINIMOS_KEY, TAREFAS_KEY } from "./constants.js";
import {
  state,
  recarregarEstadoLocal,
  adicionarProduto,
  atualizarProduto,
  removerProduto,
  atribuirProduto,
  devolverAoEstoque,
  atualizarObservacao,
  toggleAtlasOk,
  adicionarTarefa,
  concluirTarefa,
  atualizarMinimos,
} from "./state.js";
import {
  renderAll,
  renderCategoryFilters,
  renderAssignedCategoryFilters,
  renderTable,
  renderAssignedTable,
  renderCategoryBreakdown,
} from "./ui.js";

function lerFormulario() {
  const select = document.getElementById("categoria");
  const selectSub = document.getElementById("categoriaOutroSub");
  const valSelect = select ? select.value : "";
  const valSub = selectSub ? selectSub.value : "";

  let catFinal = valSelect;
  if (valSelect === "Outro" && valSub) {
    catFinal = `Outro (${valSub})`;
  }

  return {
    nome: document.getElementById("nome").value,
    categoria: catFinal,
    categoriaBase: valSelect,
    subcategoria: valSelect === "Outro" ? valSub : null,
  };
}

function limparFormulario() {
  const form = document.getElementById("productForm");
  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");
  const containerOutro = document.getElementById("fieldOutroContainer");

  if (form) form.reset();
  if (containerOutro) containerOutro.style.display = "none";
  state.editandoId = null;
  if (submitBtn) submitBtn.textContent = "Adicionar item";
  if (formTitle) formTitle.textContent = "Cadastrar item";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
}

function preencherFormularioParaEdicao(produto) {
  document.getElementById("nome").value = produto.nome;

  const select = document.getElementById("categoria");
  const selectSub = document.getElementById("categoriaOutroSub");
  const containerOutro = document.getElementById("fieldOutroContainer");

  const catBase =
    produto.categoriaBase ||
    (produto.categoria.startsWith("Outro") ? "Outro" : produto.categoria);
  select.value = catBase;

  if (catBase === "Outro") {
    if (containerOutro) containerOutro.style.display = "block";
    if (selectSub) selectSub.value = produto.subcategoria || "";
  } else {
    if (containerOutro) containerOutro.style.display = "none";
    if (selectSub) selectSub.value = "";
  }

  state.editandoId = produto.id;
  const submitBtn = document.getElementById("submitBtn");
  const formTitle = document.getElementById("formTitle");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (submitBtn) submitBtn.textContent = "Salvar alterações";
  if (formTitle) formTitle.textContent = `Editando: ${produto.nome}`;
  if (cancelEditBtn) cancelEditBtn.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function confirmarExclusao(produto) {
  if (!window.Swal) {
    if (confirm(`Tem certeza que deseja remover "${produto.nome}"?`)) {
      removerProduto(produto.id);
      renderAll();
    }
    return;
  }

  Swal.fire({
    icon: "warning",
    title: "Remover item?",
    text: `Tem certeza que deseja remover "${produto.nome}" definitivamente?`,
    showCancelButton: true,
    confirmButtonText: "Sim, remover",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ff6b6b",
    background: "var(--bg-elev)",
    color: "var(--text)",
  }).then((resultado) => {
    if (resultado.isConfirmed) {
      removerProduto(produto.id);
      renderAll();
      Swal.fire({
        icon: "success",
        title: "Removido.",
        timer: 1200,
        showConfirmButton: false,
        background: "var(--bg-elev)",
        color: "var(--text)",
      });
    }
  });
}

function inicializarEventos() {
  const selectCat = document.getElementById("categoria");
  if (selectCat) {
    selectCat.addEventListener("change", function () {
      const containerOutro = document.getElementById("fieldOutroContainer");
      if (containerOutro) {
        containerOutro.style.display =
          this.value === "Outro" ? "block" : "none";
      }
    });
  }

  const taskForm = document.getElementById("taskForm");
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("taskTitle");
      if (input && input.value.trim()) {
        adicionarTarefa(input.value);
        input.value = "";
        renderAll();
      }
    });
  }

  const taskList = document.getElementById("taskList");
  if (taskList) {
    taskList.addEventListener("change", (e) => {
      if (e.target.classList.contains("task-checkbox")) {
        const id = Number(e.target.getAttribute("data-id"));
        concluirTarefa(id);
        renderAll();
      }
    });
  }

  const form = document.getElementById("productForm");
  if (form) {
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const dados = lerFormulario();

      try {
        if (state.editandoId !== null) {
          atualizarProduto(state.editandoId, dados);
          if (window.Swal) {
            Swal.fire({
              icon: "success",
              title: "Item atualizado!",
              timer: 1400,
              showConfirmButton: false,
              background: "var(--bg-elev)",
              color: "var(--text)",
            });
          }
        } else {
          adicionarProduto(dados);
          if (window.Swal) {
            Swal.fire({
              icon: "success",
              title: "Item cadastrado!",
              timer: 1400,
              showConfirmButton: false,
              background: "var(--bg-elev)",
              color: "var(--text)",
            });
          }
        }
        limparFormulario();
        renderAll();
      } catch (erro) {
        if (window.Swal) {
          Swal.fire({
            icon: "error",
            title: "Não foi possível salvar",
            text: erro.message,
            background: "var(--bg-elev)",
            color: "var(--text)",
          });
        } else {
          alert(erro.message);
        }
      }
    });
  }

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => limparFormulario());
  }

  const tableBody = document.getElementById("tableBody");
  if (tableBody) {
    tableBody.addEventListener("click", (evento) => {
      const botao = evento.target.closest("button[data-action]");
      if (!botao) return;

      const id = Number(botao.getAttribute("data-id"));
      const acao = botao.getAttribute("data-action");
      const produto = state.produtos.find((p) => p.id === id);
      if (!produto) return;

      if (acao === "edit") {
        preencherFormularioParaEdicao(produto);
      } else if (acao === "assign") {
        if (!window.Swal) return;
        Swal.fire({
          title: "Atribuir para quem?",
          input: "text",
          inputPlaceholder: "Nome da pessoa",
          showCancelButton: true,
          confirmButtonText: "Atribuir",
          cancelButtonText: "Cancelar",
          background: "var(--bg-elev)",
          color: "var(--text)",
          inputValidator: (valor) => {
            if (!valor || valor.trim().length === 0) {
              return "Digite um nome antes de continuar.";
            }
          },
        }).then((resultado) => {
          if (resultado.isConfirmed) {
            atribuirProduto(id, resultado.value);
            renderAll();
            Swal.fire({
              icon: "success",
              title: `Atribuído a "${resultado.value.trim()}"!`,
              timer: 1400,
              showConfirmButton: false,
              background: "var(--bg-elev)",
              color: "var(--text)",
            });
          }
        });
      } else if (acao === "delete") {
        confirmarExclusao(produto);
      }
    });
  }

  const assignedTableBody = document.getElementById("assignedTableBody");
  if (assignedTableBody) {
    assignedTableBody.addEventListener("click", (evento) => {
      const botao = evento.target.closest("button[data-action]");
      if (!botao) return;

      const id = Number(botao.getAttribute("data-id"));
      const acao = botao.getAttribute("data-action");
      const produto = state.produtos.find((p) => p.id === id);
      if (!produto) return;

      if (acao === "return") {
        devolverAoEstoque(id);
        renderAll();
        if (window.Swal) {
          Swal.fire({
            icon: "success",
            title: "Item devolvido ao estoque!",
            timer: 1400,
            showConfirmButton: false,
            background: "var(--bg-elev)",
            color: "var(--text)",
          });
        }
      } else if (acao === "delete") {
        confirmarExclusao(produto);
      }
    });

    assignedTableBody.addEventListener("change", (evento) => {
      if (evento.target.classList.contains("atlas-checkbox")) {
        const id = Number(evento.target.getAttribute("data-id"));
        toggleAtlasOk(id, evento.target.checked);
        renderAssignedTable();
      }
    });

    assignedTableBody.addEventListener("input", (evento) => {
      if (evento.target.classList.contains("obs-input")) {
        const id = Number(evento.target.getAttribute("data-id"));
        atualizarObservacao(id, evento.target.value);
      }
    });
  }

  const categoryFilters = document.getElementById("categoryFilters");
  if (categoryFilters) {
    categoryFilters.addEventListener("click", (evento) => {
      const chip = evento.target.closest(".chip");
      if (!chip) return;
      state.filtroCategoria = chip.getAttribute("data-cat");
      renderCategoryFilters();
      renderTable();
    });
  }

  const assignedCategoryFilters = document.getElementById(
    "assignedCategoryFilters",
  );
  if (assignedCategoryFilters) {
    assignedCategoryFilters.addEventListener("click", (evento) => {
      const chip = evento.target.closest(".chip");
      if (!chip) return;
      state.filtroCategoriaAtribuido = chip.getAttribute("data-cat");
      renderAssignedCategoryFilters();
      renderAssignedTable();
    });
  }

  const saveMinimumsBtn = document.getElementById("saveMinimumsBtn");
  if (saveMinimumsBtn) {
    saveMinimumsBtn.addEventListener("click", () => {
      const inputs = document.querySelectorAll(".minimo-input");
      const novosMinimos = {};

      inputs.forEach((input) => {
        const cat = input.getAttribute("data-cat");
        const valor = Number(input.value);
        novosMinimos[cat] = Number.isFinite(valor) && valor >= 0 ? valor : 0;
      });

      atualizarMinimos(novosMinimos);
      renderAll();

      if (window.Swal) {
        Swal.fire({
          icon: "success",
          title: "Mínimos salvos!",
          timer: 1200,
          showConfirmButton: false,
          background: "var(--bg-elev)",
          color: "var(--text)",
        });
      }
    });
  }

  const catPanel = document.querySelector(".cat-panel");
  if (catPanel) {
    catPanel.addEventListener("toggle", () => {
      if (catPanel.open) renderCategoryBreakdown();
    });
  }
}

function init() {
  recarregarEstadoLocal();
  inicializarEventos();
  renderAll();
}

window.addEventListener("pageshow", () => {
  recarregarEstadoLocal();
  renderAll();
});

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === MINIMOS_KEY || e.key === TAREFAS_KEY) {
    recarregarEstadoLocal();
    renderAll();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
