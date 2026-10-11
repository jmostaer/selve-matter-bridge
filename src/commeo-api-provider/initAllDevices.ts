import { CommeoShutter } from "./CommeoShutter.js";
import { getStates } from "./get-states.js"

export const initAllDevices = async () => {
    console.info("Initializing all Selve Commeo devices...");
    const states: any[] = await getStates();

    const CMdevices: any[] = states.filter((val: any) => {return val.type == "CM"});

    const commeoShutters: CommeoShutter[] = [];

    for (const device of CMdevices) {
        const position = device.state?.position;
        // Devices that are paired on the server but no longer reachable report "-" as position.
        if (typeof position !== "number") {
            console.warn(`Ignoring shutter ${device.sid} (${device.adr}): invalid state ${JSON.stringify(device.state)}`);
            continue;
        }

        const shutter = new CommeoShutter(device.sid, device.adr);
        shutter.currentPos = position;
        try {
            await shutter.updateName();
        } catch (error: any) {
            shutter.name = `Shutter ${device.sid}`;
            console.error(`Could not read the name of shutter ${device.sid}, using "${shutter.name}": ${error.message}`);
        }
        commeoShutters.push(shutter);
    }

    console.info(`Got ${commeoShutters.length} devices.`)

    return commeoShutters;
}
