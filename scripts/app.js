import {
  state,
  adicionarProduto,
  atualizarProduto,
  removerProduto,
  atribuirProduto,
  devolverAoEstoque,
  atualizarObservacaoCadastro,
  ajustarQuantidadeEstoque,
  importarProdutos,
  toggleAtlasOk,
  adicionarTarefa,
  concluirTarefa,
  atualizarMinimos,
} from "./state.js";
import { escutarEstoque, escutarTarefas, escutarMinimos } from "./storage.js";
import {
  renderAll,
  renderCategoryFilters,
  renderAssignedCategoryFilters,
  renderTable,
  renderAssignedTable,
  renderCategoryBreakdown,
  setObservationSaveStatus,
} from "./ui.js";
import { exportarProdutosCsv, parseProdutosCsv } from "./csv.js";
import {
  produtoIndividual,
} from "./constants.js";

const noteSaveTimers = new Map();
const noteStatusTimers = new Map();
const noteSaveQueues = new Map();

function exibirErroSalvamento(erro) {
  console.error("Não foi possível salvar a observação do item:", erro);
  if (window.Swal) {
    Swal.fire({
      icon: "error",
      title: "Observação não salva",
      text: erro.message,
      background: "var(--bg-elev)",
      color: "var(--text)",
    });
  } else {
    alert(`Não foi possível salvar a observação: ${erro.message}`);
  }
}

async function salvarObservacaoItem(input) {
  const id = input.dataset.id;
  const texto = input.value;
  const anterior = noteSaveQueues.get(id) || Promise.resolve();
  const gravar = () => atualizarObservacaoCadastro(id, texto);
  const gravacao = anterior.then(gravar, gravar);
  noteSaveQueues.set(id, gravacao);
  setObservationSaveStatus(id, "Salvando...");

  try {
    await gravacao;
    const editorAtual = [...document.querySelectorAll(".item-note-input")].find(
      (editor) => editor.dataset.id === id,
    );
    if (editorAtual?.value.trim() === texto.trim()) {
      setObservationSaveStatus(id, "Salvo");
      const previousTimer = noteStatusTimers.get(id);
      if (previousTimer) clearTimeout(previousTimer);
      noteStatusTimers.set(
        id,
        setTimeout(() => {
          setObservationSaveStatus(id, "");
          noteStatusTimers.delete(id);
        }, 2500),
      );
    }
  } catch (erro) {
    setObservationSaveStatus(id, "Erro ao salvar");
    exibirErroSalvamento(erro);
  } finally {
    if (noteSaveQueues.get(id) === gravacao) noteSaveQueues.delete(id);
  }
}

function programarSalvamentoObservacao(input) {
  const id = input.dataset.id;
  const timerAnterior = noteSaveTimers.get(id);
  if (timerAnterior) clearTimeout(timerAnterior);
  setObservationSaveStatus(id, "Alteração pendente");
  noteSaveTimers.set(
    id,
    setTimeout(() => {
      noteSaveTimers.delete(id);
      void salvarObservacaoItem(input);
    }, 700),
  );
}

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
    observacaoCadastro: document.getElementById("observacaoCadastro").value,
    quantidade: Number(document.getElementById("quantidade").value),
  };
}

function limparFormulario() {
  const form = document.getElementById("productForm");
  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");
  const containerOutro = document.getElementById("fieldOutroContainer");
  const quantityContainer = document.getElementById("fieldQuantityContainer");
  const quantityInput = document.getElementById("quantidade");
  const nameContainer = document.getElementById("fieldNomeContainer");
  const nameInput = document.getElementById("nome");

  if (form) form.reset();
  if (containerOutro) containerOutro.style.display = "none";
  if (quantityContainer) quantityContainer.style.display = "none";
  if (nameContainer) nameContainer.style.display = "flex";
  if (nameInput) nameInput.required = false;
  if (quantityInput) quantityInput.value = "1";
  state.editandoId = null;
  if (submitBtn) submitBtn.textContent = "Adicionar item";
  if (formTitle) formTitle.textContent = "Cadastrar item";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
}

function preencherFormularioParaEdicao(produto) {
  document.getElementById("nome").value = produto.nome;
  document.getElementById("observacaoCadastro").value =
    produto.observacaoCadastro || "";

  const select = document.getElementById("categoria");
  const selectSub = document.getElementById("categoriaOutroSub");
  const containerOutro = document.getElementById("fieldOutroContainer");
  const quantityContainer = document.getElementById("fieldQuantityContainer");
  const nameContainer = document.getElementById("fieldNomeContainer");
  const nameInput = document.getElementById("nome");

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
  if (quantityContainer) quantityContainer.style.display = "none";
  if (nameContainer) nameContainer.style.display = "flex";
  if (nameInput) nameInput.required = true;

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
  document.addEventListener("input", (evento) => {
    const input = evento.target.closest(".item-note-input");
    if (input) programarSalvamentoObservacao(input);
  });

  document.addEventListener(
    "focusout",
    (evento) => {
      const input = evento.target.closest(".item-note-input");
      if (!input) return;
      const id = input.dataset.id;
      const timer = noteSaveTimers.get(id);
      const produto = state.produtos.find(
        (item) => String(item.id) === String(id),
      );
      if (!timer && produto?.observacaoCadastro === input.value.trim()) return;
      if (timer) clearTimeout(timer);
      noteSaveTimers.delete(id);
      void salvarObservacaoItem(input);
    },
    true,
  );

  const selectCat = document.getElementById("categoria");
  if (selectCat) {
    const atualizarCamposCategoria = () => {
      const containerOutro = document.getElementById("fieldOutroContainer");
      const containerNome = document.getElementById("fieldNomeContainer");
      const inputNome = document.getElementById("nome");
      const containerQuantidade = document.getElementById(
        "fieldQuantityContainer",
      );
      const inputQuantidade = document.getElementById("quantidade");
      const individual = produtoIndividual({
        categoria: selectCat.value,
        categoriaBase: selectCat.value,
      });
      if (containerOutro) {
        containerOutro.style.display =
          selectCat.value === "Outro" ? "block" : "none";
      }
      if (containerNome) {
        containerNome.style.display = individual ? "flex" : "none";
      }
      if (inputNome) inputNome.required = individual;
      if (inputQuantidade) {
        inputQuantidade.required = Boolean(selectCat.value && !individual);
      }
      if (containerQuantidade) {
        containerQuantidade.style.display =
          selectCat.value && !individual ? "flex" : "none";
      }
    };
    selectCat.addEventListener("change", atualizarCamposCategoria);
    atualizarCamposCategoria();
  }

  const taskForm = document.getElementById("taskForm");
  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("taskTitle");
      if (input && input.value.trim()) {
        await adicionarTarefa(input.value);
        input.value = "";
      }
    });
  }

  const taskList = document.getElementById("taskList");
  if (taskList) {
    taskList.addEventListener("change", async (e) => {
      if (e.target.classList.contains("task-checkbox")) {
        const id = e.target.getAttribute("data-id");
        await concluirTarefa(id);
      }
    });
  }

  const form = document.getElementById("productForm");
  if (form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = lerFormulario();

      try {
        if (state.editandoId !== null) {
          await atualizarProduto(state.editandoId, dados);
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
          await adicionarProduto(dados);
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
    tableBody.addEventListener("click", async (evento) => {
      const botao = evento.target.closest("button[data-action]");
      if (!botao) return;

      const id = botao.getAttribute("data-id");
      const acao = botao.getAttribute("data-action");
      const produto = state.produtos.find((p) => String(p.id) === String(id));
      if (!produto) return;

      if (acao === "adjust-quantity") {
        const atual = Number(produto.quantidade) || 0;
        let novaQuantidade;
        if (window.Swal) {
          const resultado = await Swal.fire({
            title: `Ajustar ${produto.nome}`,
            text: "Informe o saldo físico disponível. Saldo negativo indica falta para os PCs atribuídos.",
            input: "number",
            inputValue: atual,
            inputAttributes: { step: "1" },
            showCancelButton: true,
            confirmButtonText: "Salvar quantidade",
            cancelButtonText: "Cancelar",
            background: "var(--bg-elev)",
            color: "var(--text)",
          });
          if (!resultado.isConfirmed) return;
          novaQuantidade = Number(resultado.value);
        } else {
          const valor = prompt(
            `Quantidade atual: ${atual}. Informe o novo saldo:`,
            String(atual),
          );
          if (valor === null) return;
          novaQuantidade = Number(valor);
        }
        try {
          await ajustarQuantidadeEstoque(id, novaQuantidade);
          renderAll();
        } catch (erro) {
          if (window.Swal) {
            await Swal.fire({
              icon: "error",
              title: "Quantidade não salva",
              text: erro.message,
              background: "var(--bg-elev)",
              color: "var(--text)",
            });
          } else {
            alert(erro.message);
          }
        }
      } else if (acao === "edit") {
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
        }).then(async (resultado) => {
          if (resultado.isConfirmed) {
            try {
              const resultadoAtribuicao = await atribuirProduto(
                id,
                resultado.value,
              );
              const falta = resultadoAtribuicao.categoriasEmFalta;
              await Swal.fire({
                icon: falta.length ? "warning" : "success",
                title: falta.length
                  ? "PC atribuído com itens em falta"
                  : `Atribuído a "${resultado.value.trim()}"!`,
                text: falta.length
                  ? `O estoque ficou negativo para: ${falta.join(", ")}. Ajuste as quantidades quando necessário.`
                  : "",
                timer: falta.length ? undefined : 1400,
                showConfirmButton: Boolean(falta.length),
                background: "var(--bg-elev)",
                color: "var(--text)",
              });
              renderAll();
            } catch (erro) {
              await Swal.fire({
                icon: "error",
                title: "Não foi possível atribuir",
                text: erro.message,
                background: "var(--bg-elev)",
                color: "var(--text)",
              });
            }
          }
        });
      } else if (acao === "delete") {
        confirmarExclusao(produto);
      }
    });
  }

  const assignedTableBody = document.getElementById("assignedTableBody");
  if (assignedTableBody) {
    assignedTableBody.addEventListener("click", async (evento) => {
      const botao = evento.target.closest("button[data-action]");
      if (!botao) return;

      const id = botao.getAttribute("data-id");
      const acao = botao.getAttribute("data-action");
      const produto = state.produtos.find((p) => String(p.id) === String(id));
      if (!produto) return;

      if (acao === "return") {
        await devolverAoEstoque(id);
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

    assignedTableBody.addEventListener("change", async (evento) => {
      if (evento.target.classList.contains("atlas-checkbox")) {
        const id = evento.target.getAttribute("data-id");
        await toggleAtlasOk(id, evento.target.checked);
        renderAssignedTable();
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

  const buscaAtribuidos = document.getElementById("busca-atribuidos");
  if (buscaAtribuidos) {
    buscaAtribuidos.addEventListener("input", renderAssignedTable);
  }

  const filtroAtlas = document.getElementById("filtro-atlas");
  if (filtroAtlas) {
    filtroAtlas.addEventListener("change", renderAssignedTable);
  }

  const clearAssignedFilters = document.getElementById(
    "clearAssignedFilters",
  );
  if (clearAssignedFilters) {
    clearAssignedFilters.addEventListener("click", () => {
      const search = document.getElementById("busca-atribuidos");
      const atlas = document.getElementById("filtro-atlas");
      if (search) search.value = "";
      if (atlas) atlas.value = "todos";
      state.filtroCategoriaAtribuido = "Todas";
      renderAssignedCategoryFilters();
      renderAssignedTable();
    });
  }

  const exportCsvBtn = document.getElementById("exportCsvBtn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () =>
      exportarProdutosCsv(state.produtos),
    );
  }

  const importCsvInput = document.getElementById("importCsvInput");
  if (importCsvInput) {
    importCsvInput.addEventListener("change", async () => {
      const arquivo = importCsvInput.files[0];
      if (!arquivo) return;

      try {
        const produtos = parseProdutosCsv(await arquivo.text());
        const resultado = await importarProdutos(produtos);
        renderAll();
        const mensagem = `${resultado.importados} item(ns) importado(s). ${resultado.ignorados} item(ns) ignorado(s) por já existirem.`;
        if (window.Swal) {
          await Swal.fire({
            icon: "success",
            title: "Importação concluída",
            text: mensagem,
            background: "var(--bg-elev)",
            color: "var(--text)",
          });
        } else {
          alert(mensagem);
        }
      } catch (erro) {
        console.error("Não foi possível importar o CSV:", erro);
        if (window.Swal) {
          await Swal.fire({
            icon: "error",
            title: "Importação não concluída",
            text: erro.message,
            background: "var(--bg-elev)",
            color: "var(--text)",
          });
        } else {
          alert(`Não foi possível importar o CSV: ${erro.message}`);
        }
      } finally {
        importCsvInput.value = "";
      }
    });
  }

  const saveMinimumsBtn = document.getElementById("saveMinimumsBtn");
  if (saveMinimumsBtn) {
    saveMinimumsBtn.addEventListener("click", async () => {
      const inputs = document.querySelectorAll(".minimo-input");
      const novosMinimos = {};

      inputs.forEach((input) => {
        const cat = input.getAttribute("data-cat");
        const valor = Number(input.value);
        novosMinimos[cat] = Number.isFinite(valor) && valor >= 0 ? valor : 0;
      });

      await atualizarMinimos(novosMinimos);

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
  inicializarEventos();

  // Ouve atualizações em tempo real no banco
  escutarEstoque((produtos) => {
    state.produtos = produtos;
    renderAll();
  });

  escutarTarefas((tarefas) => {
    state.tarefas = tarefas;
    renderAll();
  });

  escutarMinimos((minimos) => {
    state.minimos = minimos;
    renderAll();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
