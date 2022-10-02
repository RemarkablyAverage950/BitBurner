/** @param {NS} ns */

const YIELD_PCT = 0.05
const FILES = ["bin.wk.js", "bin.gr3.js", "bin.hk5.js", "bin.wk5.js", "bin.gr5.js", "bin.gr5.js"]
const HK5RAM = 1.75
const WK5RAM = 2.3
const GR5RAM = 2.3
const WKRAM = 1.8
const GR3RAM = 1.85

// Returns list of all servers recursively
function dpList(ns, current = "home", set = new Set()) {
	let connections = ns.scan(current)
	let next = connections.filter(c => !set.has(c))
	next.forEach(n => {
		set.add(n);
		return dpList(ns, n, set)
	})
	return Array.from(set.keys())
}
// Uploads bin worker files to all servers
export async function uploadWorkers(ns, servers) {
	for (let server of servers) {
		await ns.scp(FILES, server, "home")
	}
}

// Attempts to open all ports and nuke a server
function openPorts(ns, server) {
	try {
		ns.brutessh(server)
		ns.ftpcrack(server)
		ns.relaysmtp(server)
		ns.httpworm(server)
		ns.sqlinject(server)
	} catch { }
	try {
		ns.nuke(server)
	} catch { }
}
// Finds a target
function findTarget(ns, servers, curTarget) {
	let player = ns.getPlayer();
	let hackTargets = servers.filter(server => ns.getServerRequiredHackingLevel(server) < player.skills.hacking && !server.includes("pserv") && !server.includes("home"))
	let target = hackTargets[0];
	var weakTime = 0;
	let server = ns.getServer("home");
	var targetYield = 0;
	var serverYield = 0;
	for (var i = 0; i < hackTargets.length; ++i) {
		server = ns.getServer(hackTargets[i]);
		server.hackDifficulty = server.minDifficulty
		weakTime = ns.formulas.hacking.weakenTime(server, player);
		serverYield = ((YIELD_PCT * server.moneyMax * ns.formulas.hacking.hackChance(server, player)) / weakTime);
		if (serverYield > targetYield && ns.hasRootAccess(hackTargets[i]) && ns.getServerMoneyAvailable(server.hostname) > 0&& weakTime < 600000) {
			target = hackTargets[i];
			targetYield = serverYield;
		}
	}
	if (curTarget != target) {
		printTargetInfo(ns, hackTargets, target)
	}
	return target;
}
// Prints target information to terminal
function printTargetInfo(ns, hackTargets, target) {
	ns.tprint("Number of targets: " + hackTargets.length);
	ns.tprint("Hacking best target " + target);
}
// Returns max number of threads able to run on a server
function threadCount(ns, hostname, scriptRam) {
	let threads = 0;
	let free_ram = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)
	if (hostname == "home") {
		free_ram = free_ram - 30;
	}
	threads = free_ram / scriptRam
	return Math.max(Math.floor(threads), 0)
}
// Returns free ram on a server
function getFreeRam(ns, hostname) {
	let free_ram = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)
	if (hostname == "home") {
		free_ram = free_ram - 30;
	}
	return Math.max(0, free_ram)
}
// Returns number of threads needed to reduce to minimum hackDifficulty
function calcWeakThreads(ns, so, to) {
	let securityDecreaseNeeded = to.hackDifficulty - to.minDifficulty;
	return Math.max(1, Math.ceil(securityDecreaseNeeded / ns.weakenAnalyze(1, so.cpuCores)))
}
// Returns number of threads needed to increase money to moneyMax
function calcGrowThreads(ns, so, to, player) {
	let growPerThread = (to.moneyAvailable * ns.formulas.hacking.growPercent(to, 1, player, so.cpuCores)) - to.moneyAvailable
	let growNeeded = to.moneyMax - to.moneyAvailable
	return Math.max(1, Math.ceil(growNeeded / growPerThread))
}
// Returns number of threads needed to hack the target
function calcHackThreads(ns, to, player) {
	let targetAmount = to.moneyMax * YIELD_PCT
	let amountPerThread = to.moneyMax * ns.formulas.hacking.hackPercent(to, player) // money per thread
	return Math.ceil(targetAmount / amountPerThread)
}
// Returns smaller batch for available ram when not enough ram for normal batch
function findReducedHackThreads(ns, highHackThreads, reduceRatio, free_ram, so, to, player) {
	let arr = []
	let startHackThreads = Math.floor(highHackThreads / reduceRatio)
	for (let i = startHackThreads; i < highHackThreads; i++) {
		let hackThreads = i
		to.hackDifficulty += 0.002 * hackThreads
		to.moneyAvailable -= (to.moneyAvailable * hackThreads * ns.formulas.hacking.hackPercent(to, player))
		let weakThreads1 = calcWeakThreads(ns, so, to)
		to.hackDifficulty = to.minDifficulty
		let growThreads = calcGrowThreads(ns, so, to, player)
		to.moneyAvailable = to.moneyMax
		to.hackDifficulty += 0.004 * growThreads
		let weakThreads2 = calcWeakThreads(ns, so, to)
		to.hackDifficulty = to.minDifficulty
		let ram_needed = (hackThreads * HK5RAM) + (growThreads * GR5RAM) + (weakThreads1 * WK5RAM) + (weakThreads2 * WK5RAM)
		if (ram_needed < free_ram) {
			arr.push(hackThreads)
		} else {
			return Math.max(...arr)
		}

	}

}
// Returns false if another batch has that endTime reserved
function checkEndTimes(endTimes, endTime) {
	let ret = true
	for (let i = 0; i < endTimes.length; i++) {
		if (Math.abs(endTime - endTimes[i]) < 140) {
			ret = false
			break;
		}
	}
	return ret
}
// Returns true if we are inside a pay window
function inPayWindow(endTimes) {
	for (let endTime of endTimes) {
		if (Math.abs(performance.now() - endTime) < 100) {
			return true
		}
	}
	return false
}


export async function main(ns) {

	let servers = dpList(ns)
	let target = findTarget(ns, servers, "n00dles") || "n00dles"
	let endTimes = []
	await uploadWorkers(ns, servers)


	while (true) {
		let to = ns.getServer(target)
		while (to.hackDifficulty > to.minDifficulty) {
			for (let server of servers) {
				if (ns.hasRootAccess(server)) {
					let so = ns.getServer(server)
					let weakThreads = calcWeakThreads(ns, so, to)
					let available_threads = threadCount(ns, server, WKRAM)
					if (available_threads >= weakThreads) {
						ns.exec("bin.wk.js", server, weakThreads, target, performance.now())
						to.hackDifficulty = to.minDifficulty;
						await ns.sleep(50)
						break;
					} else if (available_threads >= 1) {
						ns.exec("bin.wk.js", server, available_threads, target, performance.now())
						to.hackDifficulty = Math.max(to.minDifficulty, to.hackDifficulty - ns.weakenAnalyze(available_threads, so.cpuCores))
						await ns.sleep(50)
					}
				} else {
					openPorts(ns, server)
				}
			}
			await ns.sleep(0)
		}
		while (to.moneyMax > to.moneyAvailable) {
			for (let server of servers) {
				if (ns.hasRootAccess(server)) {
					let so = ns.getServer(server)
					let player = ns.getPlayer()
					let growThreadsNeeded = calcGrowThreads(ns, so, to, player)
					to.hackDifficulty += 0.004 * growThreadsNeeded
					let weakThreadsNeeded = calcWeakThreads(ns, so, to)
					to.hackDifficulty = to.minDifficulty
					let ram_needed = (weakThreadsNeeded * WKRAM) + (growThreadsNeeded * GR3RAM)
					let total_threads_avail = threadCount(ns, server, ram_needed)
					//let individual_threads = threadCount(ns, server, 1.85)//
					let grow_time = ns.getGrowTime(target)
					let weak_time = ns.getWeakenTime(target)
					let growDelay = weak_time - grow_time - 50
					if (total_threads_avail >= 1) {
						let batID = performance.now()
						ns.exec("bin.wk.js", server, weakThreadsNeeded, target, batID)
						ns.exec("bin.gr3.js", server, growThreadsNeeded, target, growDelay, batID)//["neo-net", 6966.119229529282, 1, "neo-net", 0.7421563826562374]
						to.moneyAvailable = to.moneyMax;
						await ns.sleep(100)
						break;
					} else {
						let free_ram = getFreeRam(ns, server)
						if (free_ram > 0) {
							let reduceRatio = ram_needed / free_ram
							growThreadsNeeded = Math.floor(growThreadsNeeded / reduceRatio)
							to.hackDifficulty += 0.004 * growThreadsNeeded
							weakThreadsNeeded = calcWeakThreads(ns, so, to)
							to.hackDifficulty = to.minDifficulty
							ram_needed = (weakThreadsNeeded * WKRAM) + (growThreadsNeeded * GR3RAM)
							total_threads_avail = threadCount(ns, server, ram_needed)
							if (growThreadsNeeded >= 1 && weakThreadsNeeded >= 1 && total_threads_avail > 0) {
								let batID = performance.now()
								ns.exec("bin.wk.js", server, weakThreadsNeeded, target, batID)
								ns.exec("bin.gr3.js", server, growThreadsNeeded, target, growDelay, batID)
								await ns.sleep(100)
								to.moneyAvailable = Math.min(to.moneyMax, to.moneyAvailable * ns.formulas.hacking.growPercent(to, growThreadsNeeded, player, so.cpuCores))
							}
						}
					}
				} else {
					openPorts(ns, server)
				}
			}
			await ns.sleep(0)
		}
		let player = ns.getPlayer()
		let curTarget = target
		while (curTarget == target) {
			for (let server of servers) {
				if (player.skills.hacking != ns.getHackingLevel()) {
					target = findTarget(ns, servers, curTarget)
					if (curTarget != target) {
						break;
					}
				}
				if (ns.hasRootAccess(server)) {
					while (ns.getServerSecurityLevel(target) > to.minDifficulty||inPayWindow(endTimes)) {
						await ns.sleep(1)
					}
					let so = ns.getServer(server)
					let hackThreads = calcHackThreads(ns, to, player)
					to.hackDifficulty += 0.002 * hackThreads
					to.moneyAvailable -= (to.moneyAvailable * hackThreads * ns.formulas.hacking.hackPercent(to, player))
					let weakThreads1 = calcWeakThreads(ns, so, to)
					to.hackDifficulty = to.minDifficulty
					let growThreads = calcGrowThreads(ns, so, to, player)
					to.moneyAvailable = to.moneyMax
					to.hackDifficulty += 0.004 * growThreads // returning zero
					let weakThreads2 = calcWeakThreads(ns, so, to)
					to.hackDifficulty = to.minDifficulty
					let ram_needed = (hackThreads * HK5RAM) + (growThreads * GR5RAM) + (weakThreads1 * WK5RAM) + (weakThreads2 * WK5RAM)
					let available_batch_threads = threadCount(ns, server, ram_needed);
					let grow_time = ns.formulas.hacking.growTime(to, player)
					let hack_time = ns.formulas.hacking.hackTime(to, player)
					let weak_time = ns.formulas.hacking.weakenTime(to, player)
					let hackDelay = weak_time - hack_time - 50;
					let weak1Delay = 0;
					let weak2Delay = 100;
					let growDelay = weak_time - grow_time + 50;

					if (available_batch_threads >= 1) {
						while (available_batch_threads > 0) {
							while (ns.getServerSecurityLevel(target) > to.minDifficulty||inPayWindow(endTimes)) {
								await ns.sleep(1)
							}
							let batID = performance.now()
							let startTime = batID + 3000
							let endTime = startTime + weak_time + 25
					
							if (checkEndTimes(endTimes, endTime) && player.skills.hacking == ns.getHackingLevel()) {
								endTimes.push(endTime)
					
								let hackPID = ns.exec("bin.hk5.js", server, hackThreads, target, batID, endTime - 75, hackDelay, startTime)
								let growPID = ns.exec("bin.gr5.js", server, growThreads, target, batID, endTime + 25, growDelay, startTime, hackPID)
								let weakPID = ns.exec("bin.wk5.js", server, weakThreads1, target, batID, endTime - 25, weak1Delay, startTime, hackPID, growPID)
								ns.exec("bin.wk5.js", server, weakThreads2, target, batID, endTime + 75, weak2Delay, startTime, hackPID, growPID, weakPID)
								available_batch_threads -= 1
								await ns.sleep(200)
							} else {
							
						
								await ns.sleep(200)
								break;
							}

						}
					} else {
						let free_ram = getFreeRam(ns, server)
						if (free_ram > 0) {
							let reduceRatio = ram_needed / free_ram
							//hackThreads = Math.floor(hackThreads / reduceRatio)
							hackThreads = findReducedHackThreads(ns, hackThreads, reduceRatio, free_ram, so, to, player)
							to.hackDifficulty += 0.002 * hackThreads
							to.moneyAvailable -= (to.moneyAvailable * hackThreads * ns.formulas.hacking.hackPercent(to, player))
							weakThreads1 = calcWeakThreads(ns, so, to)
							to.hackDifficulty = to.minDifficulty
							growThreads = calcGrowThreads(ns, so, to, player)
							to.moneyAvailable = to.moneyMax
							to.hackDifficulty += 0.004 * growThreads
							weakThreads2 = calcWeakThreads(ns, so, to)
							to.hackDifficulty = to.minDifficulty
							ram_needed = (hackThreads * HK5RAM) + (growThreads * GR5RAM) + (weakThreads1 * WK5RAM) + (weakThreads2 * WK5RAM)
							available_batch_threads = threadCount(ns, server, ram_needed);
							if (hackThreads >= 1 && growThreads >= 1 && weakThreads1 >= 1 && weakThreads2 >= 1 && available_batch_threads > 0) {
								while (ns.getServerSecurityLevel(target) > to.minDifficulty||inPayWindow(endTimes)) {
									await ns.sleep(1)
								}
								let batID = performance.now()
								let startTime = batID + 3000
								let endTime = startTime + weak_time + 25
							
								if (checkEndTimes(endTimes, endTime) && player.skills.hacking == ns.getHackingLevel()) {
									endTimes.push(endTime)
								
							
									let hackPID = ns.exec("bin.hk5.js", server, hackThreads, target, batID, endTime - 75, hackDelay, startTime)
									let growPID = ns.exec("bin.gr5.js", server, growThreads, target, batID, endTime + 25, growDelay, startTime, hackPID)
									let weakPID = ns.exec("bin.wk5.js", server, weakThreads1, target, batID, endTime - 25, weak1Delay, startTime, hackPID, growPID)
									ns.exec("bin.wk5.js", server, weakThreads2, target, batID, endTime + 75, weak2Delay, startTime, hackPID, growPID, weakPID)
									await ns.sleep(200)
								} else {
									
								
									 await ns.sleep(200) }
							}
						}
					}

				} else {
					openPorts(ns, server)
				}
				//clear endtimes
				let count = 0
				for (let time of endTimes) {
					if (time + 200 < performance.now()) {
						count++
					}
				}
				if (count > 0) {
					for (let i = 0; i < count; i++) {
						endTimes.shift()
					}
				}
			}
			await ns.sleep(10)
		}

		await ns.sleep(10)
	}
}