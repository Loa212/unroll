import { createClient } from "better-call/client";
import type { Todo } from "./database";
import type { router } from "./server";

const client = createClient<typeof router>({
	baseURL: `${window.location.origin}/api`,
});

const todosContainer = document.getElementById("todos");
const form = document.getElementById("todo-form") as HTMLFormElement | null;

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

function renderTodos(todos: Todo[]) {
	if (!todosContainer) return;

	if (!todos.length) {
		todosContainer.innerHTML =
			'<p class="text-center text-base-content/60">No todos yet. Add one above!</p>';
		return;
	}

	const items = todos
		.map((todo) => {
			return `
				<div class="card bg-base-100 border border-base-200 shadow-sm">
					<div class="card-body gap-2 p-4">
						<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<h3 class="card-title text-lg ${
								todo.done ? "line-through text-base-content/60" : ""
							}">
								${escapeHtml(todo.title)}
							</h3>
							<div class="flex items-center gap-4">
								<span class="text-sm font-semibold ${
									todo.done ? "text-success" : "text-error"
								}">
									${todo.done ? "Done" : "Pending"}
								</span>
								<div class="tooltip" data-tip="${todo.done ? "Mark as todo" : "Mark as done"}">
									<label class="toggle text-base-content">
										<input
											type="checkbox"
											class="todo-toggle-input"
											data-todo-id="${todo.id}"
											${todo.done ? "checked" : ""}
											aria-label="Toggle todo status"
										/>
										<svg
											aria-label="disabled"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="4"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M18 6 6 18" />
											<path d="m6 6 12 12" />
										</svg>
										<svg aria-label="enabled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
											<g
												stroke-linejoin="round"
												stroke-linecap="round"
												stroke-width="4"
												fill="none"
												stroke="currentColor"
											>
												<path d="M20 6 9 17l-5-5"></path>
											</g>
										</svg>
									</label>
								</div>
							</div>
						</div>
						${
							todo.description
								? `<p class="text-sm text-base-content/70 ${
										todo.done ? "line-through" : ""
									}">${escapeHtml(todo.description)}</p>`
								: ""
						}
					</div>
				</div>
			`;
		})
		.join("");

	todosContainer.innerHTML = `<div class="space-y-4">${items}</div>`;
}

todosContainer?.addEventListener("change", handleToggleChange);

async function handleToggleChange(event: Event) {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	if (!target.classList.contains("todo-toggle-input")) return;

	const todoId = target.dataset.todoId;
	if (!todoId) return;

	const isDone = target.checked;
	try {
		await client("@put/todo", {
			body: { id: todoId, done: isDone },
			throw: true,
		});
		await loadTodos();
	} catch (error) {
		console.error("Failed to update todo", error);
		target.checked = !isDone;
		alert("Unable to update todo. Please try again.");
	}
}

async function loadTodos() {
	try {
		const response = await client("/todos");

		if (response.error) {
			throw new Error(response.error.statusText || "Failed to load todos");
		}

		renderTodos(response.data);
	} catch (error) {
		console.error("Failed to load todos", error);
		if (todosContainer) {
			todosContainer.textContent =
				"Failed to load todos. Please refresh the page.";
		}
	}
}

await loadTodos();

form?.addEventListener("submit", async (event) => {
	event.preventDefault();

	const currentForm = event.currentTarget as HTMLFormElement;
	const formData = new FormData(currentForm);
	const title = String(formData.get("title") ?? "").trim();
	const descriptionRaw = formData.get("description");
	const description =
		typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
			? descriptionRaw.trim()
			: undefined;
	const done = formData.get("done") === "on";

	if (!title) {
		alert("Title is required.");
		return;
	}

	try {
		const response = await fetch(currentForm.action, {
			method: currentForm.method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title,
				description,
				done,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create todo: ${response.statusText}`);
		}

		currentForm.reset();
		window.location.href = "/";
	} catch (error) {
		console.error("Failed to create todo", error);
		alert("Unable to create todo. Please try again.");
	}
});
