import { Endpoint, MaybePromise, ServerNode } from "@matter/main";
import { BridgedDeviceBasicInformationServer, WindowCoveringBehavior } from "@matter/main/behaviors";
import { WindowCovering } from "@matter/main/clusters";
import { WindowCoveringDevice } from "@matter/main/devices";
import { initAllDevices } from "./commeo-api-provider/initAllDevices.js";
import { CommeoShutter } from "./commeo-api-provider/CommeoShutter.js";
import { getStates } from "./commeo-api-provider/get-states.js";
import { AggregatorEndpoint } from "@matter/main/endpoints";

let updateTimemout: NodeJS.Timeout | undefined;
let stopped = false;



class SelveWindowCovering extends WindowCoveringBehavior.with(
	WindowCovering.Feature.Lift,
	WindowCovering.Feature.PositionAwareLift
) {

	declare state: SelveWindowCovering.State;

	override async downOrClose() {
		console.log(
			"we are closing",
			this.state.currentPositionLiftPercent100ths
		);
		this.state.targetPositionLiftPercent100ths = 10000;
		this.state.commeoShutter?.moveDown();
	}

	override goToLiftPercentage(
		request: WindowCovering.GoToLiftPercentageRequest
	): MaybePromise {
		this.state.targetPositionLiftPercent100ths = request.liftPercent100thsValue;
		this.state.commeoShutter?.moveTo(request.liftPercent100thsValue / 100);
	}

	override stopMotion() {
		this.state.targetPositionLiftPercent100ths = this.state.currentPositionLiftPercent100ths;
		this.state.commeoShutter?.stop();
	}

	override async upOrOpen() {
		console.log(
			"we are opening",
			this.state.currentPositionLiftPercent100ths
		);
		this.state.targetPositionLiftPercent100ths = 0;
		this.state.commeoShutter?.moveUp();
	}

	override initialize() {
		if(!this.state.commeoShutter){
			throw new Error("Missing commeo shutter reference!");
		}
		this.state.currentPositionLiftPercent100ths = this.state.commeoShutter.currentPos!;
	}
}

namespace SelveWindowCovering {
    export class State extends WindowCoveringBehavior.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift).State {
        commeoShutter?: CommeoShutter;
    }
}

const updateAllWindowCoverings = async () => {
	try {
	const states: any[] = await getStates();

    const CMdevices: any[] = states.filter((val: any) => {return val.type == "CM"});

	for (const cmDevice of CMdevices) {
		const matterDevice = deviceMap.get(cmDevice.sid);
		if(matterDevice && typeof cmDevice.state?.position === "number") {
			try {
				await matterDevice.setStateOf(SelveWindowCovering, {
					currentPositionLiftPercent100ths: cmDevice.state.position * 100
				});
			} catch(error: any) {
				console.error(`Couldn't update shutter ${cmDevice.sid}: ${error.message}`);
			}
		}
	}
} catch(error: any) {
	console.error(`Couldn't reach the server: ${error.message}`)
} finally {
	if (!stopped) {
		updateTimemout = setTimeout(() => updateAllWindowCoverings(), 1000);
	}
}

}


const commeoShutters: CommeoShutter[] = await initAllDevices();

const node = await ServerNode.create({
	basicInformation: {
		productName: "Selve Home Server 2 Bridge",
		vendorName: "SchneiderMaster"
	}
});

const aggregator = new Endpoint(AggregatorEndpoint, { id: "aggregator" });

await node.add(aggregator);

const deviceMap = new Map<string, any>();

for (const shutter of commeoShutters) {

	const device = await aggregator.add(WindowCoveringDevice.with(SelveWindowCovering).with(BridgedDeviceBasicInformationServer), {
		id: shutter.sid,
		bridgedDeviceBasicInformation: {
			nodeLabel: shutter.name
		},
		windowCovering: {
			commeoShutter: shutter
		}
	});

	deviceMap.set(shutter.sid!, device);
}

updateAllWindowCoverings();

await node.run();

stopped = true;
clearTimeout(updateTimemout);
