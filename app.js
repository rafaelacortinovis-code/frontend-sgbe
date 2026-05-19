/* SGBE - Frontend SPA */

const storage = {
  key: 'sgbe_state_v1',
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  save(state) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
};

const nowISODate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysISO = (isoDate, days) => {
  const base = new Date(`${isoDate}T00:00:00`);
  base.setDate(base.getDate() + days);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const state = {
  data: null,
  ensure() {
    const persisted = storage.load();
    if (persisted) {
      this.data = persisted;
      return;
    }

    this.data = {
      livros: [
        { id: 1, titulo: 'O Senhor dos Anéis', autor: 'J.R.R. Tolkien', status: 'Disponível', disponivel: true },
        { id: 2, titulo: 'Dom Casmurro', autor: 'Machado de Assis', status: 'Emprestado', disponivel: false },
        { id: 3, titulo: '1984', autor: 'George Orwell', status: 'Disponível', disponivel: true }
      ],
      alunos: [
        { id: 1, nome: 'Ana Souza', email: 'ana@escola.com' },
        { id: 2, nome: 'Carlos Lima', email: 'carlos@escola.com' }
      ],
      emprestimos: [
        {
          id: 1,
          alunoId: 2,
          livroId: 2,
          data_retirada: '2024-05-01',
          data_prevista: '2024-05-08',
          status: 'Atrasado',
          devolvido: false
        }
      ]
    };

    storage.save(this.data);
  },
  persist() {
    storage.save(this.data);
  }
};

const ui = {
  els: {
    content: () => document.getElementById('content-area'),
    title: () => document.getElementById('current-view-title'),
    modal: () => document.getElementById('modal-container'),
    modalTitle: () => document.getElementById('modal-title'),
    modalBody: () => document.getElementById('modal-body'),
    confirmModal: () => document.getElementById('confirm-modal'),
    confirmMessage: () => document.getElementById('confirm-message'),
    confirmYes: () => document.getElementById('confirm-yes'),
    confirmNo: () => document.getElementById('confirm-no'),
    toastArea: () => document.getElementById('notification-container')
  },
  toast(msg, variant = 'info') {
    const container = this.els.toastArea();
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = variant === 'error'
      ? `<strong style="color: var(--danger);">Erro:</strong> ${msg}`
      : variant === 'success'
        ? `<strong style="color: var(--success);">Ok:</strong> ${msg}`
        : msg;

    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },
  openModal(title, html) {
    this.els.modalTitle().innerText = title;
    this.els.modalBody().innerHTML = html;
    this.els.modal().style.display = 'flex';
  },
  closeModal() {
    this.els.modal().style.display = 'none';
  },
  openConfirm(message, onConfirm) {
    this.els.confirmMessage().innerText = message;
    this.els.confirmYes().onclick = () => {
      this.els.confirmModal().style.display = 'none';
      onConfirm();
    };
    this.els.confirmNo().onclick = () => {
      this.els.confirmModal().style.display = 'none';
    };
    this.els.confirmModal().style.display = 'flex';
  }
};

const routes = {
  resolve() {
    const path = window.location.pathname || '/';
    if (path.startsWith('/livros')) return '/livros';
    if (path.startsWith('/alunos')) return '/alunos';
    if (path.startsWith('/emprestimos/devolver')) return '/emprestimos/devolver';
    if (path.startsWith('/emprestimos/novo')) return '/emprestimos/novo';
    if (path.startsWith('/emprestimos')) return '/emprestimos';
    if (path.startsWith('/relatorios')) return '/relatorios';
    return '/';
  },
  go(to) {
    window.history.pushState({}, '', to);
    render();
  }
};

function renderBadgeStatus(status) {
  const cls = status === 'Disponível' ? 'badge-success'
    : status === 'Emprestado' ? 'badge-warning'
      : status === 'Atrasado' ? 'badge-danger'
        : '';
  const label = status === 'Atrasado' ? 'Atrasado' : status;
  return `<span class="badge ${cls}">${label}</span>`;
}

function validateRequired(value) {
  return value && String(value).trim().length > 0;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function recalcAtrasados() {
  const today = nowISODate();
  for (const e of state.data.emprestimos) {
    if (e.devolvido) continue;
    const overdue = e.data_prevista && e.data_prevista < today;
    e.status = overdue ? 'Atrasado' : 'Ativo';

    const livro = state.data.livros.find(l => l.id === e.livroId);
    if (livro) {
      livro.status = 'Emprestado';
      livro.disponivel = false;
    }
  }
  state.persist();
}

function renderDashboard() {
  recalcAtrasados();
  const livrosTotal = state.data.livros.length;
  const alunosTotal = state.data.alunos.length;
  const emprestados = state.data.emprestimos.filter(e => !e.devolvido).length;
  const atrasados = state.data.emprestimos.filter(e => !e.devolvido && e.status === 'Atrasado').length;

  ui.els.content().innerHTML = `
    <div class="stats-grid">
      <div class="card stat-card"><h3>Total de livros</h3><div class="value">${livrosTotal}</div></div>
      <div class="card stat-card"><h3>Total de alunos</h3><div class="value">${alunosTotal}</div></div>
      <div class="card stat-card"><h3>Livros emprestados</h3><div class="value">${emprestados}</div></div>
      <div class="card stat-card"><h3>Empréstimos atrasados</h3><div class="value" style="color:var(--danger)">${atrasados}</div></div>
    </div>
  `;
}

function setupTableActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const id = Number(btn.getAttribute('data-id'));
      if (action === 'delete') {
        const type = btn.getAttribute('data-type');
        ui.openConfirm('Deseja realmente excluir este registro?', () => deleteEntity(type, id));
      }
      if (action === 'edit') {
        const type = btn.getAttribute('data-type');
        if (type === 'livros') openLivroModal(id);
        if (type === 'alunos') openAlunoModal(id);
      }
      if (action === 'devolver') {
        openDevolverFlow(id);
      }
    });
  });
}

function nextId(list) {
  return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1;
}

async function simulateHttp400(message) {
  const err = new Error(message);
  err.httpStatus = 400;
  throw err;
}

function deleteEntity(type, id) {
  if (type === 'livros') {
    state.data.livros = state.data.livros.filter(l => l.id !== id);
    state.data.emprestimos = state.data.emprestimos.filter(e => e.livroId !== id || e.devolvido);
    ui.toast('Livro excluído com sucesso.', 'success');
  }

  if (type === 'alunos') {
    state.data.alunos = state.data.alunos.filter(a => a.id !== id);
    state.data.emprestimos = state.data.emprestimos.filter(e => e.alunoId !== id || e.devolvido);
    ui.toast('Aluno excluído com sucesso.', 'success');
  }

  state.persist();
  render();
}

function openLivroModal(id) {
  const isEdit = typeof id === 'number' && Number.isFinite(id);
  const livro = isEdit ? state.data.livros.find(l => l.id === id) : null;
  const title = isEdit ? 'Editar livro' : 'Novo livro';

  ui.openModal(title, `
    <form id="livro-form" class="modal-form">
      <input type="hidden" id="livro-id" value="${isEdit ? livro.id : ''}">
      <div class="form-grid">
        <div>
          <label for="livro-titulo">Título</label>
          <input id="livro-titulo" type="text" placeholder="Título do livro" required value="${isEdit ? escapeHtml(livro.titulo) : ''}" />
          <div class="field-error" data-for="livro-titulo"></div>
        </div>
        <div>
          <label for="livro-autor">Autor</label>
          <input id="livro-autor" type="text" placeholder="Autor" required value="${isEdit ? escapeHtml(livro.autor) : ''}" />
          <div class="field-error" data-for="livro-autor"></div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="livro-cancel">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('livro-cancel').onclick = () => ui.closeModal();

  document.getElementById('livro-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = document.getElementById('livro-titulo').value;
    const autor = document.getElementById('livro-autor').value;

    let ok = true;
    const errors = [
      { id: 'livro-titulo', valid: validateRequired(titulo), msg: 'Informe o título.' },
      { id: 'livro-autor', valid: validateRequired(autor), msg: 'Informe o autor.' }
    ];

    errors.forEach(er => {
      const el = document.querySelector(`.field-error[data-for="${er.id}"]`);
      const inp = document.getElementById(er.id);
      if (!er.valid) {
        ok = false;
        inp.style.borderColor = 'var(--danger)';
        if (el) el.innerText = er.msg;
      } else {
        inp.style.borderColor = 'var(--primary)';
        if (el) el.innerText = '';
      }
    });

    if (!ok) return;

    const idVal = Number(document.getElementById('livro-id').value);
    if (isEdit) {
      const l = state.data.livros.find(x => x.id === idVal);
      if (l) {
        l.titulo = titulo.trim();
        l.autor = autor.trim();
      }
      ui.toast('Livro atualizado com sucesso.', 'success');
    } else {
      state.data.livros.push({
        id: nextId(state.data.livros),
        titulo: titulo.trim(),
        autor: autor.trim(),
        status: 'Disponível',
        disponivel: true
      });
      ui.toast('Livro cadastrado com sucesso.', 'success');
    }

    state.persist();
    ui.closeModal();
    render();
  });
}

function openAlunoModal(id) {
  const isEdit = typeof id === 'number' && Number.isFinite(id);
  const aluno = isEdit ? state.data.alunos.find(a => a.id === id) : null;
  const title = isEdit ? 'Editar aluno' : 'Novo aluno';

  ui.openModal(title, `
    <form id="aluno-form" class="modal-form">
      <input type="hidden" id="aluno-id" value="${isEdit ? aluno.id : ''}">
      <div class="form-grid">
        <div>
          <label for="aluno-nome">Nome</label>
          <input id="aluno-nome" type="text" placeholder="Nome completo" required value="${isEdit ? escapeHtml(aluno.nome) : ''}" />
          <div class="field-error" data-for="aluno-nome"></div>
        </div>
        <div>
          <label for="aluno-email">E-mail</label>
          <input id="aluno-email" type="email" placeholder="email@escola.com" required value="${isEdit ? escapeHtml(aluno.email) : ''}" />
          <div class="field-error" data-for="aluno-email"></div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="aluno-cancel">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('aluno-cancel').onclick = () => ui.closeModal();

  document.getElementById('aluno-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('aluno-nome').value;
    const email = document.getElementById('aluno-email').value;

    let ok = true;
    const errors = [
      { id: 'aluno-nome', valid: validateRequired(nome), msg: 'Informe o nome.' },
      { id: 'aluno-email', valid: validateRequired(email) && email.includes('@'), msg: 'Informe um e-mail válido.' }
    ];

    errors.forEach(er => {
      const el = document.querySelector(`.field-error[data-for="${er.id}"]`);
      const inp = document.getElementById(er.id);
      if (!er.valid) {
        ok = false;
        inp.style.borderColor = 'var(--danger)';
        if (el) el.innerText = er.msg;
      } else {
        inp.style.borderColor = 'var(--primary)';
        if (el) el.innerText = '';
      }
    });

    if (!ok) return;

    const idVal = Number(document.getElementById('aluno-id').value);
    if (isEdit) {
      const a = state.data.alunos.find(x => x.id === idVal);
      if (a) {
        a.nome = nome.trim();
        a.email = email.trim();
      }
      ui.toast('Aluno atualizado com sucesso.', 'success');
    } else {
      state.data.alunos.push({
        id: nextId(state.data.alunos),
        nome: nome.trim(),
        email: email.trim()
      });
      ui.toast('Aluno cadastrado com sucesso.', 'success');
    }

    state.persist();
    ui.closeModal();
    render();
  });
}

function renderLivros() {
  const livros = [...state.data.livros].sort((a, b) => a.id - b.id);
  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Livros</h2>
      <button class="btn-primary" id="btn-novo-livro">Novo Livro</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-wrap">
          <i class="fas fa-search"></i>
          <input id="livro-search" type="text" placeholder="Buscar por título ou autor" aria-label="Buscar livros" />
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>Status</th>
              <th class="actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${livros.map(l => `
              <tr>
                <td>${escapeHtml(l.titulo)}</td>
                <td>${escapeHtml(l.autor)}</td>
                <td>${renderBadgeStatus(l.status)}</td>
                <td class="actions-cell">
                  <button class="btn-secondary btn-sm" data-action="edit" data-type="livros" data-id="${l.id}">Editar</button>
                  <button class="btn-danger btn-sm" data-action="delete" data-type="livros" data-id="${l.id}">Excluir</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-novo-livro').addEventListener('click', () => openLivroModal());

  const search = document.getElementById('livro-search');
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    const filtered = livros.filter(l => (l.titulo + ' ' + l.autor).toLowerCase().includes(q));
    const tbody = ui.els.content().querySelector('tbody');
    tbody.innerHTML = filtered.map(l => `
      <tr>
        <td>${escapeHtml(l.titulo)}</td>
        <td>${escapeHtml(l.autor)}</td>
        <td>${renderBadgeStatus(l.status)}</td>
        <td class="actions-cell">
          <button class="btn-secondary btn-sm" data-action="edit" data-type="livros" data-id="${l.id}">Editar</button>
          <button class="btn-danger btn-sm" data-action="delete" data-type="livros" data-id="${l.id}">Excluir</button>
        </td>
      </tr>
    `).join('');
    setupTableActions();
  });

  setupTableActions();
}

function renderAlunos() {
  const alunos = [...state.data.alunos].sort((a, b) => a.id - b.id);
  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Alunos</h2>
      <button class="btn-primary" id="btn-novo-aluno">Novo Aluno</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-wrap">
          <i class="fas fa-search"></i>
          <input id="aluno-search" type="text" placeholder="Buscar por nome ou e-mail" aria-label="Buscar alunos" />
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th class="actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${alunos.map(a => `
              <tr>
                <td>${escapeHtml(a.nome)}</td>
                <td>${escapeHtml(a.email)}</td>
                <td class="actions-cell">
                  <button class="btn-secondary btn-sm" data-action="edit" data-type="alunos" data-id="${a.id}">Editar</button>
                  <button class="btn-danger btn-sm" data-action="delete" data-type="alunos" data-id="${a.id}">Excluir</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-novo-aluno').addEventListener('click', () => openAlunoModal());

  const search = document.getElementById('aluno-search');
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    const filtered = alunos.filter(a => (a.nome + ' ' + a.email).toLowerCase().includes(q));
    const tbody = ui.els.content().querySelector('tbody');
    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td>${escapeHtml(a.nome)}</td>
        <td>${escapeHtml(a.email)}</td>
        <td class="actions-cell">
          <button class="btn-secondary btn-sm" data-action="edit" data-type="alunos" data-id="${a.id}">Editar</button>
          <button class="btn-danger btn-sm" data-action="delete" data-type="alunos" data-id="${a.id}">Excluir</button>
        </td>
      </tr>
    `).join('');
    setupTableActions();
  });

  setupTableActions();
}

function renderEmprestimosList() {
  recalcAtrasados();
  const emprestimos = [...state.data.emprestimos]
    .map(e => {
      const aluno = state.data.alunos.find(a => a.id === e.alunoId);
      const livro = state.data.livros.find(l => l.id === e.livroId);
      return { ...e, alunoNome: aluno ? aluno.nome : '—', livroTitulo: livro ? livro.titulo : '—' };
    })
    .sort((a, b) => b.id - a.id);

  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Empréstimos</h2>
      <button class="btn-primary" id="btn-novo-emprestimo">Novo Empréstimo</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="filters">
          <span class="filter-pill">Total: ${emprestimos.filter(e => !e.devolvido).length}</span>
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Livro</th>
              <th>Aluno</th>
              <th>Data prevista</th>
              <th>Status</th>
              <th class="actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${emprestimos.filter(e => !e.devolvido).map(e => `
              <tr class="${e.status === 'Atrasado' ? 'atrasado' : ''}">
                <td>${escapeHtml(e.livroTitulo)}</td>
                <td>${escapeHtml(e.alunoNome)}</td>
                <td>${escapeHtml(e.data_prevista)}</td>
                <td>${renderBadgeStatus(e.status)}</td>
                <td class="actions-cell">
                  ${e.status === 'Atrasado' ? `<span class="badge badge-danger">Atrasado</span>` : ''}
                  <button class="btn-secondary btn-sm" data-action="devolver" data-id="${e.id}">Devolver</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-novo-emprestimo').addEventListener('click', () => routes.go('/emprestimos/novo'));
  setupTableActions();
}

function openDevolverFlow(id) {
  const emp = state.data.emprestimos.find(e => e.id === id);
  const livro = state.data.livros.find(l => l.id === emp.livroId);
  const aluno = state.data.alunos.find(a => a.id === emp.alunoId);

  ui.openConfirm('Confirmar devolução do empréstimo?', () => {
    emp.devolvido = true;
    emp.status = 'Concluído';

    if (livro) {
      livro.disponivel = true;
      livro.status = 'Disponível';
    }

    state.persist();
    ui.toast('Devolução registrada com sucesso.', 'success');
    render();
  });
}

function renderEmprestimoNovo() {
  const hoje = nowISODate();
  const prevista = addDaysISO(hoje, 7);
  const livrosDisponiveis = state.data.livros.filter(l => l.disponivel);

  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Novo Empréstimo</h2>
      <button class="btn-secondary" id="voltar-emprestimos">Voltar</button>
    </div>

    <div class="table-container">
      <div class="form-wrap">
        <form id="emprestimo-form" class="modal-form">
          <div class="form-grid">
            <div>
              <label for="emprestimo-aluno">Aluno</label>
              <select id="emprestimo-aluno" required>
                <option value="" selected disabled>Selecione</option>
                ${state.data.alunos.map(a => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('')}
              </select>
              <div class="field-error" data-for="emprestimo-aluno"></div>
            </div>

            <div>
              <label for="emprestimo-livro">Livro (Disponível)</label>
              <select id="emprestimo-livro" required>
                <option value="" selected disabled>${livrosDisponiveis.length ? 'Selecione' : 'Sem livros disponíveis'}</option>
                ${livrosDisponiveis.map(l => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`).join('')}
              </select>
              <div class="field-error" data-for="emprestimo-livro"></div>
            </div>
          </div>

          <div class="form-grid">
            <div>
              <label for="emprestimo-data-prevista">Data prevista</label>
              <input id="emprestimo-data-prevista" type="date" value="${prevista}" required readonly />
            </div>
            <div>
              <label for="emprestimo-data-retirada">Data de retirada</label>
              <input id="emprestimo-data-retirada" type="date" value="${hoje}" required readonly />
            </div>
          </div>

          <div id="emprestimo-error" class="inline-error" role="alert" aria-live="assertive" style="display:none"></div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="emprestimo-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('voltar-emprestimos').addEventListener('click', () => routes.go('/emprestimos'));
  document.getElementById('emprestimo-cancel').addEventListener('click', () => routes.go('/emprestimos'));

  document.getElementById('emprestimo-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const erroEl = document.getElementById('emprestimo-error');
    erroEl.style.display = 'none';

    const alunoId = Number(document.getElementById('emprestimo-aluno').value);
    const livroId = Number(document.getElementById('emprestimo-livro').value);

    const livro = state.data.livros.find(l => l.id === livroId);
    if (!livro || !livro.disponivel) {
      const msg = 'Livro indisponível para empréstimo';
      erroEl.innerText = msg;
      erroEl.style.display = 'block';

      try {
        await simulateHttp400(msg);
      } catch (err) {
        ui.toast('Falha ao registrar empréstimo (HTTP 400).', 'error');
      }
      return;
    }

    const dataRetirada = document.getElementById('emprestimo-data-retirada').value;
    const dataPrevista = document.getElementById('emprestimo-data-prevista').value;

    state.data.emprestimos.push({
      id: nextId(state.data.emprestimos),
      alunoId,
      livroId,
      data_retirada: dataRetirada,
      data_prevista: dataPrevista,
      status: dataPrevista < nowISODate() ? 'Atrasado' : 'Ativo',
      devolvido: false
    });

    livro.disponivel = false;
    livro.status = 'Emprestado';

    state.persist();
    ui.toast('Empréstimo registrado com sucesso.', 'success');
    routes.go('/emprestimos');
  });
}

function renderDevolverPlaceholder() {
  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Devolução</h2>
      <button class="btn-secondary" onclick="window.history.back()">Voltar</button>
    </div>
    <div class="card">
      <p>Use a página <strong>/emprestimos</strong> para registrar devoluções diretamente.</p>
    </div>
  `;
}

function renderRelatorios() {
  recalcAtrasados();
  const atrasados = state.data.emprestimos.filter(e => !e.devolvido && e.status === 'Atrasado');
  const emprestimosAtivos = state.data.emprestimos.filter(e => !e.devolvido);

  ui.els.content().innerHTML = `
    <div class="section-header">
      <h2>Relatórios</h2>
      <button class="btn-secondary" onclick="ui.toast('Relatórios prontos para integração com backend.', 'info')">Gerar</button>
    </div>

    <div class="stats-grid">
      <div class="card stat-card"><h3>Emprestimos ativos</h3><div class="value">${emprestimosAtivos.length}</div></div>
      <div class="card stat-card"><h3>Emprestimos atrasados</h3><div class="value" style="color:var(--danger)">${atrasados.length}</div></div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Livro</th>
              <th>Aluno</th>
              <th>Data prevista</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${atrasados.map(e => {
              const livro = state.data.livros.find(l => l.id === e.livroId);
              const aluno = state.data.alunos.find(a => a.id === e.alunoId);
              return `
                <tr class="atrasado">
                  <td>${escapeHtml(livro ? livro.titulo : '—')}</td>
                  <td>${escapeHtml(aluno ? aluno.nome : '—')}</td>
                  <td>${escapeHtml(e.data_prevista)}</td>
                  <td>${renderBadgeStatus(e.status)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function render() {
  const path = routes.resolve();
  const titleMap = {
    '/': 'Dashboard',
    '/livros': 'Livros',
    '/alunos': 'Alunos',
    '/emprestimos': 'Empréstimos',
    '/emprestimos/novo': 'Novo Empréstimo',
    '/emprestimos/devolver': 'Devolução',
    '/relatorios': 'Relatórios'
  };

  ui.els.title().innerText = titleMap[path] || 'SGBE';

  if (path === '/') return renderDashboard();
  if (path === '/livros') return renderLivros();
  if (path === '/alunos') return renderAlunos();
  if (path === '/emprestimos') return renderEmprestimosList();
  if (path === '/emprestimos/novo') return renderEmprestimoNovo();
  if (path === '/emprestimos/devolver') return renderDevolverPlaceholder();
  if (path === '/relatorios') return renderRelatorios();
}

document.addEventListener('DOMContentLoaded', () => {
  state.ensure();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      const map = {
        dashboard: '/',
        livros: '/livros',
        alunos: '/alunos',
        emprestimos: '/emprestimos',
        relatorios: '/relatorios'
      };
      routes.go(map[view] || '/');
    });
  });

  document.querySelector('.close-modal').addEventListener('click', () => ui.closeModal());

  window.addEventListener('popstate', render);

  document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-modal').style.display = 'none';
  });

  render();
});

