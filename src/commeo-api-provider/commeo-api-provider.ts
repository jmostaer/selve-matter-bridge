import axios from "axios";
import * as dotenv from "dotenv";
import { RequestMethod } from "./RequestMethod.js";

dotenv.config();

const rawIp = process.env.SELVE_SERVER_IP;
const password = process.env.SELVE_SERVER_PASSWORD;

if (rawIp == null) {
	throw new Error("SELVE_SERVER_IP is unset");
}
if (password == null) {
	throw new Error("SELVE_SERVER_PASSWORD is unset");
}

const baseUrl = (/^https?:\/\//i.test(rawIp) ? rawIp : "http://" + rawIp).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 250;

// The Home Server 2 has very little memory and drops requests when several
// arrive at once, so every request goes through this single queue.
let queue: Promise<unknown> = Promise.resolve();

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
	const result = queue.then(task);
	queue = result.catch(() => undefined);
	return result;
};

class SelveResponseError extends Error {}

const truncate = (value: unknown, max = 200): string => {
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return text == null ? String(value) : text.length > max ? text.slice(0, max) + "..." : text;
};

const sendOnce = async (
	method: RequestMethod,
	url: string,
	fnc: string,
	body?: any
): Promise<any> => {
	if (method !== RequestMethod.GET && method !== RequestMethod.POST) {
		throw new SelveResponseError("Unsupported HTTP method");
	}

	let response;
	try {
		response =
			method === RequestMethod.GET
				? await axios.get(url, { timeout: REQUEST_TIMEOUT_MS })
				: await axios.post(url, body, { timeout: REQUEST_TIMEOUT_MS });
	} catch (error: any) {
		throw new Error(`${fnc}: ${error.message}`);
	}

	if (response.status != 200) {
		throw new Error(`${fnc}: HTTP ${response.status} ${response.statusText}`);
	}
	if (response.data?.XC_ERR != null) {
		throw new SelveResponseError(`${fnc}: server returned error ${truncate(response.data.XC_ERR)}`);
	}
	if (response.data?.XC_SUC === undefined) {
		throw new Error(`${fnc}: response has neither XC_SUC nor XC_ERR: ${truncate(response.data)}`);
	}
	return response.data.XC_SUC;
};

export const sendRequest = (
	method: RequestMethod,
	path: string,
	body?: any
): Promise<any> => {
	const url =
		baseUrl +
		"/" +
		(path.startsWith("/") ? path.substring(1) : path) +
		(path.includes("?") ? "&" : "?") +
		"auth=" +
		encodeURIComponent(password);
	const fnc = body?.XC_FNC ?? new URLSearchParams(path.split("?")[1]).get("XC_FNC") ?? path;

	return enqueue(async () => {
		try {
			return await sendOnce(method, url, fnc, body);
		} catch (error) {
			if (error instanceof SelveResponseError) {
				throw error;
			}
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
			return await sendOnce(method, url, fnc, body);
		}
	});
};
