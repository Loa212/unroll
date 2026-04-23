import { createEndpoint, createRouter } from "better-call";
import { z } from "zod";
import { type Todo, todoDb } from "./database";

export const createTodo = createEndpoint(
	"/todo",
	{
		method: "POST",
		body: z.object({
			title: z.string(),
			description: z.string().optional(),
			done: z.boolean().optional().default(false),
		}),
	},
	async (ctx): Promise<Todo> => {
		return await todoDb.createTodo(
			ctx.body.title,
			ctx.body.description,
			ctx.body.done,
		);
	},
);

export const getTodos = createEndpoint(
	"/todos",
	{
		method: "GET",
		query: z.object({ filter: z.string().optional() }),
	},
	async (ctx): Promise<Todo[]> => {
		return await todoDb.getTodos(ctx.query.filter);
	},
);

export const getTodo = createEndpoint(
	"/todo",
	{
		method: "GET",
		query: z.object({
			id: z.string(),
		}),
	},
	async (ctx): Promise<Todo> => {
		const todo = await todoDb.getTodoById(ctx.query.id);
		if (!todo) {
			throw new Error("Todo not found");
		}
		return todo;
	},
);

export const deleteTodo = createEndpoint(
	"/todo",
	{
		method: "DELETE",
		query: z.object({
			id: z.string(),
		}),
	},
	async (ctx): Promise<{ success: boolean }> => {
		const deleted = await todoDb.deleteTodo(ctx.query.id);
		if (!deleted) {
			throw new Error("Todo not found");
		}
		return { success: true };
	},
);

export const updateTodo = createEndpoint(
	"/todo",
	{
		method: "PUT",
		body: z.object({
			id: z.string(),
			title: z.string().min(2).max(100).optional(),
			description: z.string().min(5).max(500).optional(),
			done: z.boolean().optional(),
		}),
	},
	async (ctx): Promise<Todo> => {
		const updatedTodo = await todoDb.updateTodo(ctx.body.id, {
			title: ctx.body.title,
			description: ctx.body.description,
			done: ctx.body.done,
		});

		if (!updatedTodo) {
			throw new Error("Todo not found");
		}

		return updatedTodo;
	},
);

export const router = createRouter(
	{
		createTodo,
		getTodos,
		getTodo,
		updateTodo,
		deleteTodo,
	},
	{ basePath: "/api" },
);
