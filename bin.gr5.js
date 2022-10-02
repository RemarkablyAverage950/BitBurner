/** @param {NS} ns **/
export async function main(ns) { // target, batID, endTime+50, growDelay, startTime,hackPID
	let target = ns.args[0]; 	// target
	var delay = ns.args[3];		// growDelay
	var endTime = ns.args[2]
	var startTime = ns.args[4]
	var hackPID = ns.args[5]
	ns.disableLog("sleep")
	await ns.sleep(startTime - performance.now())
	await ns.sleep(delay)
	if ((ns.getGrowTime(target) + performance.now()) - endTime <= 25 && endTime - (ns.getGrowTime(target) + performance.now()) >= -25) {
		await ns.grow(target)
	} else {
		ns.print("failed")
		let killed = ns.kill(hackPID)
		ns.print("Killed hack = " + killed)
	}
}
/*
	ns.exec("bin.hk4.js", server, hackThreads, target, batID, endTime, hackDelay, weak1Delay,startTime)
	ns.exec("bin.gr4.js", server, growThreads, target, batID, endTime, growDelay, weak2Delay, hackDelay,startTime)
	ns.exec("bin.wk4.js", server, weakThreads1, target, batID, endTime, weak1Delay,startTime)
	ns.exec("bin.wk4.js", server, weakThreads2, target, batID, endTime, weak2Delay,startTime)
*/