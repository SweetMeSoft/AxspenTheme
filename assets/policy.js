/**
 * AXSPEN - Policy Pages Design Enhancer
 * Only applies non-destructive styling hooks and clean DOM classes to /policies/*
 * Strictly preserves 100% of original text content.
 */
document.addEventListener('DOMContentLoaded', function () {
	const rte = document.querySelector('.shopify-policy__body .rte');
	if (!rte) return;

	// 1. Hide empty nodes or stray non-breaking space nodes
	rte.querySelectorAll('p, li, span, h4').forEach(function (el) {
		const rawText = el.textContent.replace(/\u00a0/g, ' ').trim();
		const hasOnlyEmptyChildren = el.children.length > 0 && Array.from(el.children).every(c => c.tagName === 'IMG' && (!c.src || c.src === ''));
		if ((rawText === '' && el.children.length === 0) || (rawText === '' && hasOnlyEmptyChildren)) {
			el.classList.add('policy-is-empty');
		}
	});

	// 2. Continuous numbering for consecutive/sibling <ol> lists (e.g. Terms of Service, Privacy Policy)
	let sectionCounter = 1;
	const olLists = rte.querySelectorAll('ol');
	olLists.forEach(function (ol) {
		const li = ol.querySelector('li');
		if (li) {
			li.setAttribute('data-step', String(sectionCounter).padStart(2, '0'));
			sectionCounter++;
		}
	});

	// 3. Highlight major section titles (e.g. "POLÍTICAS DE CAMBIO", "POLÍTICAS DE GARANTÍA", etc.)
	rte.querySelectorAll('p').forEach(function (p) {
		const text = p.textContent.replace(/\u00a0/g, ' ').trim();
		if (!text) return;

		// Headings with POLÍTICAS, PROCESO, etc.
		if (/^POL[IÍ]TICAS?\s+DE/i.test(text) || /^PROCESO\s+DE/i.test(text) || text === 'Términos del Contrato') {
			p.classList.add('policy-section-heading');
		}

		// Shipping policy bullet points with label prefixes (e.g. "Días de despacho:", "Tiempos de entrega:", etc.)
		if (/^(Procesamiento del pedido|Días de despacho|Pedidos en festivos|Tiempos de entrega|Bogotá|Resto del país|Transportadoras|Dirección de entrega|Intento fallido de entrega)\s*:/i.test(text)) {
			p.classList.add('policy-shipping-item');
			if (text.startsWith('Bogotá:') || text.startsWith('Resto del país:')) {
				p.classList.add('policy-shipping-subitem');
			}
		}
	});

	// 4. Contact Information Page Enhancement (3-column responsive card layout)
	const currentPath = window.location.pathname;
	if (currentPath.includes('contact-information')) {
		const container = document.querySelector('.shopify-policy__container');
		if (container) container.classList.add('is-contact-policy');

		const paragraphs = Array.from(rte.querySelectorAll('p')).filter(p => !p.classList.contains('policy-is-empty'));
		const cardItems = [];

		paragraphs.forEach(function (p) {
			const text = p.textContent.replace(/\u00a0/g, ' ').trim();
			if (/Cómo contactarnos/i.test(text)) {
				p.classList.add('contact-lead');
			} else if (/Axspen fashion/i.test(text)) {
				p.classList.add('contact-company');
			} else if (/Calle|sede/i.test(text)) {
				p.classList.add('contact-card-item', 'contact-item-address');
				cardItems.push(p);
			} else if (/Mail:/i.test(text) || p.querySelector('a[href^="mailto:"]')) {
				p.classList.add('contact-card-item', 'contact-item-email');
				cardItems.push(p);
			} else if (/Teléfono:/i.test(text) || /304\s*635\s*1159/.test(text)) {
				p.classList.add('contact-card-item', 'contact-item-phone');
				cardItems.push(p);
			}
		});

		// Group the 3 contact cards into a responsive grid that spans the full card width
		if (cardItems.length > 0 && !rte.querySelector('.contact-cards-grid')) {
			const grid = document.createElement('div');
			grid.className = 'contact-cards-grid';
			cardItems[0].parentNode.insertBefore(grid, cardItems[0]);
			cardItems.forEach(item => grid.appendChild(item));
		}
	}

	// 5. Privacy Policy intro callout card
	if (currentPath.includes('privacy-policy')) {
		const h4 = rte.querySelector('h4');
		if (h4) {
			h4.classList.add('policy-legal-notice-card');
		}
	}
});
