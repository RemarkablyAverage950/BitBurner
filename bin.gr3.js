/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0];
	var delay = ns.args[1];
	var psID = ns.args[2];
	let repeat = ns.args[5];
	
	do {
		await ns.sleep(delay)
		// check still synced with bin.wk.js 
		let weakLogs = ns.getScriptLogs("bin.wk.js",ns.getHostname(),target, psID)
		
		if (weakLogs[0]> delay + ns.getGrowTime(target)) {// growtime plus delay less than weaktime 
		await ns.grow(target)
		}
	} while (repeat)
}