/**
 * AXSPEN - Policy Pages Design Enhancer
 * Consistent editorial layout across all /policies/* matching Terms of Service:
 * - Clean white document card
 * - Signature numbered section headings (01, 02, 03...) with subtle 1px dividers
 * - Natural, legible reading text and lists (NO artificial card boxes around paragraphs)
 * Strictly preserves 100% of original text content.
 */
document.addEventListener('DOMContentLoaded', function () {
	const rte = document.querySelector('.shopify-policy__body .rte');
	if (!rte) return;

	const currentPath = window.location.pathname;

	// 1. Hide empty nodes or stray whitespace/non-breaking space nodes
	rte.querySelectorAll('p, span, h4').forEach(function (el) {
		const rawText = el.textContent.replace(/[\u00a0\s]/g, '').trim();
		const hasImages = el.querySelector('img[src]:not([src=""])');
		if (rawText === '' && !hasImages) {
			el.classList.add('policy-is-empty');
		}
	});

	// 2. TERMS OF SERVICE: Numbered section clauses
	if (currentPath.includes('terms-of-service')) {
		let sectionCounter = 1;
		const olLists = rte.querySelectorAll('ol');
		olLists.forEach(function (ol) {
			const lis = Array.from(ol.querySelectorAll('li')).filter(function (li) {
				return li.textContent.replace(/[\u00a0\s]/g, '').trim() !== '';
			});
			if (lis.length === 1) {
				const li = lis[0];
				ol.classList.add('policy-clause-ol');
				li.classList.add('policy-clause-heading');
				li.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
				sectionCounter++;
			}
		});

		rte.querySelectorAll('p').forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
			if (!text) return;
			if (text.toLowerCase() === 'términos y condiciones' || text.toLowerCase() === 'terminos y condiciones') {
				p.classList.add('policy-intro-heading');
			} else if (text === 'Términos del Contrato' || text.toLowerCase() === 'términos del contrato') {
				p.classList.add('policy-sub-intro-heading');
			}
		});
	}

	// 3. REFUND POLICY (Cambio y Garantía): Unified numbered section clauses
	if (currentPath.includes('refund-policy')) {
		let sectionCounter = 1;
		rte.querySelectorAll('p').forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
			if (!text) return;

			if (/^POL[IÍ]TICAS?\s+DE/i.test(text)) {
				p.classList.add('policy-clause-heading', 'policy-paragraph-heading');
				p.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
				sectionCounter++;
			} else if (text.toLowerCase().includes('proceso de cambio')) {
				p.classList.add('policy-sub-intro-heading');
			}
		});
	}

	// 4. SHIPPING POLICY: Unified numbered section clause + Natural text formatting (NO cards)
	if (currentPath.includes('shipping-policy')) {
		rte.querySelectorAll('p').forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
			if (!text) return;

			if (/^POL[IÍ]TICAS?\s+DE\s+ENV[IÍ]O/i.test(text)) {
				p.classList.add('policy-clause-heading', 'policy-paragraph-heading');
				p.setAttribute('data-step', '01');
			} else if (/^(Procesamiento del pedido|Días de despacho|Pedidos en festivos|Tiempos de entrega|Transportadoras|Dirección de entrega|Intento fallido de entrega)\s*:/i.test(text)) {
				p.classList.add('policy-label-paragraph');
				// Bold the label before ':' if not already bolded
				if (!p.querySelector('strong')) {
					const colonIdx = p.innerHTML.indexOf(':');
					if (colonIdx !== -1) {
						const label = p.innerHTML.substring(0, colonIdx + 1);
						const rest = p.innerHTML.substring(colonIdx + 1);
						p.innerHTML = '<strong>' + label + '</strong>' + rest;
					}
				}
			} else if (/^(Bogotá|Resto del país)\s*:/i.test(text)) {
				p.classList.add('policy-sub-label-paragraph');
				if (!p.querySelector('strong')) {
					const colonIdx = p.innerHTML.indexOf(':');
					if (colonIdx !== -1) {
						const label = p.innerHTML.substring(0, colonIdx + 1);
						const rest = p.innerHTML.substring(colonIdx + 1);
						p.innerHTML = '<strong>' + label + '</strong>' + rest;
					}
				}
			}
		});
	}

	// 5. PRIVACY POLICY: Unified numbered sections + Natural text layout (NO cards)
	if (currentPath.includes('privacy-policy')) {
		let sectionCounter = 1;
		rte.querySelectorAll('p').forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
			if (!text) return;

			if (text.toLowerCase() === 'política de privacidad' || text.toLowerCase() === 'politica de privacidad') {
				p.classList.add('policy-intro-heading');
			} else if (/^Sus datos personales/i.test(text)) {
				p.classList.add('policy-clause-heading', 'policy-paragraph-heading');
				p.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
				sectionCounter++;
			} else if (/^El Tratamiento de Datos/i.test(text)) {
				p.classList.add('policy-clause-heading', 'policy-paragraph-heading');
				p.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
				sectionCounter++;
			}
		});

		const olLists = rte.querySelectorAll('ol');
		if (olLists.length > 0) {
			const firstOl = olLists[0];
			firstOl.classList.add('policy-clause-ol');
			const firstLi = firstOl.querySelector('li');
			if (firstLi) {
				firstLi.classList.add('policy-clause-heading');
				firstLi.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
				sectionCounter++;
			}
		}
	}

	// 6. CONTACT INFORMATION: Natural editorial layout matching Terms of Service
	if (currentPath.includes('contact-information')) {
		rte.querySelectorAll('p').forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').trim();
			if (!text) return;

			if (/Cómo contactarnos/i.test(text)) {
				p.classList.add('policy-clause-heading', 'policy-paragraph-heading');
				p.setAttribute('data-step', '01');
			} else if (/Axspen fashion/i.test(text)) {
				p.classList.add('policy-sub-intro-heading');
			} else if (/Calle|sede|Mail:|Teléfono:/i.test(text) || p.querySelector('a[href^="mailto:"]')) {
				p.classList.add('policy-contact-detail');
			}
		});
	}
});
