/** @param {NS} ns **/
export async function main(ns) {
	let target = ns.args[0];
	let repeat = ns.args[5];
	do {
		ns.print(ns.getWeakenTime(target))
		await ns.weaken(target)
	} while (repeat)
}