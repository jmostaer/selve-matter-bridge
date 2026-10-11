import { sendRequest } from "./commeo-api-provider.js";
import { RequestMethod } from "./RequestMethod.js";

export const moveDown = (id: string) => {
	const body = {
		XC_FNC: "SendGenericCmd",
		id: id,
		data: {
			cmd: "moveDown",
		},
	};
	return sendRequest(RequestMethod.POST, "/cmd", body);
};
