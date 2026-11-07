"use strict";

(() => {
	const tabela = document.querySelector(".evaluation-table");
	const navbar = document.querySelector("body > nav");
	const regiao = document.querySelector("#tabela-rolagem, #tabela-presencas");
	if (!tabela || !navbar || !regiao || !tabela.tHead) return;

	const cabecalhoOriginal = tabela.tHead;
	const barraSelecao = document.getElementById("barra-selecao");
	const celulasOriginais = [...cabecalhoOriginal.querySelectorAll("th")];
	const alturaCabecalhoCompacto = 64;
	const iconesColunas = {
		"criterio-conhecimento-conteudo": '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
		"criterio-criatividade": '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
		"criterio-objetividade": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
		"criterio-concisao": '<path d="M4 6h16M4 10h12M4 14h8M4 18h5"/>',
		"criterio-participacao": '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/>',
		"criterio-escuta-ativa-foco": '<path d="M3 10a9 9 0 0 1 18 0c0 4-3 5-3 8a3 3 0 0 1-6 0"/><path d="M9 10a3 3 0 0 1 6 0c0 2-2 2-2 4"/>',
		"criterio-reatividade": '<path d="m13 2-3 9h7l-6 11 1-9H5l8-11Z"/>',
		"criterio-espirito-equipe": '<path d="m16 11 2 2a2 2 0 0 0 3-3l-4-4a4 4 0 0 0-5 0l-1 1a4 4 0 0 1-5 0"/><path d="m8 13-2 2a2 2 0 0 1-3-3l4-4a4 4 0 0 1 5 0l4 4a2 2 0 0 1-3 3l-2-2"/><path d="m10 15 2 2a2 2 0 0 0 3 0m-7-2 2 2a2 2 0 0 0 3 0"/>',
		"criterio-proatividade": '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2 2 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.9 12.9 0 0 1 22 3c0 2.72-.78 7.5-5 11a22 22 0 0 1-5 1Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0m1 7v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
		"criterio-capacidade-argumentacao": '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
	};
	const caixaFixa = document.createElement("div");
	caixaFixa.className = "page-table-header";
	caixaFixa.setAttribute("aria-hidden", "true");

	const tabelaFixa = tabela.cloneNode(false);
	tabelaFixa.removeAttribute("id");
	tabelaFixa.className = "evaluation-table border-separate border-spacing-0 text-left text-sm text-body";
	if (tabela.classList.contains("attendance-table")) tabelaFixa.classList.add("attendance-table");
	if (tabela.classList.contains("observation-table")) tabelaFixa.classList.add("observation-table");
	const cabecalhoFixo = cabecalhoOriginal.cloneNode(true);
	const gerarIcone = (celulaFixa, celulaOriginal, conteudo) => {
		const seletorCriterio = celulaFixa.querySelector("label.criterion-select");
		celulaFixa.textContent = "";
		celulaFixa.classList.add("compact-heading-cell");
		const rotulo = celulaOriginal.getAttribute("aria-label") || celulaOriginal.textContent.trim();
		const tooltipId = "tooltip-cabecalho-" + (celulaOriginal.id || (celulaOriginal.classList.contains("student-cell") ? "aluno" : "presenca"));
		celulaFixa.dataset.tooltipTarget = tooltipId;
		celulaFixa.dataset.tooltipPlacement = "bottom";
		celulaFixa.dataset.tooltipTrigger = "hover";
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("fill", "none");
		svg.setAttribute("stroke", "currentColor");
		svg.setAttribute("stroke-width", "1.8");
		svg.setAttribute("stroke-linecap", "round");
		svg.setAttribute("stroke-linejoin", "round");
		svg.setAttribute("aria-hidden", "true");
		svg.classList.add("h-5", "w-5");
		svg.innerHTML = conteudo;
		celulaFixa.append(svg);
		if (seletorCriterio) celulaFixa.append(seletorCriterio);
		const tooltip = document.createElement("div");
		tooltip.id = tooltipId;
		tooltip.setAttribute("role", "tooltip");
		tooltip.className = "tooltip invisible absolute z-50 rounded-base border border-default bg-neutral-primary-strong px-3 py-2 text-xs font-medium text-heading opacity-0";
		tooltip.append(document.createTextNode(rotulo));
		const seta = document.createElement("div");
		seta.className = "tooltip-arrow";
		seta.setAttribute("data-popper-arrow", "");
		tooltip.append(seta);
		document.body.append(tooltip);
	};
	const celulasFixas = [...cabecalhoFixo.querySelectorAll("th")];
	for (let indice = 0; indice < celulasFixas.length; indice++) {
		const celulaFixa = celulasFixas[indice];
		const celulaOriginal = celulasOriginais[indice];
		if (celulaOriginal.classList.contains("student-cell")) {
			gerarIcone(celulaFixa, celulaOriginal, '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>');
		} else if (celulaOriginal.classList.contains("criterion-heading")) {
			const conteudo = iconesColunas[celulaOriginal.id];
			if (conteudo) gerarIcone(celulaFixa, celulaOriginal, conteudo);
		} else if (celulaOriginal.classList.contains("attendance-heading")) {
			gerarIcone(celulaFixa, celulaOriginal, '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18m-13 5 2 2 4-4"/>');
		}
	}
	cabecalhoFixo.querySelectorAll("[id]").forEach((elemento) => elemento.removeAttribute("id"));
	tabelaFixa.append(cabecalhoFixo);
	caixaFixa.append(tabelaFixa);
	document.body.append(caixaFixa);

	for (const controle of cabecalhoFixo.querySelectorAll("input, button, a")) {
		controle.tabIndex = -1;
	}
	const selecionarTodosOriginal = cabecalhoOriginal.querySelector(".selection-cell input[type=\"checkbox\"]");
	const selecionarTodosFixo = cabecalhoFixo.querySelector(".selection-cell input[type=\"checkbox\"]");
	if (selecionarTodosOriginal && selecionarTodosFixo) {
		selecionarTodosFixo.addEventListener("change", () => {
			selecionarTodosOriginal.checked = selecionarTodosFixo.checked;
			selecionarTodosOriginal.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}
	for (const checkboxFixo of cabecalhoFixo.querySelectorAll("[data-criterion-select]")) {
		checkboxFixo.addEventListener("change", () => {
			const checkboxOriginal = cabecalhoOriginal.querySelector(`[data-criterion-select="${checkboxFixo.dataset.criterionSelect}"]`);
			if (!checkboxOriginal) return;
			checkboxOriginal.checked = checkboxFixo.checked;
			checkboxOriginal.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}
	function alternarCriterioFixo(celula) {
		const checkbox = celula.querySelector("[data-criterion-select]");
		if (!checkbox) return;
		checkbox.checked = !checkbox.checked;
		checkbox.dispatchEvent(new Event("change", { bubbles: true }));
	}
	cabecalhoFixo.addEventListener("click", (event) => {
		const celula = event.target.closest("th.criterion-heading");
		if (!celula || event.target.closest("input, label")) return;
		alternarCriterioFixo(celula);
	});
	cabecalhoFixo.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		const celula = event.target.closest("th.criterion-heading");
		if (!celula || event.target !== celula) return;
		event.preventDefault();
		alternarCriterioFixo(celula);
	});

	function atualizarEstadoSelecao() {
		if (selecionarTodosOriginal && selecionarTodosFixo) {
			selecionarTodosFixo.checked = selecionarTodosOriginal.checked;
			selecionarTodosFixo.indeterminate = selecionarTodosOriginal.indeterminate;
		}
		for (const celulaOriginal of celulasOriginais.filter((celula) => celula.classList.contains("criterion-heading"))) {
			const celulaFixa = celulasFixas[celulasOriginais.indexOf(celulaOriginal)];
			const checkboxOriginal = celulaOriginal.querySelector("[data-criterion-select]");
			const checkboxFixo = celulaFixa.querySelector("[data-criterion-select]");
			if (!checkboxOriginal || !checkboxFixo) continue;
			checkboxFixo.checked = checkboxOriginal.checked;
			celulaFixa.dataset.criterionSelected = celulaOriginal.dataset.criterionSelected;
			celulaFixa.setAttribute("aria-pressed", celulaOriginal.getAttribute("aria-pressed"));
		}
	}

	function medirColunas() {
		let larguraTotal = 0;
		for (let indice = 0; indice < celulasOriginais.length; indice++) {
			const largura = celulasOriginais[indice].getBoundingClientRect().width;
			celulasFixas[indice].style.width = largura + "px";
			celulasFixas[indice].style.minWidth = largura + "px";
			larguraTotal += largura;
		}
		tabelaFixa.style.width = larguraTotal + "px";
		tabelaFixa.style.minWidth = larguraTotal + "px";
	}

	let quadroPendente = false;
	function posicionarCabecalho() {
		quadroPendente = false;
		const barraInferior = navbar.getBoundingClientRect().bottom;
		const barraSelecaoRect = barraSelecao ? barraSelecao.getBoundingClientRect() : null;
		const barraEstaFixa = barraSelecaoRect && barraSelecaoRect.top <= barraInferior + 1 && barraSelecaoRect.bottom > barraInferior;
		const topoCabecalho = barraInferior + (barraEstaFixa ? barraSelecaoRect.height : 0);
		const regiaoRect = regiao.getBoundingClientRect();
		const cabecalhoRect = cabecalhoOriginal.getBoundingClientRect();
		const tabelaRect = tabela.getBoundingClientRect();
		const mostrar = cabecalhoRect.top < topoCabecalho && tabelaRect.bottom > topoCabecalho + alturaCabecalhoCompacto;

		if (!mostrar) {
			caixaFixa.style.display = "none";
			return;
		}

		caixaFixa.style.display = "block";
		caixaFixa.style.top = topoCabecalho + "px";
		caixaFixa.style.left = regiaoRect.left + "px";
		caixaFixa.style.width = regiao.clientWidth + "px";
		caixaFixa.style.height = alturaCabecalhoCompacto + "px";
		tabelaFixa.style.transform = "translateX(-" + regiao.scrollLeft + "px)";
		for (const celula of celulasFixas) {
			celula.style.transform = celula.classList.contains("selection-cell") || celula.classList.contains("student-cell")
				? "translateX(" + regiao.scrollLeft + "px)"
				: "";
		}
		atualizarEstadoSelecao();
	}

	function agendarAtualizacao() {
		if (quadroPendente) return;
		quadroPendente = true;
		requestAnimationFrame(posicionarCabecalho);
	}

	function aoRedimensionar() {
		medirColunas();
		agendarAtualizacao();
	}

	window.addEventListener("scroll", agendarAtualizacao, { passive: true });
	window.addEventListener("resize", aoRedimensionar);
	regiao.addEventListener("scroll", agendarAtualizacao, { passive: true });
	document.addEventListener("change", atualizarEstadoSelecao);
	document.addEventListener("avaliacao:selecao-alterada", atualizarEstadoSelecao);
	document.addEventListener("avaliacao:criterios-selecionados-alterada", atualizarEstadoSelecao);
	document.addEventListener("presencas:selecao-alterada", atualizarEstadoSelecao);
	document.addEventListener("avaliacao:hover-coluna-alterada", (event) => {
		cabecalhoFixo.dataset.hoverActive = String(event.detail.criterioId !== null);
		for (let indice = 0; indice < celulasOriginais.length; indice++) {
			const original = celulasOriginais[indice];
			if (!original.classList.contains("criterion-heading")) continue;
			celulasFixas[indice].dataset.columnHovered = String(original.id === `criterio-${event.detail.criterioId}` && event.detail.criterioId !== null);
		}
	});
	document.addEventListener("presencas:semana-alterada", () => {
		for (let indice = 0; indice < celulasOriginais.length; indice++) {
			const original = celulasOriginais[indice];
			if (!original.classList.contains("attendance-day-heading")) continue;
			const fixa = celulasFixas[indice];
			fixa.textContent = original.textContent;
			fixa.hidden = original.hidden;
			fixa.title = original.title;
			fixa.setAttribute("aria-label", original.getAttribute("aria-label"));
			if (original.dataset.date) fixa.dataset.date = original.dataset.date;
			else delete fixa.dataset.date;
			if (original.dataset.today) fixa.dataset.today = "true";
			else delete fixa.dataset.today;
			fixa.dataset.activeColumn = original.dataset.activeColumn;
			if (original.dataset.activeDate) fixa.dataset.activeDate = "true";
			else delete fixa.dataset.activeDate;
		}
		medirColunas();
		agendarAtualizacao();
	});
	document.addEventListener("presencas:celula-hover-alterada", (event) => {
		for (let indice = 0; indice < celulasOriginais.length; indice++) {
			const original = celulasOriginais[indice];
			if (!original.classList.contains("attendance-day-heading")) continue;
			celulasFixas[indice].dataset.hoveredColumn = String(Boolean(event.detail.data && original.dataset.date === event.detail.data));
		}
	});

	if ("ResizeObserver" in window) {
		const observador = new ResizeObserver(aoRedimensionar);
		observador.observe(tabela);
		observador.observe(regiao);
		observador.observe(navbar);
	}

	medirColunas();
	agendarAtualizacao();
})();
