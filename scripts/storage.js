import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  firebaseConfig,
  STORAGE_KEY,
  MINIMOS_KEY,
  TAREFAS_KEY,
  CATEGORIAS,
  CATEGORIAS_PECAS,
} from "./constants.js";

// Inicializa o Firebase
let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (erro) {
  console.warn(
    "Não foi possível inicializar o Firebase SDK. Usando suporte a LocalStorage como fallback.",
    erro,
  );
}

// Referências das Coleções no Firestore
const produtosRef = db ? collection(db, "produtos") : null;
const tarefasRef = db ? collection(db, "tarefas") : null;
const minimosDocRef = db ? doc(db, "configuracoes", "minimos") : null;

// ===== FALLBACKS DE LOCALSTORAGE =====
export function carregarEstoqueLocal() {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.map((p) => ({
      status: "estoque",
      atribuidoPara: null,
      dataAtribuicao: null,
      observacao: "",
      atlasOk: false,
      subcategoria: null,
      ...p,
    }));
  } catch (e) {
    return [];
  }
}

export function salvarEstoqueLocal(produtos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
  } catch (e) {
    console.error("Erro ao salvar no localStorage:", e);
  }
}

export function carregarTarefasLocal() {
  try {
    const bruto = window.localStorage.getItem(TAREFAS_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch (e) {
    return [];
  }
}

export function salvarTarefasLocal(tarefas) {
  try {
    window.localStorage.setItem(TAREFAS_KEY, JSON.stringify(tarefas));
  } catch (e) {
    console.error("Erro ao salvar tarefas no localStorage:", e);
  }
}

export function carregarMinimosLocal() {
  try {
    const bruto = window.localStorage.getItem(MINIMOS_KEY);
    const salvos = bruto ? JSON.parse(bruto) : {};
    const completo = {};
    CATEGORIAS.concat(CATEGORIAS_PECAS).forEach((cat) => {
      completo[cat] = Number.isFinite(salvos[cat]) ? salvos[cat] : 0;
    });
    return completo;
  } catch (e) {
    const padrao = {};
    CATEGORIAS.concat(CATEGORIAS_PECAS).forEach((cat) => {
      padrao[cat] = 0;
    });
    return padrao;
  }
}

export function salvarMinimosLocal(minimos) {
  try {
    window.localStorage.setItem(MINIMOS_KEY, JSON.stringify(minimos));
  } catch (e) {
    console.error("Erro ao salvar mínimos no localStorage:", e);
  }
}

// ===== LEITURA EM TEMPO REAL (FIRESTORE) =====
export function escutarEstoque(callback) {
  if (!db) {
    callback(carregarEstoqueLocal());
    return () => {};
  }
  return onSnapshot(
    produtosRef,
    (snapshot) => {
      const produtos = [];
      snapshot.forEach((docSnap) => {
        produtos.push({ id: docSnap.id, ...docSnap.data() });
      });
      salvarEstoqueLocal(produtos);
      callback(produtos);
    },
    (erro) => {
      console.error(
        "Erro ao escutar produtos no Firestore, recorrendo ao LocalStorage:",
        erro,
      );
      callback(carregarEstoqueLocal());
    },
  );
}

export function escutarTarefas(callback) {
  if (!db) {
    callback(carregarTarefasLocal());
    return () => {};
  }
  return onSnapshot(
    tarefasRef,
    (snapshot) => {
      const tarefas = [];
      snapshot.forEach((docSnap) => {
        tarefas.push({ id: docSnap.id, ...docSnap.data() });
      });
      salvarTarefasLocal(tarefas);
      callback(tarefas);
    },
    (erro) => {
      console.error(
        "Erro ao escutar tarefas no Firestore, recorrendo ao LocalStorage:",
        erro,
      );
      callback(carregarTarefasLocal());
    },
  );
}

export function escutarMinimos(callback) {
  if (!db) {
    callback(carregarMinimosLocal());
    return () => {};
  }
  return onSnapshot(
    minimosDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        salvarMinimosLocal(dados);
        callback(dados);
      } else {
        callback(carregarMinimosLocal());
      }
    },
    (erro) => {
      console.error(
        "Erro ao escutar mínimos no Firestore, recorrendo ao LocalStorage:",
        erro,
      );
      callback(carregarMinimosLocal());
    },
  );
}

// ===== ESCRITA E EXCLUSÃO (FIRESTORE + FALLBACK LOCAL) =====
export async function salvarProdutoFirestore(produto) {
  if (!db) {
    const estoque = carregarEstoqueLocal();
    const index = estoque.findIndex((p) => String(p.id) === String(produto.id));
    if (index >= 0) estoque[index] = produto;
    else estoque.push(produto);
    salvarEstoqueLocal(estoque);
    return;
  }
  const docRef = doc(db, "produtos", String(produto.id));
  await setDoc(docRef, produto);
}

export async function removerProdutoFirestore(id) {
  if (!db) {
    const estoque = carregarEstoqueLocal().filter(
      (p) => String(p.id) !== String(id),
    );
    salvarEstoqueLocal(estoque);
    return;
  }
  const docRef = doc(db, "produtos", String(id));
  await deleteDoc(docRef);
}

export async function salvarTarefaFirestore(tarefa) {
  if (!db) {
    const tarefas = carregarTarefasLocal();
    tarefas.push(tarefa);
    salvarTarefasLocal(tarefas);
    return;
  }
  const docRef = doc(db, "tarefas", String(tarefa.id));
  await setDoc(docRef, tarefa);
}

export async function removerTarefaFirestore(id) {
  if (!db) {
    const tarefas = carregarTarefasLocal().filter(
      (t) => String(t.id) !== String(id),
    );
    salvarTarefasLocal(tarefas);
    return;
  }
  const docRef = doc(db, "tarefas", String(id));
  await deleteDoc(docRef);
}

export async function salvarMinimosFirestore(minimos) {
  if (!db) {
    salvarMinimosLocal(minimos);
    return;
  }
  await setDoc(minimosDocRef, minimos);
}
