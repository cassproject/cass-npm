const EcCrypto = require("../crypto/EcCrypto");

module.exports = class EcAsyncTaskManager {
	constructor(workerCount) {
		this.workerList = [];
		for (let i = 0; i < workerCount; i++) {
			this.workerList.push(new EcAsyncTaskWorker());
		}
		setInterval(() => {
			this.cleanupTasks();
		}, this.taskCleanupInterval);
	}

	taskMap = null;
	workerList = null;
	taskCleanupInterval = 2500;
	addTasks(tasks) {
		let retMap = {};
		if (tasks != undefined) {
			for (let task of tasks) {
				let key = this.addTask(task);
				retMap[key] = task;
			}
		}
		return retMap;
	}
	addTask(task) {
		if (this.taskMap == undefined || this.taskMap == null) {
			this.taskMap = {};
		}
		let key = "";
		while (
			key == "" ||
			this.taskMap[key] != undefined && this.taskMap[key] != null
		) {
			key = EcCrypto.generateUUID();
		}
		this.taskMap[key] = task;
		this.assignNewTask(task);
		this.cleanupTasks();
		return key;
	}
	cleanupTasks() {
		for (let key in this.taskMap) {
			let task = this.taskMap[key];
			if (task.getIsStarted()) {
				let timeoutSec = task.getTimeout();
				if (
					task.getStart().getTime() <
					Date.now() - timeoutSec * 1000
				) {
					task.setComplete();
				}
			}
			if (task.getIsComplete()) {
				delete this.taskMap[key];
			}
		}
	}
	assignNewTask(task) {
		let min = 10000;
		let theGuy = null;
		for (let worker of this.workerList) {
			if (worker.getAssignedCount() < min) {
				theGuy = worker;
				min = theGuy.getAssignedCount();
			}
		}
		if (theGuy != null) theGuy.assign(task);
	}
};
