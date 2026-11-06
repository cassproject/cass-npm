const EcArray = require("../../com/eduworks/ec/array/EcArray");
const EcRepository = require("../cassproject/ebac/repository/EcRepository");

module.exports = class EcQuestion extends schema.Question {
	static MULTIPLE_CHOICE = "Multiple Choice";
	static MULTIPLE_SELECT = "Multiple Select";
	static SHORT_ANSWER = "Short Answer";
	static FILL_IN_THE_BLANK = "Fill in the Blank";
	static ESSAY_OR_SHORT_ANSWER = "Essay or Short Answer";
	static HAND_GRADED_ESSAY = "Hand-graded Essay";
	/**
	 *  Searches a repository for questions that match the search query
	 *
	 *  @param {EcRepository}          repo Repository to search using the query
	 *  @param {String}                query Query string to pass to the search web service
	 *  @param {Callback1<Array<Quiz>> success Callback triggered after
	 *                                 completing the search, returns the results
	 *  @param {Callback1<String>}     failure Callback triggered if error searching
	 *  @param {Object}                paramObj Parameter object for search
	 *  @memberOf EcQuestion
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcQuestion(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Heuristic method of determining how this question should be asked.
	 *
	 *  @return
	 */
	getQuestionType(eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		let acceptedAnswers = this.acceptedAnswers();
		if (acceptedAnswers == null) {
			if (this.canEdit(eim.ids[0].ppk.toPk())) {
				return EcQuestion.HAND_GRADED_ESSAY;
			} else {
				return EcQuestion.ESSAY_OR_SHORT_ANSWER;
			}
		}
		let m = acceptedAnswers.length;
		if (m == 0) {
			return EcQuestion.HAND_GRADED_ESSAY;
		}
		if (this.suggestedAnswer == null) {
			if (this.text != null && this.text.includes("__")) {
				return EcQuestion.FILL_IN_THE_BLANK;
			}
			return EcQuestion.SHORT_ANSWER;
		}
		let l = this.suggestedAnswer.length;
		if (l == 0) {
			if (this.text != null && this.text.includes("__")) {
				return EcQuestion.FILL_IN_THE_BLANK;
			}
			return EcQuestion.SHORT_ANSWER;
		}
		if (m > 1) {
			return EcQuestion.MULTIPLE_SELECT;
		}
		if (l > 0) {
			return EcQuestion.MULTIPLE_CHOICE;
		}
		return "Not sure.";
	}
	cementAnswerId(id) {
		if (this.acceptedAnswer != null) {
			if (!EcArray.isArray(this.acceptedAnswer)) {
				throw new TypeError("Accepted Answer is not Array");
			}
			let ary = this.acceptedAnswer;
			for (let i = 0; i < ary.length; i++) {
				if (
					EcRemoteLinkedData.trimVersionFromUrl(ary[i]) ==
					EcRemoteLinkedData.trimVersionFromUrl(id)
				) {
					ary[i] = id;
				}
			}
		}
		if (this.suggestedAnswer != null) {
			if (!EcArray.isArray(this.suggestedAnswer)) {
				throw new TypeError("Suggested Answer is not Array");
			}
			let ary = this.suggestedAnswer;
			for (let i = 0; i < ary.length; i++) {
				if (
					EcRemoteLinkedData.trimVersionFromUrl(ary[i]) ==
					EcRemoteLinkedData.trimVersionFromUrl(id)
				) {
					ary[i] = id;
				}
			}
		}
	}
	acceptedAnswers() {
		if (this.acceptedAnswer == null) {
			return [];
		}
		return this.acceptedAnswer;
	}
	suggestedAnswers() {
		if (this.suggestedAnswer == null) {
			return [];
		}
		return this.suggestedAnswer;
	}
	addAcceptedAnswer(answer) {
		if (this.acceptedAnswer == null) {
			this["acceptedAnswer"] = [];
		}
		if (!EcArray.isArray(this.acceptedAnswer)) {
			throw new TypeError("Accepted Answer is not Array");
		}
		let ary = this.acceptedAnswer;
		ary.push(answer.id);
	}
	addSuggestedAnswer(answer) {
		if (this.suggestedAnswer == null) {
			this["suggestedAnswer"] = [];
		}
		if (!EcArray.isArray(this.suggestedAnswer)) {
			throw new TypeError("Suggested Answer is not Array");
		}
		let ary = this.suggestedAnswer;
		ary.push(answer.id);
	}
	removeSuggestedAnswerById(id) {
		if (this.suggestedAnswer == null) {
			return;
		}
		if (!EcArray.isArray(this.suggestedAnswer)) {
			throw new TypeError("Suggested Answer is not Array");
		}
		let ary = this.suggestedAnswer;
		for (let i = 0; i < ary.length; i++) {
			if (
				EcRemoteLinkedData.trimVersionFromUrl(ary[i]) ==
				EcRemoteLinkedData.trimVersionFromUrl(id)
			) {
				ary.splice(i, 1);
			}
		}
	}
	removeAcceptedAnswerById(id) {
		if (this.acceptedAnswer == null) {
			return;
		}
		if (!EcArray.isArray(this.acceptedAnswer)) {
			throw new TypeError("Accepted Answer is not Array");
		}
		let ary = this.acceptedAnswer;
		for (let i = 0; i < ary.length; i++) {
			if (
				EcRemoteLinkedData.trimVersionFromUrl(ary[i]) ==
				EcRemoteLinkedData.trimVersionFromUrl(id)
			) {
				ary.splice(i, 1);
			}
		}
	}
};
