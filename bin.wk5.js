/** @param {NS} ns */

export async function main(ns) { //ns.exec("bin.wk5.js", server, weakThreads2, target, batID, endTime+100, weak2Delay, startTime)
	let target = ns.args[0];
	var endTime = ns.args[2]
	var delay = ns.args[3]
	var startTime = ns.args[4]
	var hackPID = ns.args[5]
	var growPID = ns.args[6]
	var wkPID = ns.args[7]
	
	ns.print("startTime = "+startTime )
	ns.print("current time = "+performance.now())
	await ns.sleep(startTime - performance.now())
	ns.print("current time = "+performance.now())
	await ns.sleep(delay)
	ns.print("current time = "+performance.now())
	ns.print("weakenTime = "+ns.getWeakenTime(target))
	ns.print("endTime = "+endTime)
	if ((ns.getWeakenTime(target) + performance.now()) - endTime <= 25 && endTime - (ns.getWeakenTime(target) + performance.now()) >= -25) {
		await ns.weaken(target)
	} else {
		//kill batch
		ns.print("failed")
		ns.kill(hackPID)
		ns.kill(growPID)
		ns.kill(wkPID)
	}
}