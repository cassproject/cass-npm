module.exports = class EcAsyncTaskWorker {
	constructor() {
		this.assignedList = [];
		this.intervalHandler = setInterval(() => {
			this.run();
		}, this.checkWorkInterval);
	}
	checkWorkInterval = 100;
	intervalHandler = null;
	taskHandler = null;
	currentTask = null;
	assignedList = null;
	getAssignedCount() {
		return this.assignedList.length;
	}
	assign(task) {
		if (
			this.currentTask == null ||
			this.currentTask == undefined ||
			this.currentTask.getIsComplete()
		) {
			this.currentTask = task;
		} else {
			this.assignedList.push(task);
		}
	}
	invoke() {
		if (!this.currentTask.getIsComplete()) {
			let args = this.currentTask.getArguments();
			if (args == null || args == undefined || args.length == 0) {
				this.currentTask.doTask();
			} else if (args.length == 1) {
				this.currentTask.doTask(args[0]);
			} else if (args.length == 2) {
				this.currentTask.doTask(args[0], args[1]);
			} else if (args.length == 3) {
				this.currentTask.doTask(args[0], args[1], args[2]);
			} else if (args.length == 4) {
				this.currentTask.doTask(args[0], args[1], args[2], args[3]);
			}
		}
	}
	run() {
		this.taskHandler = Task.immediate(() => {
			if (
				this.currentTask != undefined &&
				this.currentTask != null &&
				!this.currentTask.getIsStarted()
			) {
				this.invoke();
			}
			if (
				this.currentTask?.getIsComplete()
			) {
				this.currentTask = this.assignedList.shift();
			}
		});
	}
};
