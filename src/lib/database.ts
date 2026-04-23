import { SQL } from "bun";
import { env } from "./env";

export type Todo = {
	id: string;
	title: string;
	description?: string;
	done?: boolean;
};

type TodoRow = {
	id: string;
	title: string;
	description: string | null;
	done: boolean;
};

class TodoDatabase {
	private readonly sql: SQL;
	private readonly ready: Promise<void>;

	constructor(connectionString: string = env.DATABASE_URL) {
		this.sql = new SQL(connectionString);
		this.ready = this.initialize();
	}

	private async initialize() {
		await this.sql`
			CREATE TABLE IF NOT EXISTS todos (
				id UUID PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				done BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMPTZ DEFAULT NOW(),
				updated_at TIMESTAMPTZ DEFAULT NOW()
			)
		`;

		await this.seedInitialData();
	}

	private async seedInitialData() {
		const [{ count }] = await this.sql`
			SELECT COUNT(*)::int AS count FROM todos
		`;

		if (Number(count) > 0) {
			return;
		}

		const initialTodos = [
			{
				id: crypto.randomUUID(),
				title: "Learn TypeScript",
				description: "Understand the basics of TypeScript.",
				done: false,
			},
			{
				id: crypto.randomUUID(),
				title: "Build a REST API",
				description: "Create a simple REST API using Bun and Better Call.",
				done: true,
			},
		];

		await this.sql.begin(async (tx) => {
			await tx`
				INSERT INTO todos ${tx(
					initialTodos.map((todo) => ({
						...todo,
						description: todo.description ?? null,
					})),
				)}
			`;
		});
	}

	private async ensureReady() {
		await this.ready;
	}

	private mapRow(row: TodoRow): Todo {
		return {
			id: row.id,
			title: row.title,
			description: row.description ?? undefined,
			done: row.done,
		};
	}

	async createTodo(
		title: string,
		description?: string,
		done: boolean = false,
	): Promise<Todo> {
		await this.ensureReady();

		const todo = {
			id: crypto.randomUUID(),
			title,
			description: description ?? null,
			done,
		};

		const [inserted] = await this.sql`
			INSERT INTO todos ${this.sql(todo)}
			RETURNING id, title, description, done
		`;

		return this.mapRow(inserted as TodoRow);
	}

	async getTodos(filter?: string): Promise<Todo[]> {
		await this.ensureReady();

		const rows = (await (filter
			? this.sql`
					SELECT id, title, description, done
					FROM todos
					WHERE title ILIKE ${`%${filter}%`}
					ORDER BY done ASC, created_at ASC
			  `
			: this.sql`
					SELECT id, title, description, done
					FROM todos
					ORDER BY done ASC, created_at ASC
			  `)) as TodoRow[];

		return rows.map((row) => this.mapRow(row));
	}

	async getTodoById(id: string): Promise<Todo | undefined> {
		await this.ensureReady();

		const rows = await this.sql`
			SELECT id, title, description, done
			FROM todos
			WHERE id = ${id}
			LIMIT 1
		`;

		const row = rows[0] as TodoRow | undefined;
		return row ? this.mapRow(row) : undefined;
	}

	async updateTodo(
		id: string,
		updates: {
			title?: string;
			description?: string;
			done?: boolean;
		},
	): Promise<Todo | undefined> {
		await this.ensureReady();

		const existingTodo = await this.getTodoById(id);
		if (!existingTodo) return undefined;

		const updatesFiltered = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined),
		);
		const updatedTodo = {
			...existingTodo,
			...updatesFiltered,
		};

		const [row] = await this.sql`
			UPDATE todos
			SET title = ${updatedTodo.title},
				description = ${updatedTodo.description ?? null},
				done = ${updatedTodo.done ?? false},
				updated_at = NOW()
			WHERE id = ${id}
			RETURNING id, title, description, done
		`;

		return row ? this.mapRow(row as TodoRow) : undefined;
	}

	async deleteTodo(id: string): Promise<boolean> {
		await this.ensureReady();

		const rows = await this.sql`
			DELETE FROM todos
			WHERE id = ${id}
			RETURNING id
		`;

		return rows.length > 0;
	}

	async close() {
		await this.ensureReady();
		await this.sql.close();
	}
}

export const todoDb = new TodoDatabase();
export { TodoDatabase };
