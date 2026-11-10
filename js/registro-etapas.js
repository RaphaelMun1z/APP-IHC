(() => {
	const form = document.querySelector(".registro-form");
	if (!form) return;

	const steps = [...form.querySelectorAll("[data-registro-step]")];
	const progress = [...form.querySelectorAll(".registro-progress li")];
	const back = form.querySelector("[data-step-back]");
	const next = form.querySelector("[data-step-next]");
	const save = form.querySelector("[data-step-save]");
	let current = 0;

	function showStep(index) {
		current = index;
		steps.forEach((step, stepIndex) => {
			step.hidden = stepIndex !== current;
		});
		progress.forEach((item, stepIndex) => {
			if (stepIndex === current) item.setAttribute("aria-current", "step");
			else item.removeAttribute("aria-current");
		});
		back.disabled = current === 0;
		next.hidden = current === steps.length - 1;
		save.hidden = current !== steps.length - 1;
	}

	next.addEventListener("click", () => showStep(Math.min(current + 1, steps.length - 1)));
	back.addEventListener("click", () => showStep(Math.max(current - 1, 0)));
	form.addEventListener("submit", (event) => event.preventDefault());
	showStep(0);
})();
