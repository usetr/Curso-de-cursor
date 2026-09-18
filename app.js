const STORAGE_KEY = "taskboard-ai-tasks";

const lists = {
  todo: document.getElementById("todo-list"),
  doing: document.getElementById("doing-list"),
  done: document.getElementById("done-list"),
};

const newTaskBtn = document.getElementById("new-task-btn");
const modal = document.getElementById("task-modal");
const modalTitle = document.getElementById("task-modal-title");
const modalCancel = document.getElementById("task-modal-cancel");
const form = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const taskTitleInput = document.getElementById("task-title");
const taskDescriptionInput = document.getElementById("task-description");
const taskStatusInput = document.getElementById("task-status");


const SAMPLE_TASKS = [
  {
    id: crypto.randomUUID(),
    title: "Planificar el sprint",
    description: "Definir objetivos y prioridades de la semana.",
    status: "todo",
  },
  {
    id: crypto.randomUUID(),
    title: "Diseñar el tablero",
    description: "Montar columnas y tarjetas con Tailwind.",
    status: "doing",
  },
  {
    id: crypto.randomUUID(),
    title: "Configurar el proyecto",
    description: "Crear index.html, styles.css y app.js.",
    status: "done",
  },
];

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TASKS));
    return SAMPLE_TASKS;
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TASKS));
      return SAMPLE_TASKS;
    }
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TASKS));
    return SAMPLE_TASKS;
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function deleteTask(taskId) {
  const tasks = loadTasks().filter((item) => item.id !== taskId);
  saveTasks(tasks);
  renderTasks();
}

/**
 * Crea el elemento de tarjeta para una tarea, con acciones de editar y eliminar.
 * @param {{ id: string, title: string, description?: string, status: string }} task
 * @returns {HTMLLIElement}
 */
export function createTaskCard(task) {
  const item = document.createElement("li");
  item.className = `task-card task-card--${task.status}`;
  item.draggable = true;
  item.dataset.taskId = task.id;

  const description = escapeHtml(task.description || "").trim();
  const descriptionMarkup = description
    ? `<p class="task-card-description text-slate-600">${description}</p>`
    : "";

  item.innerHTML = `
    <article class="bg-blue-50 transition hover:-translate-y-1 hover:shadow-lg">
      <div class="task-card-body">
        <div class="task-card-content">
          <h3 class="task-card-title text-slate-900">${escapeHtml(task.title)}</h3>
          ${descriptionMarkup}
        </div>
        <div class="task-card-actions">
          <button
            type="button"
            class="task-edit rounded-lg p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700"
            aria-label="Editar"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.25 18.002H5.25v-3L16.862 4.487z" />
            </svg>
          </button>
          <button
            type="button"
            class="task-delete rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Eliminar"
            title="Eliminar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;

  const editBtn = item.querySelector(".task-edit");
  const deleteBtn = item.querySelector(".task-delete");

  editBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = loadTasks().find((itemTask) => itemTask.id === task.id);
    if (current) openModal(current);
  });

  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteTask(task.id);
  });

  [editBtn, deleteBtn].forEach((button) => {
    button.addEventListener("mousedown", (event) => event.stopPropagation());
    button.addEventListener("dragstart", (event) => event.preventDefault());
  });

  return item;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTasks() {
  Object.values(lists).forEach((list) => {
    list.innerHTML = "";
  });

  loadTasks().forEach((task) => {
    const list = lists[task.status];
    if (!list) return;
    list.appendChild(createTaskCard(task));
  });
}

function openModal(task) {
  if (task) {
    modalTitle.textContent = "Editar tarea";
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description || "";
    taskStatusInput.value = task.status;
  } else {
    modalTitle.textContent = "Nueva tarea";
    form.reset();
    taskIdInput.value = "";
    taskStatusInput.value = "todo";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.setAttribute("aria-hidden", "false");
  taskTitleInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.setAttribute("aria-hidden", "true");
  form.reset();
  taskIdInput.value = "";
}

newTaskBtn.addEventListener("click", () => openModal());
modalCancel.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

let draggedTaskId = null;
let didDrag = false;

document.addEventListener("click", (event) => {
  if (didDrag) return;
  if (event.target.closest(".task-edit, .task-delete")) return;

  const card = event.target.closest("[data-task-id]");
  if (!card) return;

  const task = loadTasks().find((item) => item.id === card.dataset.taskId);
  if (task) openModal(task);
});

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".task-card[data-task-id]");
  if (!card) return;

  draggedTaskId = card.dataset.taskId;
  didDrag = true;
  card.classList.add("is-dragging");
  event.dataTransfer.setData("text/plain", draggedTaskId);
  event.dataTransfer.effectAllowed = "move";
});

document.addEventListener("dragend", (event) => {
  const card = event.target.closest(".task-card");
  card?.classList.remove("is-dragging");
  draggedTaskId = null;
  document.querySelectorAll(".drop-column.is-drag-over").forEach((column) => {
    column.classList.remove("is-drag-over");
  });
  requestAnimationFrame(() => {
    didDrag = false;
  });
});

document.addEventListener("dragover", (event) => {
  const column = event.target.closest("[data-status]");
  if (!column) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".drop-column.is-drag-over").forEach((item) => {
    if (item !== column) item.classList.remove("is-drag-over");
  });
  column.classList.add("is-drag-over");
});

document.addEventListener("dragleave", (event) => {
  const column = event.target.closest("[data-status]");
  if (!column) return;
  if (column.contains(event.relatedTarget)) return;
  column.classList.remove("is-drag-over");
});

document.addEventListener("drop", (event) => {
  const column = event.target.closest("[data-status]");
  if (!column) return;

  event.preventDefault();
  column.classList.remove("is-drag-over");

  const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
  const nextStatus = column.dataset.status;
  if (!taskId || !nextStatus) return;

  const tasks = loadTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.status === nextStatus) return;

  task.status = nextStatus;
  saveTasks(tasks);
  renderTasks();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const tasks = loadTasks();
  const id = taskIdInput.value;
  const payload = {
    id: id || crypto.randomUUID(),
    title: taskTitleInput.value.trim(),
    description: taskDescriptionInput.value.trim(),
    status: taskStatusInput.value,
  };

  if (!payload.title) return;

  const index = tasks.findIndex((task) => task.id === id);
  if (index >= 0) {
    tasks[index] = payload;
  } else {
    tasks.push(payload);
  }

  saveTasks(tasks);
  closeModal();
  renderTasks();
});


renderTasks();
