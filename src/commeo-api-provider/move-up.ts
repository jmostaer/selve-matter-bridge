import { sendRequest } from "./commeo-api-provider.js";
import { RequestMethod } from "./RequestMethod.js";

export const moveUp = (id: string) => {
	const body = {
		XC_FNC: "SendGenericCmd",
		id: id,
		data: {
			cmd: "moveUp",
		},
	};
	return sendRequest(RequestMethod.POST, "/cmd", body);
};
