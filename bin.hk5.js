/** @param {NS} ns **/
export async function main(ns) { //target, batID, endTime-50, hackDelay, startTime
	let target = ns.args[0];
	var delay = ns.args[3];
	var endTime = ns.args[2]
	var startTime = ns.args[4]
	ns.disableLog("sleep")
	
	await ns.sleep(startTime - performance.now())
	
	await ns.sleep(delay)
	if ((ns.getHackTime(target) + performance.now()) - endTime <= 25 && endTime - (ns.getHackTime(target) + performance.now()) >= -25) {
		await ns.hack(target)
	} else {
		ns.print("failed")
	}

}
/*
	ns.exec("bin.hk4.js", server, hackThreads, target, batID, endTime, hackDelay, weak1Delay,startTime)
	ns.exec("bin.gr4.js", server, growThreads, target, batID, endTime, growDelay, weak2Delay, hackDelay,startTime)
	ns.exec("bin.wk4.js", server, weakThreads1, target, batID, endTime, weak1Delay,startTime)
	ns.exec("bin.wk4.js", server, weakThreads2, target, batID, endTime, weak2Delay,startTime)
*/