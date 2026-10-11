import { sendRequest } from "./commeo-api-provider.js";
import { RequestMethod } from "./RequestMethod.js";

export const stop = (id: string) => {
	const body = {
		XC_FNC: "SendGenericCmd",
		id: id,
		data: {
			cmd: "stop",
		},
	};
	return sendRequest(RequestMethod.POST, "/cmd", body);
};
