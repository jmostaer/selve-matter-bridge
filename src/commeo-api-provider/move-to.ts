import { sendRequest } from "./commeo-api-provider.js";
import { RequestMethod } from "./RequestMethod.js";

export const moveTo = async (id: string, pos: number) => {
	if (pos > 100 || pos < 0) {
		throw new Error("Invalid Position");
	}
	const body = {
		XC_FNC: "SendGenericCmd",
		id: id,
		data: {
			cmd: "moveTo",
			value: pos,
		},
	};
	return sendRequest(RequestMethod.POST, "/cmd", body);
};
