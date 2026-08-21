/**
 * Theme js
 *
 * @package Dev
 */

'use strict';

// Set scrollbar width.
function btyScrollBar( doc = document ) {
	let domId = document.getElementById( 'dynamic-variables-theme-css' );
	if ( ! domId ) {
		return;
	}

	let scrollbarWidth = window.innerWidth - document.body.clientWidth,
		megaMenu       = doc.querySelector( '.header-nav .mega-menu-wrap' ),
		currentWidth   = window.innerWidth - document.documentElement.clientWidth;

	// Custom event.
	const scrollbarEvent = new Event( 'scrollbar-width' );

	const observer = new ResizeObserver(() => {
		const newWidth = window.innerWidth - document.documentElement.clientWidth;

		if ( newWidth !== currentWidth ) {
			scrollbarEvent.detail = {
				previous: currentWidth,
				current: newWidth
			};

			currentWidth = newWidth;

			window.dispatchEvent( scrollbarEvent );
		}
	});

	observer.observe( document.documentElement );

	// First load.
	const updateContainerContent = function() {
		const initialWidth = window.innerWidth - document.documentElement.clientWidth;
		domId.innerHTML = ':root{--scrollbar-width:' + initialWidth + 'px;--container-content:' + ( megaMenu ? megaMenu.offsetWidth : 0 ) + 'px}';
	}

	updateContainerContent();
	window.addEventListener( 'resize', updateContainerContent );

	// Start listening for changes.
	window.addEventListener(
		'scrollbar-width',
		function( e ) {
			let newMegaMenu = doc.querySelector( '.header-nav .mega-menu-wrap .container .mega-menu' );
			domId.innerHTML = ':root{--scrollbar-width:' + e.detail.current + 'px;--container-content:' + ( newMegaMenu ? newMegaMenu.offsetWidth : 0 ) + 'px}';
		}
	);

	return observer;
}

// Siblings.
function btySiblings( el, filter ) {
	// create an empty array.
	let siblings = [];

	// if no parent, return empty list.
	if ( ! el || ! el.parentNode ) {
		return siblings;
	}

	// first child of the parent node.
	let sibling = el.parentNode.firstElementChild;

	// loop through next siblings until `null`.
	do {
		// push sibling to array.
		if ( sibling != el && ( ! filter || filter( sibling )) ) {
			siblings.push( sibling );
		}
	} while ( sibling = sibling.nextElementSibling );

	return siblings;
}

// Slide up.
function btySlideUp( target, duration = 200 ) {
	target.style.transitionProperty = 'height, margin, padding';
	target.style.transitionDuration = duration + 'ms';
	target.style.height             = target.offsetHeight + 'px';
	target.offsetHeight;
	target.style.overflow      = 'hidden';
	target.style.height        = 0;
	target.style.paddingTop    = 0;
	target.style.paddingBottom = 0;
	target.style.marginTop     = 0;
	target.style.marginBottom  = 0;

	window.setTimeout(
		function() {
			target.style.display = 'none';
			target.style.removeProperty( 'height' );
			target.style.removeProperty( 'padding-top' );
			target.style.removeProperty( 'padding-bottom' );
			target.style.removeProperty( 'margin-top' );
			target.style.removeProperty( 'margin-bottom' );
			target.style.removeProperty( 'overflow' );
			target.style.removeProperty( 'transition-duration' );
			target.style.removeProperty( 'transition-property' );
		},
		duration
	);
}

// Slide down.
function btySlideDown( target, duration = 200 ) {
	target.style.removeProperty( 'display' );
	let display = window.getComputedStyle( target ).display;

	if ( 'none' === display ) {
		display = 'block';
	}

	target.style.display = display;

	let height = target.offsetHeight;

	target.style.overflow      = 'hidden';
	target.style.height        = 0;
	target.style.paddingTop    = 0;
	target.style.paddingBottom = 0;
	target.style.marginTop     = 0;
	target.style.marginBottom  = 0;
	target.offsetHeight;
	target.style.transitionProperty = "height, margin, padding";
	target.style.transitionDuration = duration + 'ms';
	target.style.height             = height + 'px';

	target.style.removeProperty( 'padding-top' );
	target.style.removeProperty( 'padding-bottom' );
	target.style.removeProperty( 'margin-top' );
	target.style.removeProperty( 'margin-bottom' );

	window.setTimeout(
		function() {
			target.style.removeProperty( 'height' );
			target.style.removeProperty( 'overflow' );
			target.style.removeProperty( 'transition-duration' );
			target.style.removeProperty( 'transition-property' );
		},
		duration
	);
}

// Toggle dropdown.
function btyToggleDropdown( doc = document ) {
	let toggle = doc.querySelectorAll( '.toggle-dropdown .dropdown-summary' );
	if ( ! toggle.length ) {
		return;
	}

	toggle.forEach(
		function( el ) {
			let parent      = el.parentNode,
				title       = el.querySelector( '.summary-info' ),
				mobileTitle = el.parentNode.querySelector( '.dropdown-content-title' );

			document.addEventListener(
				'click',
				function( e ) {
					let target = e.target;

					if ( target === el || target.closest( '.dropdown-summary' )) {
						return;
					}

					if ( target.classList.contains( 'dropdown-item' )) {
						if ( title ) {
							title.innerText = target.getAttribute( 'data-value' );
						}

						if ( mobileTitle ) {
							mobileTitle.innerText = target.getAttribute( 'data-value' );
						}
					}

					parent.removeAttribute( 'open' );
				}
			);

			el.onclick = function( e ) {
				let aria = el.getAttribute( 'aria-expanded' );

				if ( 'string' === typeof( parent.getAttribute( 'open' )) ) {
					parent.removeAttribute( 'open' );

					if ( aria ) {
						el.setAttribute( 'aria-expanded', 'false' );
					}
				} else {
					let sibling = parent.parentNode.querySelector( '.toggle-dropdown[open]' );
					if ( sibling ) {
						sibling.removeAttribute( 'open' );

						let sibAria = sibling.querySelector( '.dropdown-summary[aria-expanded]' );
						if ( sibAria ) {
							sibAria.setAttribute( 'aria-expanded', 'false' );
						}
					}

					parent.setAttribute( 'open', '' );

					if ( aria ) {
						el.setAttribute( 'aria-expanded', 'true' );
					}
				}
			}
		}
	);
}

// Update aria expanded for summary <details> tag only.
function btyToggleDetails( doc = document ) {
	let details = doc.querySelectorAll( 'details' );
	if ( ! details.length ) {
		return;
	}

	details.forEach(
		function( el ) {
			let summary = el.querySelector( 'summary' );
			if ( el.classList.contains( 'product-accordion' ) || el.classList.contains( 'collapsible-item' ) || el.classList.contains( 'order-note' ) || ! summary ) {
				return;
			}

			document.addEventListener(
				'click',
				function( e ) {
					let target = e.target;

					if ( target === el || el.contains( target ) || target.closest( '.toggle-dropdown' )) {
						return;
					}

					let tmpAria = doc.querySelector( '[open] [aria-expanded]' );
					if ( tmpAria ) {
						tmpAria.setAttribute( 'aria-expanded', 'false' );
					}
				}
			);

			el.onclick = function ( e ) {
				let aria = summary.getAttribute( 'aria-expanded' );
				if ( ! aria ) {
					return;
				}

				if ( 'string' === typeof( el.getAttribute( 'open' )) ) {
					if ( aria ) {
						summary.setAttribute( 'aria-expanded', 'false' );
					}
				} else {
					let sibling = el.parentNode.querySelector( '[open]' );
					if ( sibling ) {
						let sibAria = sibling.querySelector( '[open] [aria-expanded]' );
						if ( sibAria ) {
							sibAria.setAttribute( 'aria-expanded', 'false' );
						}
					}

					if ( aria ) {
						summary.setAttribute( 'aria-expanded', 'true' );
					}
				}
			}
		}
	);
}

// Json parse.
function btyJsonParse( string ) {
	try {
		return JSON.parse( string.trim());
	} catch ( e ) {
		return false;
	}
}

// Remove item in array.
function btyRemoveArrayItem( arr = [], item ) {
	if ( ! arr.length || ! item ) {
		return [];
	}

	return arr.filter(
		function( el ) {
			return el != item;
		}
	);
}

// Set delay time when user typing.
const btySearchDelay = function ( timer = 0 ) {
	return function( callback, ms ) {
		clearTimeout( timer );
		timer = setTimeout( callback, ms );
	};
}();

// Get image src.
function btyGetImageSrc( img ) {
	// Create canvas.
	let canvas  = document.createElement( 'canvas' ),
		context = canvas.getContext( '2d' );

	// Set width and height.
	canvas.width  = img.width;
	canvas.height = img.height;

	// Draw the image.
	context.drawImage( img, 0, 0 );

	return canvas.toDataURL( 'image/jpeg', 1.0 );
}

// Scrolling detect direction.
function btyScrollingDetect() {
	let body = document.body;

	if ( window.oldScroll > window.scrollY ) {
		body.classList.add( 'direction-up' );
		body.classList.remove( 'direction-down' );
	} else {
		body.classList.remove( 'direction-up' );
		body.classList.add( 'direction-down' );
	}

	// Reset state.
	window.oldScroll = window.scrollY;
}

// Set loading animation for image.
function btyImageLoad( image, image_src, image_key, ele_loading ) {
	let newImage = new Image();

	newImage.crossOrigin = 'anonymous';

	// Check local storage first.
	if ( sessionStorage.getItem( image_key )) {
		image.src = sessionStorage.getItem( image_key );
		return;
	}

	// Add loading animation.
	image.parentNode.classList.add( 'loading' );

	// Handle.
	newImage.onload = function() {
		ele_loading.classList.remove( 'loading' );
		let renderImage = btyGetImageSrc( newImage );

		// Set final image src.
		image.src = renderImage;

		// Save image to local storage.
		if ( image_key ) {
			sessionStorage.setItem( image_key, renderImage );
		}
	}

	newImage.onerror = function() {
		ele_loading.classList.remove( 'loading' );
	}

	// Set image src for 'newImage.onload' function handle.
	newImage.src = image_src;
}

// Get form data.
function btySerializeForm( form, type = 'string' ) {
	let obj      = {},
		formData = new FormData( form );

	for ( let key of formData.keys()) {
		obj[ key ] = formData.get( key );
	}

	return 'string' === type ? JSON.stringify( obj ) : obj;
};

// Get price format.
function btyFormatPrice( money = 0, format = false ) {
	if ( 'string' === typeof( money )) {
		money = money.replace( '.', '' );
	}

	if ( false === format ) {
		format = btyGlobals.money_format;
	}

	let value            = '',
		placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;

	function defaultOption( opt, def ) {
		return 'undefined' === typeof( opt ) ? def : opt;
	}

	function formatWithDelimiters( number, precision, thousands, decimal ) {
		precision = defaultOption( precision, 2 );
		thousands = defaultOption( thousands, ',' );
		decimal   = defaultOption( decimal, '.' );

		if ( isNaN( number ) || number == null ) {
			return 0;
		}

		number = ( number / 100.0 ).toFixed( precision );

		let parts   = number.split( '.' ),
			dollars = parts[0].replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands ),
			money   = parts[1] ? ( decimal + parts[1] ) : '';

		return dollars + money;
	}

	switch ( format.match( placeholderRegex )[1] ) {
		case 'amount':
			value = formatWithDelimiters( money, 2 );
			break;
		case 'amount_no_decimals':
			value = formatWithDelimiters( money, 0 );
			break;
		case 'amount_with_comma_separator':
			value = formatWithDelimiters( money, 2, '.', ',' );
			break;
		case 'amount_no_decimals_with_comma_separator':
			value = formatWithDelimiters( money, 0, '.', ',' );
			break;
		case 'amount_with_space_separator':
			value = formatWithDelimiters( money, 2, ' ', ',' );
			break;
		case 'amount_with_period_and_space_separator':
			value = formatWithDelimiters( money, 2, ' ', '.' );
			break;
		case 'amount_no_decimals_with_space_separator':
			value = formatWithDelimiters( money, 0, '.', '' );
			break;
		case 'amount_with_apostrophe_separator':
			value = formatWithDelimiters( money, 2, "'", '.' );
			break;
	}

	return format.replace( placeholderRegex, value );
}

// Render price html.
function btyPriceHtml( price, compare_price = false, unit_price = false, unit_price_measurement = {}) {
	let html         = '',
		regularPrice = btyStrings.product.regular_price;

	if ( compare_price ) {
		html += '<s class="regular-price">';
		html += '<span class="sr-only">' + regularPrice + ': </span>';
		html += btyFormatPrice( compare_price );
		html += '</s>';

		html += '<span class="price">';
		html += '<span class="sr-only">' + btyStrings.product.sale_price + ': </span>';
		html += btyFormatPrice( price );
		html += '</span>';
	} else {
		html += '<span class="regular-price">';
		html += '<span class="sr-only">' + regularPrice + ': </span>';
		html += btyFormatPrice( price );
		html += '</span>';
	}

	if ( unit_price ) {
		html += '<span class="unit-price">';
		html += btyFormatPrice( unit_price ) + '/' + unit_price_measurement.quantity_unit;
		html += '</span>';
	}

	return html;
}

// Parse html dom.
function btyGetSectionHtml( text = '', selector = '.shopify-section', html = 'inner' ) {
	let el = new DOMParser().parseFromString( text, 'text/html' ).querySelector( selector );

	return el ? ( 'inner' === html ? el.innerHTML : el.outerHTML ) : '';
}

/**
 * Update html dom.
 *
 * @param  array sections The response sections.
 * @param  array modules  The modules need update html dom.
 */
function btyUpdateHtml( sections, modules ) {
	modules.forEach(
		function( mod ) {
			let query = document.querySelectorAll( mod.node );
			if ( ! query.length ) {
				return;
			}

			query.forEach(
				function( el ) {
					el.innerHTML = btyGetSectionHtml( sections[ mod.section ], mod.selector );
				}
			);
		}
	);
}

// Countdown time.
function btyCountdownTime( doc = document ) {
	let selectors = doc.querySelectorAll( '.countdown-time' );

	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let time        = el.getAttribute( 'data-time' ),
				dayField    = el.querySelector( '.days' ),
				hourField   = el.querySelector( '.hours' ),
				minuteField = el.querySelector( '.minutes' ),
				secondField = el.querySelector( '.seconds' );

			if ( ! dayField || ! hourField || ! minuteField || ! secondField ) {
				return;
			}

			// Check time first.
			if ( isNaN( Date.parse( time )) ) {
				return;
			}

			// Convert to milisecond.
			let interval,
				second = 1000,
				minute = second * 60,
				hour   = minute * 60,
				day    = hour * 24,
				today  = new Date();

			const countDownFn = function() {
				let countDown = new Date( time ).getTime(),
					now       = new Date().getTime(),
					distance  = countDown - now,
					dayInner  = Math.floor( distance / day );

				if ( distance < 0 ) {
					el.parentNode.remove();

					clearInterval( init );

					return;
				}

				if ( 0 == dayInner && dayField ) {
					dayField.parentNode.remove();
				} else {
					dayField.innerText = dayInner;
				}

				hourField.innerText   = ( '0' + Math.floor( ( distance % day ) / hour )).slice( -2 );
				minuteField.innerText = ( '0' + Math.floor( ( distance % hour ) / minute )).slice( -2 );
				secondField.innerText = ( '0' + Math.floor( ( distance % minute ) / second )).slice( -2 );

				// Show countdown.
				el.parentNode.classList.remove( 'hidden' );
			}

			let init = setInterval( countDownFn, 0 );
		}
	);
}

/**
 * Close theme popup
 *
 * @param  string class_name  Class name remove form <html>
 * @return node   parent_node Parent node to implement click overlay.
 */
function btyClosePopup( class_name, parent_node, overlay = true ) {
	if ( ! class_name ) {
		return;
	}

	let doc    = document.documentElement,
		button = parent_node ? parent_node.querySelector( '.close-button' ) : false;

	// Click to popup overlay.
	if ( parent_node && overlay ) {
		parent_node.addEventListener(
			'click',
			function( e ) {
				if ( e.target != parent_node ) {
					return;
				}

				doc.classList.remove( class_name );

				document.dispatchEvent( new CustomEvent( 'theme-popup-close' ));
			}
		);
	}

	// Use ESC key.
	doc.addEventListener(
		'keyup',
		function( e ) {
			if ( 27 !== e.keyCode ) {
				return;
			}

			doc.classList.remove( class_name );
			document.dispatchEvent( new CustomEvent( 'theme-popup-close' ));
		}
	);

	// Use close button.
	if ( button ) {
		button.onclick = function() {
			doc.classList.remove( class_name );
			document.dispatchEvent( new CustomEvent( 'theme-popup-close' ));
		}
	}
}

// Quick search.
function btyQuickSearch() {
	let actions = document.querySelectorAll( '.action-search' );
	if ( ! actions.length || document.body.classList.contains( 'template-search' )) {
		return;
	}

	let dialog      = document.querySelector( '.quick-search' ),
		input       = dialog ? dialog.querySelector( '.search-input' ) : false,
		button      = dialog ? dialog.querySelector( '.search-button' ) : false,
		suggestions = dialog ? dialog.querySelector( '.suggestions-product' ) : false,
		result      = dialog ? dialog.querySelector( '.search-results' ) : false;

	if ( ! input || ! button || ! result ) {
		return;
	}

	if ( Shopify.designMode && document.documentElement.classList.contains( 'quick-search-open' )) {
		btyClosePopup( 'quick-search-open', dialog, false );
	}

	// Toggle quick search.
	actions.forEach(
		function( el ) {
			el.onclick = function( e ) {
				e.preventDefault();

				// Focus input field.
				input.focus();
				input.removeAttribute( 'tabindex' );

				// Reset search result first.
				if ( ! input.value.trim()) {
					result.innerHTML = '';
				}

				document.documentElement.classList.add( 'quick-search-open' );
				btyClosePopup( 'quick-search-open', dialog, false );
			}
		}
	);

	input.oninput = function() {
		btySearchDelay(
			function() {
				let value = input.value.trim();
				if ( ! value ) {
					suggestions.classList.remove( 'sr-only' );
					suggestions.classList.add( 'animation-fade-up', 'opacity-0' );

					setTimeout(
						function() {
							suggestions.classList.remove( 'animation-fade-up', 'opacity-0' );
						},
						1100
					);

					result.innerHTML = '';
					return;
				}

				dialog.classList.add( 'searching' );

				// Hide suggestions product and show search results.
				result.innerHTML = btyGlobals.card_placeholder;
				suggestions.classList.add( 'sr-only' );
				result.classList.remove( 'sr-only' );
				result.classList.add( 'animation-fade-up', 'opacity-0' );

				setTimeout(
					function() {
						result.classList.remove( 'animation-fade-up', 'opacity-0' );
					},
					1100
				);

				let url = btyGlobals.search_url + '?section_id=search&type=' + btyGlobals.search_type + '&options[prefix]=last&options[unavailable_products]=' + btyGlobals.search_unavailable + '&limit=6&q=' + value;
				fetch( url )
					.then(
						function( r ) {
							if ( 200 !== r.status ) {
								console.log( 'Status Code: ' + r.status );
								throw r;
							}

							return r.text();
						}
					).then(
						function( res ) {
							// Update html.
							result.innerHTML = btyGetSectionHtml( res, '.fetch-search' );

							// Re-init function.
							btyAnimationImageLoad( result );
							btyQuickView( result );
							btyAddToCart( result );
							btyQuickAdd( result );
							btySwatch( result );
							btyHoverMediaVideo( result );
						}
					).catch(
						function( e ) {
							console.error( e );
						}
					).finally(
						function() {
							dialog.classList.remove( 'searching' );
							// Custom event.
							document.dispatchEvent( new CustomEvent( 'product-card-updated' ));
						}
					);
			},
			300
		);
	}
}

// Quantity button.
function btyQuantityButton( doc = document ) {
	let buttons = doc.querySelectorAll( '.quantity-button' );
	if ( ! buttons.length ) {
		return;
	}

	buttons.forEach(
		function( el ) {
			let eventChange = new Event( 'change', { bubbles: true });

			el.onclick = function() {
				let input = el.parentNode.querySelector( '.quantity-input' );
				if ( ! input ) {
					return;
				}

				let current = Number( input.value || 0 ),
					step    = Number( input.getAttribute( 'step' ) || 1 ),
					min     = Number( input.getAttribute( 'min' ) || 0 ),
					max     = Number( input.getAttribute( 'max' )),
					name    = el.name;

				if ( 'minus' === name && current >= step ) { // Minus button.
					if ( current <= min || ( current - step ) < min ) {
						return;
					}

					input.value = current - step;
				} else if ( 'plus' === name ) { // Plus button.
					if ( max && ( current >= max || ( current + step ) > max )) {
						return;
					}

					input.value = current + step;
				}

				// Trigger event.
				input.dispatchEvent( eventChange );
			}
		}
	);
}

// Main menu.
function btyNavMenu( doc = document, event = false ) {
	let toggle = doc.querySelector( '.toggle-panel' ),
		panel  = doc.querySelector( '.site-panel' );

	if ( ! toggle || ! panel ) {
		return;
	}

	// Close site panel when settings update.
	if ( event && event.detail.load ) {
		btyClosePopup( 'site-panel-open', panel );
	}

	// Toggle site panel.
	toggle.onclick = function() {
		document.documentElement.classList.add( 'site-panel-open' );

		btyClosePopup( 'site-panel-open', panel );
	}

	// Toggle sub menu.
	let links = doc.querySelectorAll( '.site-panel .has-children' );
	if ( ! links.length ) {
		return;
	}

	links.forEach(
		function( el ) {
			el.onclick = function( e ) {
				if ( e.target.classList.contains( 'menu-text' )) {
					return;
				}

				e.preventDefault();

				let menu    = el.closest( '.toggle-navigation' ),
					parent  = el.parentNode,
					subMenu = parent.querySelector( '.sub-menu' ) || parent.querySelector( '.sub-mega-menu' );
				if ( ! subMenu ) {
					return;
				}

				parent.classList.add( 'active' );

				// Update current sub menu.
				let level = Number( subMenu.getAttribute( 'data-level' ) || 1 ),
					back  = parent.querySelector( '.back' );
				if ( level ) {
					menu.setAttribute( 'data-level', level );
				}

				// Go back parent level.
				if ( back ) {
					back.onclick = function() {
						parent.classList.remove( 'active' );
						menu.setAttribute( 'data-level', level - 1 );
					}
				}
			}
		}
	);
}

// Slider.
window.btySliderInstances = window.btySliderInstances || {};
function btySlider( doc = document, event = {}) {
	let selectors = doc.querySelectorAll( '.theme-slider .swiper' );
	if ( ! selectors.length || 'undefined' === typeof( Swiper )) {
		return;
	}

	let isMobile = window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches;

	selectors.forEach(
		function( el ) {
			let section      = el.closest( '.slider-section' ),
				sectionId    = section ? section.id.replace( 'shopify-section-', '' ) : false,
				data         = section ? section.querySelector( '[data-slider]' ) : false,
				initialSlide = 0;

			if ( ! sectionId ) {
				return;
			}

			// For design mode.
			if ( Shopify.designMode ) {
				let current = Object.keys( event ).length ? el.querySelector( '.swiper-slide[data-' + event.detail.blockId + ']' ) : false;
				if ( current ) {
					initialSlide = current.getAttribute( 'data-index' );
				}

				if ( 'undefined' !== typeof( btySliderInstances[sectionId] )) {
					btySliderInstances[sectionId].slideTo( initialSlide, 500 );
				}
			}

			if ( el.classList.contains( 'swiper-initialized' ) || ! data ) {
				return;
			}

			let options = btyJsonParse( data.content.textContent );

			// Active slide index.
			options.initialSlide = initialSlide;

			// Autohight on mobile.
			if ( el.parentNode.classList.contains( 'height-mobile-auto' ) && isMobile ) {
				options.autoHeight = true;
			}

			// Init function.
			options.on = {
				init: function( swp ) {
					let duplicateSlides = swp.el.querySelectorAll( '.swiper-slide.swiper-slide-duplicate' ),
						currentSlide    = swp.wrapperEl.querySelector( '.swiper-slide.swiper-slide-active' );

					// Amination image load.
					if ( duplicateSlides.length ) {
						duplicateSlides.forEach(
							function( ds ) {
								btyAnimationImageLoad( ds );
							}
						);
					}

					// Fire on init, once time.
					if ( currentSlide || isMobile ) {
						currentSlide.classList.add( 'swiper-slide-ready' );
					}
				}
			}

			// Init.
			btySliderInstances[sectionId] = new Swiper( el, options );

			// Tabbing issue.
			el.addEventListener(
				'keydown',
				function( e ) {
					if ( 9 === e.keyCode ) {
						btySliderInstances[sectionId].slideNext();
					}
				}
			);

			// Event.
			btySliderInstances[sectionId].on(
				'transitionStart',
				function( swp ) {
					let swiperSlide = swp.wrapperEl.querySelectorAll( '.swiper-slide' );

					if ( swiperSlide.length ) {
						swiperSlide.forEach(
							function( el ) {
								el.classList.remove( 'swiper-slide-ready' );
							}
						);
					}
				}
			);

			btySliderInstances[sectionId].on(
				'transitionEnd',
				function( swp ) {
					let currentSlide = swp.wrapperEl.querySelector( '.swiper-slide.swiper-slide-active' );

					if ( currentSlide ) {
						currentSlide.classList.add( 'swiper-slide-ready' );
					}
				}
			);

			// Remove template slider options.
			data.remove();

			// Scroll to section.
			let buttons = el.querySelectorAll( '.button.slide-element-inner' );
			if ( buttons.length ) {
				buttons.forEach(
					function( btn ) {
						let href = btn.getAttribute( 'href' );
						if ( ! href || href.includes( '/' )) {
							return;
						}

						let selectorId = document.querySelector( href );

						if ( selectorId ) {
							btn.onclick = function( e ) {
								e.preventDefault();

								selectorId.scrollIntoView({ behavior: 'smooth' });
							}
						}
					}
				);
			}
		}
	);
}

window.btyCarouselInstances = window.btyCarouselInstances || {};
function btyCarousel( doc = document, event = {}  ) {
	let selectors = doc.querySelectorAll( '.carousel-swiper .swiper' );
	if ( ! selectors.length || 'undefined' === typeof( Swiper )) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let sectionId = el.closest( '.shopify-section' ).id.replace( 'shopify-section-', '' );

			if ( el.hasAttribute( 'data-index' )) {
				sectionId += el.getAttribute( 'data-index' );
			}

			// For design mode.
			if ( Shopify.designMode ) {
				let initialSlide = 0,
					current      = Object.keys( event ).length ? el.querySelector( '.swiper-slide[data-' + event.detail.blockId + ']' ) : false;
				if ( current ) {
					initialSlide = current.getAttribute( 'data-index' );
				}

				if ( 'undefined' !== typeof( btyCarouselInstances[sectionId] )) {
					btyCarouselInstances[sectionId].slideTo( initialSlide, 800 );
				}
			}

			let data = el.parentNode.querySelector( '[data-options]' );
			if ( ! data || el.classList.contains( 'swiper-initialized' )) {
				return;
			}

			let options = btyJsonParse( data.content.textContent );

			options.threshold = 20;

			// Custom pagination.
			if ( data.hasAttribute( 'data-custom-pagination' ) && options.pagination ) {
				options.pagination.type = 'custom';

				options.pagination.renderCustom = function( swiper, current, total ) {
					return current + '/' + total;
				}
			}

			// Use css mode on touch devices.
			if ( ! data.hasAttribute( 'data-css-mode' ) && ( window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches )) {
				options.cssMode = true;
			}

			// Animation image load.
			options.on = {
				init: function( swp ) {
					let duplicateSlides = swp.el.querySelectorAll( '.swiper-slide.swiper-slide-duplicate' );
					if ( duplicateSlides.length ) {
						duplicateSlides.forEach(
							function( ds ) {
								btyAnimationImageLoad( ds );
							}
						);
					}
				}
			}

			// Init.
			btyCarouselInstances[sectionId] = new Swiper( el, options );

			// Lookbook.
			let lookbook = el.closest( '.lookbook' );
			if ( lookbook ) {
				let items = lookbook.querySelectorAll( '.item-wrapper .item' );
				if ( ! items.length ) {
					return;
				}

				items.forEach(
					function( item ) {
						item.onclick = function() {
							btyCarouselInstances[sectionId].slideTo( Number( item.getAttribute( 'data-index' )), 600 );
						}
					}
				);

				btyCarouselInstances[sectionId].on(
					'slideChange',
					function( swiper ) {
						let oldItem     = lookbook.querySelector( '.item.active' ),
							currentItem = lookbook.querySelector( '.item:nth-child(' + ( swiper.realIndex + 1 ) + ')' );

						if ( oldItem ) {
							oldItem.classList.remove( 'active' );
						}

						if ( currentItem ) {
							currentItem.classList.add( 'active' );
						}
					}
				);
			}

			// Remove template carousel options.
			data.remove();
		}
	);
}

// Testimonial product.
function btyTestimonialProduct( doc = document ) {
	let selectors = doc.querySelectorAll( '.testimonial-product' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let imageCarouselOption, imageCarousel, textCarouselOption, textCarousel,
				imageEl = el.querySelector( '.image-content .swiper' ),
				textEl  = el.querySelector( '.text-content .swiper' ),
				mobile  = window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches,
				value   = mobile ? 15 : 10;

			imageCarouselOption = {
				speed: 300,
				slidesPerView: 1,
				effect: 'creative',
				loop: true,
				loopedSlides: 3,
				allowTouchMove: false,
				creativeEffect: {
					limitProgress: 2,
					prev: {
						opacity: 0,
						translate: [`${value}%`, 0, 0]
					},
					next: {
						translate: [`-${value}%`, 0, 0],
						scale: 0.9
					}
				}
			}

			// Image card.
			if ( imageEl && ! imageEl.classList.contains( 'swiper-initialized' )) {
				imageCarousel = new Swiper( imageEl, imageCarouselOption );

				const calcEdge = function() {
					let originLeft = imageEl.getBoundingClientRect().left,
						edge       = [];

					imageEl.querySelectorAll( '.swiper-slide' ).forEach(
						function( sl ) {
							let edgeLeft = sl.getBoundingClientRect().left;
							if ( ! edge.includes( edgeLeft )) {
								edge.push( edgeLeft );
							}
						}
					);

					if ( originLeft <= Math.min( ...edge )) {
						return;
					}

					let finalSpace = Math.round( originLeft - Math.min( ...edge ));

					imageEl.parentNode.setAttribute( 'data-edge-left', finalSpace );
					imageEl.parentNode.setAttribute( 'style', '--edge-left:' + finalSpace + 'px;' );

					// Start.
					const edgeEvent = new Event( 'edge-left-updated' );

					const observer = new ResizeObserver(
						function() {
							let newElement = imageEl.parentNode.getBoundingClientRect().left,
								newEdge    = [];

							imageEl.querySelectorAll( '.swiper-slide' ).forEach(
								function( sl ) {
									let newEdgeLeft = sl.getBoundingClientRect().left;
									if ( ! newEdge.includes( newEdgeLeft )) {
										newEdge.push( newEdgeLeft );
									}
								}
							);

							edgeEvent.detail = {
								element: imageEl.parentNode,
								space: Math.round( originLeft - Math.min( ...newEdge ))
							};

							document.dispatchEvent( edgeEvent );
						}
					);

					// observer.observe( el );

					return observer;
				}

				calcEdge();
			}

			textCarouselOption = {
				speed: 300,
				slidesPerView: 1,
				loop: true,
				loopedSlides: 3,
				spaceBetween: 40
			}

			if ( el.classList.contains( 'image-layout' )) {
				textCarouselOption.effect =  'fade';

				textCarouselOption.fadeEffect = {
					crossFade: true
				}
			}

			// Layout.
			if ( el.classList.contains( 'content-layout' )) {
				textCarouselOption.centeredSlides = true;
				textCarouselOption.spaceBetween   = 200;

				if ( mobile ) {
					textCarouselOption.autoHeight = true;
				}
			} else {
				textCarouselOption.autoHeight = true;

				textCarouselOption.navigation = {
					nextEl: el.querySelector( '.text-content .swiper-button-next' ),
					prevEl: el.querySelector( '.text-content .swiper-button-prev' )
				}

				textCarouselOption.pagination = {
					el: el.querySelector( '.text-content .swiper-pagination' ),
					clickable: true
				}
			}

			// Text content.
			if ( textEl && ! textEl.classList.contains( 'swiper-initialized' )) {
				textCarousel = new Swiper( textEl, textCarouselOption );
			}

			// Sync controls.
			if ( textCarousel && imageCarousel ) {
				textCarousel.controller.control  = imageCarousel;
				imageCarousel.controller.control = textCarousel;
			}
		}
	);

	document.addEventListener(
		'edge-left-updated',
		function( e ) {
		}
	);
}

// Split Slider.
function btySplitSlider( doc = document ) {
	let selectors = doc.querySelectorAll( '.split-slider' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let imageCarouselOption, imageCarousel, textCarouselOption, textCarousel,
				imageEl = el.querySelector( '.image-content .swiper' ),
				textEl  = el.querySelector( '.text-content .swiper' ),
				mobile  = window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches

			imageCarouselOption = {
				speed: 600,
				spaceBetween: 40,
				scrollbar: {
					el: ".split-slider .swiper-scrollbar",
					draggable: true
				},
				breakpoints: {
					240: {
						slidesPerView: 1
					},
					992: {
						slidesPerView: 1.25
					}
				}
			}

			// Image card.
			if ( imageEl && ! imageEl.classList.contains( 'swiper-initialized' )) {
				imageCarousel = new Swiper( imageEl, imageCarouselOption );
			}

			textCarouselOption = {
				speed: 600,
				spaceBetween: 40,
				scrollbar: {
					el: ".split-slider .swiper-scrollbar",
					draggable: true
				},
				breakpoints: {
					240: {
						slidesPerView: 1
					},
					992: {
						slidesPerView: 1
					}
				}
			}

			// Layout.
			if ( el.classList.contains( 'content-layout' )) {
				textCarouselOption.centeredSlides = true;
				textCarouselOption.spaceBetween   = 200;

				if ( mobile ) {
					textCarouselOption.autoHeight = true;
				}
			} else {
				textCarouselOption.autoHeight  = true;

				textCarouselOption.navigation = {
					nextEl: el.querySelector( '.text-content .swiper-button-next' ),
					prevEl: el.querySelector( '.text-content .swiper-button-prev' )
				}
			}

			// Text content.
			if ( textEl && ! textEl.classList.contains( 'swiper-initialized' )) {
				textCarousel = new Swiper( textEl, textCarouselOption );
			}

			// Sync controls.
			if ( textCarousel && imageCarousel ) {
				textCarousel.controller.control  = imageCarousel;
				imageCarousel.controller.control = textCarousel;
			}
		}
	);
}

// Account popup.
function btyAccountPopup( doc = document ) {
	let selectors = doc.querySelectorAll( '.action-account' ),
		customer  = document.querySelector( '.customer-wraper' );
	if ( ! selectors.length || ! customer || document.body.classList.contains( 'has-account-details' )) {
		return;
	}

	// Get display style.
	const getStyles = function( el, property = 'display' ) {
		let obj = window.getComputedStyle( el, null );

		return obj.getPropertyValue( property );
	}

	// Get first input field.
	const getInput = function( parent ) {
		return parent.querySelector( '.field input' );
	}

	// Toggle popup.
	selectors.forEach(
		function( el ) {
			el.onclick = function( e ) {
				if ( el.classList.contains( 'new-customer-accounts' )) {
					return;
				}

				e.preventDefault();

				let login    = customer.querySelector( '.login' ),
					loginBox = login ? login.querySelector( '#login-container' ) : false,
					recover  = login ? login.querySelector( '#recover-container' ) : false,
					register = customer.querySelector( '.register' );

				if ( ! recover || ! loginBox || ! register ) {
					return;
				}

				// Focus input field on desktop.
				if ( window.matchMedia( '(min-width: 992px)' ).matches ) {
					if ( getStyles( register ) === 'block' ) {
						getInput( register ).focus();
					} else if ( getStyles( recover ) === 'block' ) {
						getInput( recover ).focus();
					} else if ( getStyles( loginBox ) === 'block' ) {
						getInput( loginBox ).focus();
					}
				}

				// Add loading animation.
				document.documentElement.classList.add( 'customer-open' );

				// Close popup.
				btyClosePopup( 'customer-open', customer );

				customer.onclick = function( e ) {
					let target = e.target;

					// Create account.
					if ( target.classList.contains( 'create-account' )) {
						e.preventDefault();

						login.classList.add( 'hidden' );
						register.classList.remove( 'hidden' );

						getInput( register ).focus();
					}

					// Sign-in.
					if ( target.classList.contains( 'sign-in' )) {
						e.preventDefault();

						login.classList.remove( 'hidden' );
						register.classList.add( 'hidden' );

						getInput( loginBox ).focus();
					}

					// Fogot password.
					if ( target.classList.contains( 'forgot-password' )) {
						setTimeout(
							function() {
								getInput( recover ).focus();
							}
						);
					}

					// Cancel login.
					if ( target.classList.contains( 'login-cancel' )) {
						setTimeout(
							function() {
								getInput( loginBox ).focus();
							}
						);
					}
				}
			}
		}
	);
}

// Hover menu animation.
function btyHoverNav( doc = document ) {
	let header = doc.querySelector( '.header-nav' );
	if ( ! header ) {
		return;
	}

	header.onmousemove = function( e ) {
		header.classList.add( 'hover' );
	}

	header.onmouseleave = function() {
		header.classList.remove( 'hover' );
	}
}

// Find if two arrays contain any common item in Javascript.
function btyDiffObject( haystack, arr ) {
	return arr.every(
		function( v ) {
			return haystack.includes( v );
		}
	);
};

// Update cart item count.
function btyCartItemCount( items = 1 ) {
	let count = document.querySelectorAll( '.cart-item-count' );
	if ( ! count.length ) {
		return;
	}

	items = Number( items );

	count.forEach(
		function( el ) {
			el.innerHTML = items;

			if ( items < 1 ) {
				el.classList.add( 'hidden' );
			} else {
				el.classList.remove( 'hidden' );
			}
		}
	);
}

// Selected variant image.
function btySelectedVariant( variant, data, slider ) {
	for ( let opt in data ) {
		if ( btyDiffObject( Object.values( variant ), data[opt].options )) {
			if ( 'object' === typeof( slider ) && Object.keys( slider ).length && data[opt].featured_media ) {
				slider.slideTo( ( data[opt].featured_media.position - 1 ), 500, false );
			}

			return data[opt];
		}
	}
}

// Fetch cart data.
function btyFetchCart( obj, modules, item ) {
	let body = JSON.stringify( obj );

	fetch( btyGlobals.cart_change_url, {...btyFetchConfig(), ...{ body }})
		.then(
			function( r ) {
				return r.json();
			}
		).then(
			function( res ) {
				let warning = item.querySelectorAll( '.product-warning' );
				if ( warning.length ) {
					warning.forEach(
						function( el ) {
							el.innerHTML = '';
						}
					);
				}

				if ( res.errors && warning.length ) {
					warning.forEach(
						function( el ) {
							el.innerHTML = btyGlobals.svg_warning + res.errors;
						}
					);

					let qtyInput = item.querySelectorAll( '.quantity-input' );
					if ( qtyInput.length ) {
						qtyInput.forEach(
							function( el ) {
								el.value = el.getAttribute( 'data-qty' );
							}
						);
					}

					return;
				}

				// Update cart item count first.
				btyCartItemCount( res.item_count );

				// Cart empty.
				if ( ! res.items.length ) {
					let cartTable       = document.querySelector( '.cart-page-section .container' ),
						cartSubtotal    = cartTable ? cartTable.querySelector( '.cart-footer' ) : false,
						sideCartContent = document.querySelector( '.side-cart-content' ),
						sideCartFooter  = document.querySelector( '.side-cart-footer' );

					// Update cart table section.
					if ( cartTable ) {
						cartTable.innerHTML = btyGetSectionHtml( res.sections['main-cart'], '.container' );
					}

					// Remove cart subtotal section.
					if ( cartSubtotal ) {
						cartSubtotal.remove();
					}

					// Update side cart content.
					if ( sideCartContent ) {
						sideCartContent.innerHTML = btyGetSectionHtml( res.sections['side-cart'], '.side-cart-content' );
					}

					// Remove side cart footer.
					if ( sideCartFooter ) {
						sideCartFooter.remove();
					}

					// Open login popup when cart empty.
					btyAccountPopup();
				}

				// Update current item.
				if ( obj.quantity > 0 ) {
					let sidecartContent = item.closest( '.side-cart-content' ),
						totalPrice      = item.querySelector( '.totals-item-price' ),
						quantityUnit    = item.querySelectorAll( '[name="quantity"]' );
					if ( totalPrice ) {
						totalPrice.innerHTML = btyGetSectionHtml( res.sections['main-cart'], '[data-line="' + obj.line + '"] .totals-item-price' );
					}

					if ( sidecartContent ) {
						item.innerHTML = btyGetSectionHtml( res.sections['side-cart'], '[data-line="' + obj.line + '"]' );
					}

					if ( quantityUnit.length ) {
						quantityUnit.forEach(
							function( el ) {
								el.setAttribute( 'data-qty', obj.quantity );
							}
						);
					}
				} else {
					item.remove();
				}

				// Update html.
				btyUpdateHtml( res.sections, modules );

				// Update sidecart total price.
				let sideCartPrice = document.querySelector( '.side-cart-footer .total-price' );
				if ( sideCartPrice ) {
					sideCartPrice.innerHTML = btyGetSectionHtml( res.sections['side-cart'], '.total-price' );;
				}

				// Re-init quantity button.
				btyQuantityButton();

				// Re-init update product quantity.
				btyUpdateProductQuantity();
			}
		).catch(
			function( e ) {
				console.error( e );
			}
		).finally(
			function() {
				// Remove loading.
				item.classList.remove( 'updating' );
			}
		);
}

// Update product quantity.
function btyUpdateProductQuantity( doc = document ) {
	let item = doc.querySelectorAll( '.product-item[data-line]' );
	if ( ! item.length ) {
		return;
	}

	// Register dom html need an update when the response available.
	let modules = [
		{
			node: '.cart-totals',
			section: 'main-cart',
			selector: '.cart-totals'
		},
		{
			node: false,
			section: 'side-cart',
			selector: false
		},
		{
			node: '.cart-table',
			section: 'main-cart',
			selector: '.cart-table'
		},
		{
			node: '.cart-items',
			section: 'side-cart',
			selector: '.cart-items'
		}
	];

	item.forEach(
		function( el ) {
			let line = parseInt( el.getAttribute( 'data-line' ), 10 );

			if ( ! line || isNaN( line )) {
				return;
			}

			let removes = el.querySelectorAll( '.product-remove' ),
				inputs  = el.querySelectorAll( '.quantity-input' );

			// Quantity change.
			if ( inputs.length ) {
				inputs.forEach(
					function( input ) {
						input.onchange = function() {
							let data, quantity = Number( input.value.trim());

							// Loading effect.
							el.classList.add( 'updating' );

							data = {
								line,
								quantity,
								sections: modules.map( s => s.section ),
								sections_url: window.location.pathname
							}

							// Fetch data.
							btyFetchCart( data, modules, el );
						}
					}
				);
			}

			// Remove button click.
			if ( removes.length ) {
				removes.forEach(
					function( remove ) {
						remove.onclick = function( e ) {
							e.preventDefault();

							// Loading effect.
							el.classList.add( 'updating' );

							let data = {
								line,
								quantity: 0,
								sections: modules.map( s => s.section ),
								sections_url: window.location.pathname
							}

							// Fetch data.
							btyFetchCart( data, modules, el );
						}
					}
				);
			}
		}
	);
}

// Helper function to handle group image and media scroll
function btyHandleVariantMediaDisplay( selected, gallery ) {
	if ( ! selected ) {
		return 0;
	}

	let indexSlide = 0;

	// Check group image.
	let groupImage = document.querySelectorAll( '.check-group-image .group-image[data-color]' );
	if ( groupImage.length ) {
		let colorName = ( selected.featured_media && selected.featured_media.alt ) ? selected.featured_media.alt.split( '_' )[0] : false;
		if ( colorName ) {
			groupImage.forEach(
				function( gi ) {
					let label = gi.getAttribute( 'data-color' ).trim();
					if ( ! label ) {
						return;
					}

					if ( colorName.toUpperCase() == label.toUpperCase() ) {
						gi.parentNode.classList.remove( 'group-hidden' );
					} else {
						gi.parentNode.classList.add( 'group-hidden' );
					}
				}
			);
		}
	} else {
		// Scroll to current variant media.
		let headerSticky = document.querySelector( '.header.header-sticky' ),
			headerHeight = headerSticky ? headerSticky.offsetHeight : 0,
			currentMedia = gallery && selected.featured_media ? gallery.querySelector( '.media-preview-wrap[data-id="' + selected.featured_media.id + '"]' ) : false;

		if ( currentMedia ) {
			window.scrollTo({
				top: ( currentMedia.getBoundingClientRect().top + window.pageYOffset - headerHeight ),
				behavior: 'smooth'
			});

			indexSlide = Number( currentMedia.getAttribute( 'data-pos' ) ) - 1;
		}
	}

	return indexSlide;
}

// AJAX-based variant handling for products with 250+ variants
function btyProductVariantsAjax( sl, field, doc ) {
	let summary         = sl.closest( '.product-summary' ),
		variant_pick    = {},
		abortController = null;

	if ( ! summary ) {
		return;
	}

	let form        = summary.querySelector( '[data-type="add-to-cart-form"]' ),
		productUrl  = sl.getAttribute( 'data-url' ),
		sectionId   = sl.getAttribute( 'data-section-id' ) || '';

	// Initialize variant pick from current selection
	field.forEach(
		function( el ) {
			if ( 'radio' === el.type ) {
				if ( el.checked ) {
					variant_pick[ el.name ] = el.value;
				}
			} else {
				variant_pick[ el.name ] = el.value;
			}
		}
	);

	// Helper function to get selected option value IDs
	function getSelectedOptionValueIds() {
		let ids = [];
		field.forEach(
			function( el ) {
				let isSelected = false;
				if ( 'radio' === el.type ) {
					isSelected = el.checked;
				} else if ( 'hidden' === el.type ) {
					isSelected = true;
				}

				if ( isSelected && el.dataset.optionValueId ) {
					ids.push( el.dataset.optionValueId );
				}
			}
		);
		return Array.from( new Set( ids ));
	}

	// Helper function to build section URL
	function buildSectionUrl( optionValueIds ) {
		if ( ! productUrl || ! sectionId ) {
			return '';
		}

		let url = new URL( productUrl, window.location.origin );
		url.searchParams.set( 'section_id', sectionId );

		if ( optionValueIds && optionValueIds.length ) {
			url.searchParams.set( 'option_values', optionValueIds.join( ',' ));
		}

		return url.toString();
	}

	// Helper function to refresh section via AJAX
	function refreshSection( sectionUrl ) {
		if ( ! sectionUrl ) {
			return;
		}

		// Cancel previous request if exists
		if ( abortController ) {
			abortController.abort();
		}

		abortController = new AbortController();

		// Disable form during fetch
		if ( form ) {
			form.classList.add( 'disabled' );
		}

		fetch( sectionUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: abortController.signal })
			.then( function( res ) {
				return res.text();
			}).then( function( htmlString ) {
				summary.innerHTML = btyGetSectionHtml( htmlString, '.product-summary', 'inner' );

				// Get media position from updated DOM
				let variantData = btyExtractVariantData( doc ),
					gallery     = document.querySelector( '.product-gallery' ),
					indexSlide  = 0;

				// Handle group image and media scroll
				indexSlide = btyHandleVariantMediaDisplay( variantData, gallery );

				// Scroll to variant image if slider exists
				if ( 'object' === typeof( window.btyMainSlider ) && Object.keys( window.btyMainSlider ).length && variantData && variantData.mediaPosition ) {
					indexSlide = variantData.mediaPosition - 1;
					window.btyMainSlider.slideTo( indexSlide, 500, false );
				}

				// Re-initialize after DOM update
				btyProductVariants( doc );

				// Dispatch custom event
				let customEvent = new CustomEvent( 'product-variant-updated', {
					detail: {
						sectionUrl: sectionUrl,
						optionValueIds: getSelectedOptionValueIds(),
						isAjaxMode: true
					}
				});
				document.documentElement.dispatchEvent( customEvent );

				// Re-init share.
				btyProductShare();

				// Re-init quantity.
				btyQuantityButton();

				// Re-init add to cart.
				btyAddToCart();
			}).catch( function( err ) {
				// Ignore abort errors
				if ( err && err.name === 'AbortError' ) {
					return;
				}

				console.error( '[btyProductVariantsAjax] fetch error', err );
			}).finally( function() {
				if ( form ) {
					form.classList.remove( 'disabled' );
				}
			});
	}

	// Bind change events
	field.forEach(
		function( el ) {
			el.onchange = function() {
				variant_pick[ el.name ] = el.value;

				// Get selected option value IDs
				let selectedOptionValueIds = getSelectedOptionValueIds();
				let sectionUrl             = buildSectionUrl( selectedOptionValueIds );

				// Update selected option text
				let selectedOption = el.closest( '.variant-field' ).querySelector( '.field-title .selected-value' );
				if ( selectedOption ) {
					selectedOption.innerText = el.value.trim();
				}

				// Refresh section if we have option value IDs
				if ( selectedOptionValueIds.length ) {
					refreshSection( sectionUrl );
				}
			};
		}
	);
}

// Helper function to extract variant data from DOM
function btyExtractVariantData( summary ) {
	try {
		let variantIdInput = summary.querySelector( '.main-input-product-id[name="id"]' );
		if ( ! variantIdInput || ! variantIdInput.value ) {
			return null;
		}

		let mediaPosition = variantIdInput.dataset.mediaPosition ? parseInt( variantIdInput.dataset.mediaPosition, 10 ) : null,
			mediaId       = variantIdInput.dataset.mediaId ? parseInt( variantIdInput.dataset.mediaId, 10 ) : null;

		return {
			featured_media: {
				id: mediaId
			},
			id: variantIdInput.value,
			mediaPosition
		};
	} catch ( err ) {
		console.error( '[btyExtractVariantData] error', err );
		return null;
	}
}

// Variant options.
function btyProductVariants( doc = document ) {
	let selector = doc.querySelectorAll( '.product-variants' );
	if ( ! selector.length ) {
		return;
	}

	selector.forEach(
		function( sl ) {
			let variants = sl.parentNode.querySelector( '[data-product-variants]' ),
				quantity = sl.parentNode.querySelector( '[data-inventory-quantity]' ),
				field    = sl.querySelectorAll( '.field-value' );
			if ( ! field.length ) {
				return;
			}

			// Check if variants data is available (less than 250 variants)
			let hasVariantsData = variants && variants.textContent.trim();

			// If no variants data, use AJAX-based approach
			if ( ! hasVariantsData ) {
				btyProductVariantsAjax( sl, field, doc );

				return;
			}

			// Original code: variants data is available
			if ( ! quantity ) {
				return;
			}

			let gallery      = sl.closest( '.main-product' ),
				featured     = sl.closest( '.featured-product-product' ),
				image        = featured ? featured.querySelector( '.media-preview' ) : false,
				summary      = sl.closest( '.product-summary' ),
				variant_pick = {};

			variants = btyJsonParse( variants.textContent );
			quantity = btyJsonParse( quantity.textContent );

			let price      = summary.querySelector( '.product-price' ),
				form       = summary.querySelector( '[data-type="add-to-cart-form"]' ),
				input      = form ? form.querySelector( '.quantity-input' ) : false,
				productId  = form ? form.querySelector( '[name="id"]' ) : false,
				productUrl = sl.getAttribute( 'data-url' ),
				button     = form ? form.querySelector( '[name="add"]' ) : false,
				pickup     = summary.querySelector( '.pickup-availability' ),
				sku        = summary.querySelector( '.product-sku .info-value' ),
				barcode    = summary.querySelector( '.product-barcode .info-value' ),
				statusNode = summary.querySelector( '.product-availability .product-stock-status' ),
				amount     = summary.querySelector( '.product-sale-label .sale-total .saved-number' );

			field.forEach(
				function( el ) {
					if ( 'radio' === el.type ) {
						if ( el.checked ) {
							variant_pick[ el.name ] = el.value;
						}
					} else {
						variant_pick[ el.name ] = el.value;
					}

					el.onchange = function() {
						variant_pick[ el.name ] = el.value;

						// Update stock status.
						btyUpdateStockStatusProduct( variants, sl );

						// When variant change.
						let selected   = btySelectedVariant( variant_pick, variants, window.btyMainSlider ),
							indexSlide = 0;

						if ( selected ) {
							// Update sku.
							if ( sku ) {
								sku.innerText = selected.sku;
							}

							// Update barcode.
							if ( barcode ) {
								barcode.innerText = selected.barcode;
							}

							// Update product variant ID.
							if ( productId ) {
								productId.value = selected.id;
							}

							// Update image on Featured product.
							if ( image && selected.featured_image ) {
								image.removeAttribute( 'srcset' );
								btyImageLoad( image, selected.featured_image.src, selected.featured_media.id, image.parentNode );
							}

							// Update product url, for product page only.
							if ( productUrl && gallery ) {
								window.history.replaceState({}, '', productUrl + '?variant=' + selected.id );
							}

							// Update stock status.
							if ( statusNode ) {
								let statusIcon = statusNode.querySelector( '.availability-icon' ),
									statusText = statusNode.querySelector( '.stock-status-text' );

								if ( selected.available ) {
									statusText.innerText = btyStrings.product.in_stock;

									statusIcon.innerHTML = btyGlobals.svg_tick;
									statusIcon.classList.add( 'icon-tick' );
									statusIcon.classList.remove( 'icon-close' );
									statusText.classList.remove( 'inventory--low' );
									statusText.classList.add( 'inventory--high' );
								} else {
									statusText.innerText = btyStrings.product.out_of_stock;

									statusIcon.innerHTML = btyGlobals.svg_close_normal;
									statusIcon.classList.remove( 'icon-tick' );
									statusIcon.classList.add( 'icon-close' );
									statusText.classList.remove( 'inventory--high' );
									statusText.classList.add( 'inventory--low' );
								}
							}

							// Update price.
							if ( price ) {
								price.innerHTML = btyPriceHtml( selected.price, selected.compare_at_price, selected.unit_price, selected.unit_price_measurement );
							}

							// Update saved price badge.
							if ( amount ) {
								if ( selected.compare_at_price ) {
									let amountTotal = 100 * ( selected.compare_at_price - selected.price ) / selected.compare_at_price;

									amount.innerHTML = amountTotal.toFixed( 2 );

									amount.closest( '.summary-item' ).classList.remove( 'hidden' );
								} else {
									amount.closest( '.summary-item' ).classList.add( 'hidden' );
								}
							}

							// Set max quantity.
							if ( input ) {
								let max = quantity.filter(
									function ( e ) {
										return e.id === selected.id;
									}
								);

								if ( max.length ) {
									let qty = max[0].qty;

									if ( qty > 0 ) {
										if ( Number( input.value ) > qty ) {
											input.value = qty;
										}

										input.setAttribute( 'max', qty );
									} else {
										input.removeAttribute( 'max' );
									}
								} else {
									input.removeAttribute( 'max' );
								}
							}

							// Check group image and scroll media
							indexSlide = btyHandleVariantMediaDisplay( selected, gallery );
						}

						// Update shop pay installments.
						let shopifyPayment = document.querySelector( 'shopify-payment-terms' );
						if ( shopifyPayment ) {
							shopifyPayment.setAttribute( 'variant-id', selected.id );
						}

						// Pickup availability, sold out products should not show the pickup availability.
						if ( pickup ) {
							if ( selected && selected.available ) {
								btyPickupAvailability( doc, productId.value, pickup );
							} else {
								pickup.innerHTML = '';
							}
						}

						// Update selected option.
						let selectedOption = el.closest( '.variant-field' ).querySelector( '.field-title .selected-value' );
						if ( selectedOption ) {
							selectedOption.innerText = el.value.trim();
						}

						// Update form state.
						if ( form ) {
							if ( selected && selected.available ) {
								form.classList.remove( 'disabled' );
							} else {
								form.classList.add( 'disabled' );
							}
						}

						// Update add to cart button text.
						if ( button ) {
							if ( selected ) {
								if ( selected.available ) {
									button.innerHTML = btyStrings.product.add_to_cart;
									button.classList.remove( 'disabled' );
								} else {
									button.innerHTML = btyStrings.product.out_of_stock;
									button.classList.add( 'disabled' );
								}
							} else {
								button.classList.add( 'disabled' );
								button.innerHTML = btyStrings.product.unavailable;
							}
						}

						// Add custo event.
						const customData  = {
							detail: {
								indexSlide: indexSlide,
								selected: selected
							}
						}

						const customEvent = new CustomEvent( 'product-variant-updated', customData );
						document.documentElement.dispatchEvent( customEvent );
					}
				}
			);

			// Update stock status, first load.
			btyUpdateStockStatusProduct( variants, sl );

			// Pickup availability, sold out products should not show the pickup availability.
			let firstSelected = btySelectedVariant( variant_pick, variants );
			if ( pickup && firstSelected && firstSelected.available ) {
				btyPickupAvailability( doc, firstSelected.id, pickup );
			}
		}
	);
}

// Quick view variant options.
function btyQuickViewVariants( doc = document, slider = {}) {
	let selector = doc.querySelector( '.product-variants' );
	if ( ! selector ) {
		return;
	}

	let variants = selector.parentNode.querySelector( '[data-product-variants]' ),
		quantity = selector.parentNode.querySelector( '[data-inventory-quantity]' ),
		field    = selector.querySelectorAll( '.field-value' );
	if ( ! field.length || ! variants ) {
		return;
	}

	let summary      = selector.parentNode.parentNode,
		variant_pick = {};

	variants = btyJsonParse( variants.textContent );
	quantity = btyJsonParse( quantity.textContent );

	field.forEach(
		function( el ) {
			if ( el.type !== 'radio' || el.checked ) {
				variant_pick[el.name] = el.value;
			}

			el.onchange = function() {
				variant_pick[ el.name ] = el.value;

				// Update stock status.
				btyUpdateStockStatusProduct( variants, selector );

				// When variant change.
				let selected = btySelectedVariant( variant_pick, variants, slider );
				if ( ! selected ) {
					return;
				}

				let image       = summary.querySelector( '.product-image' ),
					price       = summary.querySelector( '.product-price' ),
					labeled     = el.parentNode.querySelector( '.selected-value' ),
					form        = summary.querySelector( '[data-type="add-to-cart-form"]' ),
					input       = summary.querySelector( '.quantity-input' ),
					productId   = form ? form.querySelector( '[name="id"]' ) : false,
					productLink = summary.querySelector( '.product-url' ),
					productUrl  = selector ? selector.getAttribute( 'data-url' ) : false,
					button      = form ? form.querySelector( '[name="add"]' ) : false,
					stock       = summary.querySelector( '.product-stock-status' ),
					amount      = summary.querySelector( '.product-sale-label .sale-total' );

				// Update image.
				if ( image ) {
					const imageSrc = selected.featured_image?.src;

					const imgLazyObserver = new IntersectionObserver(
						function( entries, observer ) {
							entries.forEach(
								function( entry ) {
									const target   = entry.target;

									target.parentNode.classList.add( 'loading' );

									if ( entry.isIntersecting && imageSrc !== target.src ) {
										target.src = imageSrc;

										target.addEventListener(
											'load',
											function() {
												target.parentNode.classList.remove( 'loading' );
											}
										);
									}
								}
							);
						},
						{ rootMargin: '100px' }
					);

					imageSrc && imgLazyObserver.observe( image.querySelector( 'img' ));
				}

				// Update product url.
				if ( productUrl ) {
					if ( productLink ) {
						productLink.href = productUrl + '?variant=' + selected.id;
					}
				}

				// Current swatch label.
				let currentSwatch = el.closest( '.variant-field' ).querySelector( '.field-title .selected-value' );
				if ( currentSwatch ) {
					currentSwatch.innerText = el.getAttribute( 'data-value' ).trim();
				}

				// Update price.
				if ( price ) {
					price.innerHTML = btyPriceHtml( selected.price, selected.compare_at_price, selected.unit_price, selected.unit_price_measurement );
				}

				// Update selected value.
				if ( labeled ) {
					labeled.innerHTML = el.value;
				}

				// Update sale number badge.
				if ( amount ) {
					if ( selected.compare_at_price ) {
						let amountTotal = 100 * ( selected.compare_at_price - selected.price ) / selected.compare_at_price;

						amount.innerHTML = Math.round( amountTotal ) + '%';

						amount.parentNode.classList.remove( 'hidden' );
					} else {
						amount.parentNode.classList.add( 'hidden' );
					}
				}

				// Update product variant ID.
				if ( productId ) {
					productId.value = selected.id;
				}

				// Set max quantity.
				if ( input ) {
					const qty = quantity.find( e => e.id === selected.id )?.qty;
					if ( qty > 0 ) {
						if ( Number( input.value ) > qty ) {
							input.value = qty;
						}

						input.setAttribute( 'max', qty );
					} else {
						input.removeAttribute( 'max' );
					}
				}

				const available = selected.available;
				// Update stock status.
				if ( stock ) {
					stock.classList.toggle( 'inventory--high', available );
					stock.classList.toggle( 'inventory--low', ! available );
					stock.innerText = available ? btyStrings.product.in_stock : btyStrings.product.sold_out;
				}

				// Update form state.
				if ( form ) {
					form.classList.toggle( 'disabled', ! available);
				}

				// Update add to cart button text.
				if ( button ) {
					button.innerHTML = available ? btyStrings.product.add_to_cart : btyStrings.product.out_of_stock;
				}

				// Update shop pay installments.
				let shopifyPayment = summary.querySelector( 'shopify-payment-terms' );
				if ( shopifyPayment ) {
					shopifyPayment.setAttribute( 'variant-id', selected.id );
				}
			}
		}
	);

	// For first load.
	btySelectedVariant( variant_pick, variants, slider );
}

// Quick view.
function btyQuickView( doc = document ) {
	let box      = document.querySelector( '.quick-view' ),
		content  = box ? box.querySelector( '.quick-view-content' ) : false,
		selector = doc.querySelectorAll( '.product-quick-view' );
	if ( ! content || ! selector.length ) {
		return;
	}

	selector.forEach(
		function( el ) {
			el.onclick = function( e ) {
				e.preventDefault();
				let product_id = el.parentNode.getAttribute( 'data-id' );
				if ( product_id == box.getAttribute( 'data-id' )) {
					document.documentElement.classList.add( 'quick-view-open' );
					return;
				}

				document.documentElement.classList.add( 'quick-view-open' );
				box.classList.add( 'loading' );
				box.setAttribute( 'data-id', product_id );

				fetch( el.href + '?sections=quickview' )
					.then(
						function( r ) {
							if ( 200 !== r.status ) {
								console.log( 'Status Code: ' + r.status );
								throw r;
							}

							return r.json();
						}
					).then(
						function( res ) {
							content.innerHTML = btyGetSectionHtml( res.quickview );

							btyQuickViewVariants( box, {});
						}
					).catch(
						function( e ) {
							console.error( e );
						}
					).finally(
						function() {
							// Re-init share.
							btyProductShare();

							// Re-init quantity.
							btyQuantityButton();

							// Update lazy load image.
							btyAnimationImageLoad( box );

							// Re-init add to cart.
							btyAddToCart();

							// Remove loading.
							box.classList.remove( 'loading' );

							// Close popup.
							btyClosePopup( 'quick-view-open', box );
						}
					);
			}
		}
	);
}

// Update storage.
function btyUpdateStorage( key, array, id, type = 'local' ) {
	let storage = 'local' === type ? localStorage : sessionStorage;

	if ( ! storage.getItem( key )) {
		// Set key.
		storage.setItem( key, JSON.stringify( array ));
	} else if ( ! storage.getItem( key ).includes( id )) {
		// Add new id.
		let parseStorage = btyJsonParse( storage.getItem( key ));
		if ( ! parseStorage ) {
			return;
		}

		parseStorage.push( id );

		storage.setItem( key, JSON.stringify( parseStorage ));
	}
}

// Update variants on popup.
function btyVariantsPopup( doc = document, popup ) {
	let variants = doc.querySelectorAll( '.product-variants' );
	if ( ! popup || ! variants.length ) {
		return;
	}

	variants.forEach(
		function( el ) {
			let variantData = el.querySelector( '[data-product-variants]' ),
				productId   = el.getAttribute( 'data-id' ),
				select      = el.querySelectorAll( '.field-value' ),
				imageLink   = popup.querySelector( '.preview-image [data-id="' + productId + '"]' ),
				image       = imageLink ? imageLink.querySelector( 'img' ) : false,
				price       = popup.querySelector( '[data-id="' + productId + '"] .product-price' ),
				stock       = popup.querySelector( '[data-id="' + productId + '"] .product-stock-status' ),
				form        = popup.querySelector( '.form-add-to-cart[data-id="' + productId + '"]' ),
				inputId     = form ? form.querySelector( '[name="id"]' ) : false,
				variantPick = {};

			if ( ! select.length ) {
				return;
			}

			variantData = variantData ? btyJsonParse( variantData.textContent ) : false;
			if ( ! variantData ) {
				return;
			}

			// Foreach.
			select.forEach(
				function( sel ) {
					variantPick[ sel.name ] = sel.value;

					// Change event.
					sel.onchange = function() {
						variantPick[ sel.name ] = sel.value;

						let selected = btySelectedVariant( variantPick, variantData );

						// Update image.
						if ( image ) {
							image.removeAttribute( 'srcset' );
							btyImageLoad( image, selected.featured_media.preview_image.src, selected.featured_media.id, image.parentNode );
						}

						// Update current variant id.
						if ( inputId ) {
							inputId.value = selected.id;
						}

						// Update stock status, add to cart button text.
						if ( selected.available ) {
							if ( form ) {
								form.classList.remove( 'disabled' );
							}

							if ( stock ) {
								stock.innerHTML = btyStrings.product.in_stock;
								stock.classList.remove( 'inventory--low' );
								stock.classList.add( 'inventory--high' );
							}
						} else {
							if ( form ) {
								form.classList.add( 'disabled' );
							}

							if ( stock ) {
								stock.innerHTML = btyStrings.product.out_of_stock;
								stock.classList.remove( 'inventory--high' );
								stock.classList.add( 'inventory--low' );
							}
						}

						// Update price.
						if ( price ) {
							price.innerHTML = btyPriceHtml( selected.price, selected.compare_at_price );
						}
					}
				}
			);

			// First matching variants.
			let firstSelected = btySelectedVariant( variantPick, variantData );
			if ( firstSelected.available ) {
				if ( form ) {
					form.classList.remove( 'disabled' );
				}

				if ( stock ) {
					stock.innerHTML = btyStrings.product.in_stock;
					stock.classList.remove( 'inventory--low' );
					stock.classList.add( 'inventory--high' );
				}
			} else {
				if ( form ) {
					form.classList.add( 'disabled' );
				}

				if ( stock ) {
					stock.innerHTML = btyStrings.product.out_of_stock;
					stock.classList.remove( 'inventory--high' );
					stock.classList.add( 'inventory--low' );
				}
			}

			if ( price ) {
				price.innerHTML = btyPriceHtml( firstSelected.price, firstSelected.compare_at_price );
			}
		}
	);
}

// Open side cart.
function btySideCart() {
	let buttons  = document.querySelectorAll( '.action-cart' ),
		sideCart = document.querySelector( '.side-cart' );
	if ( ! buttons.length || ! sideCart ) {
		return;
	}

	buttons.forEach(
		function( el ) {
			el.onclick = function( e ) {
				if ( el.classList.contains( 'open-cart' )) {
					return;
				}

				e.preventDefault();

				document.documentElement.classList.add( 'side-cart-open' );

				btyClosePopup( 'side-cart-open', sideCart );

				let closeButton = sideCart.querySelector( '.side-cart-close' );
				if ( closeButton ) {
					setTimeout(
						function() {
							closeButton.focus();
						},
						400
					);
				}
			}
		}
	);
}

// Get fetch config.
function btyFetchConfig( type = 'json' ) {
	return {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/' + type
		}
	};
}

// ValidateEmail.
function btyValidateEmail( selector, focus = true ) {
	if ( ! selector || selector.disabled ) {
		return;
	}

	let mailformat = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;

	if ( selector.value.match( mailformat )) {
		selector.classList.remove( 'email-invalid' );
	} else {
		selector.classList.add( 'email-invalid' );

		if ( focus ) {
			selector.focus();
		}
	}
}

// Recipient form.
function btyRecipientForm( doc = document ) {
	let wrapper = doc.querySelector( '.recipient-form-wrapper' ),
		input   = wrapper ? wrapper.querySelector( '.recipient-checkbox-label input[type="checkbox"]' ) : false,
		fields  = wrapper ? wrapper.querySelector( '.recipient-fields' ) : false;

	if ( ! input || ! fields ) {
		return;
	}

	let hiddenControlField = fields.parentNode.querySelector( '[type="hidden"][name="properties[__shopify_send_gift_card_to_recipient]"]' ),
		offsetProperty     = fields.parentNode.querySelector( '[name="properties[__shopify_offset]"]' );
	if ( hiddenControlField ) {
		hiddenControlField.disabled = true;
	}

	if ( offsetProperty ) {
		offsetProperty.value = new Date().getTimezoneOffset().toString();
	}

	let inputFields = fields.parentNode.querySelectorAll( '.field__input' );
	if ( ! inputFields.length ) {
		return;
	}

	function init() {
		if ( input.checked ) {
			fields.classList.add( 'open' );

			inputFields.forEach(
				function( el ) {
					el.disabled = false;
				}
			);
		} else {
			fields.classList.remove( 'open' );

			inputFields.forEach(
				function( el ) {
					el.disabled = true;
				}
			);

			let emailInput = fields.querySelector( '.properties-recipient-email' ),
				message    = wrapper.parentNode.parentNode.querySelector( '.product-warning' );

			if ( emailInput ) {
				emailInput.classList.remove( 'email-invalid' );
			}

			if ( message ) {
				message.innerHTML = '';
			}
		}
	}

	input.onchange = init;
	init();
}

// Ajax add to cart.
function btyAddToCart( doc = document ) {
	let buttons = doc.querySelectorAll( '.add-to-cart-button' );
	if ( ! buttons.length ) {
		return;
	}

	// Register dom html need an update when the response available.
	let modules = [
		{
			node: '.side-cart-inner', // DOM html selector.
			section: 'side-cart', // Section name.
			selector: '.side-cart-inner' // Ajax response selector.
	},
		{
			section: 'cart-count'
	}
	];

	buttons.forEach(
		function( button ) {
			button.onclick = function( e ) {
				// Return user click Tab button then Enter.
				if ( button.classList.contains( 'disabled' )) {
					e.preventDefault();

					return;
				}

				if ( 'A' === button.tagName.toUpperCase()) {
					return;
				}

				e.preventDefault();

				if ( button.classList.contains( 'add-product-variants' ) && window.matchMedia( '(max-width: 767px)' ).matches ) {
					return;
				}

				button.classList.add( 'loading' );

				let form     = button.closest( '[data-type="add-to-cart-form"]' ),
					formData = new FormData( form ),
					warning  = form.parentNode.querySelector( '.product-warning' ),
					config   = btyFetchConfig( 'javascript' );

				config.headers['X-Requested-With'] = 'XMLHttpRequest';
				delete config.headers['Content-Type'];

				formData.append( 'sections', modules.map( (s) => s.section ));
				config.body = formData;

				// Fetch data.
				fetch( btyGlobals.cart_add_url, config )
					.then(
						function( r ) {
							return r.json();
						}
					).then(
						function( res ) {
							btyValidateEmail( form.querySelector( '.properties-recipient-email' ));

							if ( warning ) {
								warning.innerHTML = '';
							}

							if ( res.status && warning ) {
								warning.innerHTML = btyGlobals.svg_warning + ( res.message || res.description );

								return;
							}

							// Update html.
							btyUpdateHtml( res.sections, modules );

							// Update cart items count.
							btyCartItemCount( btyGetSectionHtml( res.sections['cart-count'], '.shopify-section' ));

							setTimeout(
								function() {
									// Show side cart.
									document.documentElement.classList.add( 'side-cart-open' );
								}
							);
						}
					).catch(
						function( e ) {
							console.error( e );
						}
					).finally(
						function() {
							// Re-init quantity.
							btyQuantityButton();

							// Re-init update quantity button.
							btyUpdateProductQuantity();

							// Remove loading animation.
							button.classList.remove( 'loading' );

							// Remove loading animation for quick add.
							let quickAddLoading = doc.querySelector( '.quick-add-box .field-item.loading' );
							if ( quickAddLoading ) {
								quickAddLoading.classList.remove( 'loading' );
							}

							document.documentElement.classList.remove( 'quick-view-open' );
							btyClosePopup( 'side-cart-open', document.querySelector( '.side-cart' ));

							// Focus cart drawer.
							let sideCart    = document.querySelector( '.side-cart' ),
								closeButton = sideCart ? sideCart.querySelector( '.side-cart-close' ) : false;
							if ( closeButton ) {
								setTimeout(
									function() {
										closeButton.focus();
									},
									400
								);
							}
						}
					);
			}
		}
	);
}

// Check product inventory.
function btyProductInventory( doc = document, variants = {}) {
	let variant   = {},
		quickAdds = doc.querySelectorAll( '.quick-add-box .field-swatch .selected' ),
		swatches  = doc.querySelector( '.product-swatches .selected' );
	if ( ! quickAdds.length && ! swatches ) {
		return;
	}

	let selected = btySelectedVariant( variant, variants );
}

/**
 * Update stock status
 *
 * @param  object variants The product variants.
 * @param  node   siblings The product card.
 */
function btyUpdateStockStatus( variants, card ) {
	let getSelected = card.querySelectorAll( '.field-swatch .selected' ),
		swatch      = card.querySelector( '.product-swatches .swatch.selected' );
	if ( getSelected.length ) {
		getSelected.forEach(
			function( el ) {
				let current = {};

				// Check color variant.
				if ( swatch ) {
					current[ swatch.getAttribute( 'data-name' ) ] = swatch.getAttribute( 'data-value' );
				}

				// Get siblings to save 2 fix variant, ex: ABC ABD ABX ABY.
				let siblings = btySiblings(
					el.parentNode,
					function( e ) {
						return e.classList.contains( 'field-swatch' );
					}
				);

				if ( siblings.length ) {
					siblings.forEach(
						function( si ) {
							let siSelected = si.querySelector( '.selected' );
							if ( ! siSelected ) {
								return;
							}

							current[ siSelected.getAttribute( 'data-name' ) ] = siSelected.getAttribute( 'data-value' );
						}
					);
				}

				// Update stock status on quick add.
				let indexSelected = el.parentNode.querySelectorAll( '.field-item' );
				if ( indexSelected.length ) {
					indexSelected.forEach(
						function( is ) {
							current[ is.getAttribute( 'data-name' ) ] = is.getAttribute( 'data-value' );

							let selected = btySelectedVariant( current, variants );
							if ( selected ) {
								if ( selected.available ) {
									is.classList.remove( 'soldout' );
								} else {
									is.classList.add( 'soldout' );
								}
							} else {
								is.classList.add( 'soldout' );
							}
						}
					);
				}
			}
		);
	}

	if ( swatch ) {
		swatch.parentNode.querySelectorAll( '.swatch' ).forEach(
			function( el ) {
				let current = {};

				if ( getSelected.length ) {
					getSelected.forEach(
						function( si ) {
							current[ si.getAttribute( 'data-name' ) ] = si.getAttribute( 'data-value' );
						}
					);
				}

				current[ el.getAttribute( 'data-name' ) ] = el.getAttribute( 'data-value' );

				let selected = btySelectedVariant( current, variants );
				if ( selected ) {
					if ( selected.available ) {
						el.classList.remove( 'soldout' );
					} else {
						el.classList.add( 'soldout' );
					}
				} else {
					el.classList.add( 'soldout' );
				}
			}
		);
	}
}

/**
 * Update stock status for product page
 *
 * @param  object variants The product variants.
 * @param  node   siblings The product card.
 */
function btyUpdateStockStatusProduct( variants, element ) {
	let getSelected = element.querySelectorAll( '.variant-field .field-value:checked' );
	if ( ! getSelected.length ) {
		return;
	}

	getSelected.forEach(
		function( el ) {
			let current = {};

			// Get siblings to save 2 fix variant, ex: ABC ABD ABX ABY.
			let siblings = btySiblings(
				el.closest( '.variant-field' ),
				function( e ) {
					return e.classList.contains( 'variant-field' );
				}
			);

			if ( siblings.length ) {
				siblings.forEach(
					function( si ) {
						let siSelected = si.querySelector( '.field-value:checked' );
						if ( ! siSelected ) {
							return;
						}

						current[ siSelected.getAttribute( 'name' ) ] = siSelected.getAttribute( 'value' );
					}
				);
			}

			// Update stock status on quick add.
			let indexSelected = el.closest( '.variant-field' ).querySelectorAll( '.field-value' );
			if ( indexSelected.length ) {
				indexSelected.forEach(
					function( is ) {
						let inputId = is.getAttribute( 'id' ),
							label   = inputId ? is.parentNode.querySelector( 'label[for="' + inputId + '"]' ) : false;

						if ( ! label ) {
							return;
						}

						current[ is.getAttribute( 'name' ) ] = is.getAttribute( 'value' );

						let selected = btySelectedVariant( current, variants );
						if ( selected ) {
							if ( selected.available ) {
								label.classList.remove( 'soldout' );
							} else {
								label.classList.add( 'soldout' );
							}
						} else {
							label.classList.add( 'soldout' );
						}
					}
				);
			}
		}
	);
}

// Quick add.
function btyQuickAdd( doc = document ) {
	let selectors = doc.querySelectorAll( '.quick-add .field-item' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			el.onclick = function() {
				let form   = el.closest( '[data-type="add-to-cart-form"]' ),
					submit = form ? form.querySelector( '[type="submit"]' ) : false,
					card   = form.closest( '.product-card' );
				if ( ! card || ! submit ) {
					return;
				}

				// Highlight selected.
				if ( ! el.classList.contains( 'selected' )) {
					let oldActive = el.parentNode.querySelector( '.field-item.selected' );
					if ( oldActive ) {
						oldActive.classList.remove( 'selected' );
					}

					el.classList.add( 'selected' );
				}

				// Update swatch.
				let variants  = form.querySelector( '[data-product-variants]' ),
					productId = form.querySelector( '[name="id"]' );

				if ( productId && variants ) {
					// Json parse.
					variants = btyJsonParse( variants.textContent );

					let variant_pick     = {},
						quickAddSelected = card.querySelectorAll( '.quick-add-box .selected' );

					if ( quickAddSelected.length ) {
						quickAddSelected.forEach(
							function( qas ) {
								variant_pick[ qas.getAttribute( 'data-name' ) ] = qas.getAttribute( 'data-value' );
							}
						);
					}

					// Get option from Swatch.
					let selectedSwatch = card.querySelector( '.product-swatches .swatch.selected' );
					if ( selectedSwatch ) {
						variant_pick[ selectedSwatch.getAttribute( 'data-name' ) ] = selectedSwatch.getAttribute( 'data-value' );
					}

					// Found selected variant.
					let selected = btySelectedVariant( variant_pick, variants );
					if ( selected ) {
						productId.value = selected.id;

						// Update stock status.
						btyUpdateStockStatus( variants, card );

						// Update product price.
						let price = card.querySelector( '.product-price' );
						if ( price ) {
							price.innerHTML = btyPriceHtml( selected.price, selected.compare_at_price, selected.unit_price, selected.unit_price_measurement );
						}

						if ( selected.available ) {
							el.classList.add( 'loading' );

							submit.click();
						} else {
							alert( 'This item is currently out of stock.' );

							return;
						}
					}
				}
			}
		}
	);
}

// Swatch list.
function btySwatch( doc = document ) {
	let swatch = doc.querySelectorAll( '.product-card .swatch' );
	if ( ! swatch.length ) {
		return;
	}

	swatch.forEach(
		function( el ) {
			el.onclick = function( e ) {
				e.preventDefault();

				if ( el.classList.contains( 'selected' )) {
					return;
				}

				let swatchValue = el.parentNode.querySelector( '.swatch-selected' );
				if ( swatchValue ) {
					swatchValue.innerText = el.innerText.trim();
				}

				// Get wrapper.
				let card    = el.closest( '.product-card' ),
					wrapper = card.querySelector( '.product-media-wrap' );
				if ( ! wrapper ) {
					return;
				}

				// Get product image.
				let image = wrapper.querySelector( '.product-image img' );

				// Handle loading image.
				const imageLoadHandle = function( dataSrc, main ) {
					if ( ! image ) {
						return;
					}

					let newImage     = new Image(),
						variationImg = el.getAttribute( 'data-key' ) || false,
						mainImg      = image.getAttribute( 'data-key' ) || false;

					newImage.crossOrigin = 'anonymous';

					// Main image.
					if ( main ) {
						variationImg = mainImg;
					}

					// Check local storage first.
					if ( sessionStorage.getItem( variationImg )) {
						image.src = sessionStorage.getItem( variationImg );
						image.removeAttribute( 'srcset' );
						return;
					}

					// Save main product image first.
					if ( 'string' !== typeof( image.getAttribute( 'data-loaded' )) && mainImg ) {
						let mainImage = new Image();

						mainImage.crossOrigin = 'anonymous';

						mainImage.onload = function() {
							let renderMainImage = btyGetImageSrc( mainImage );

							if ( mainImg ) {
								sessionStorage.setItem( mainImg, renderMainImage );
							}

							image.setAttribute( 'data-loaded', '' );
						}

						mainImage.src = image.src;
					}

					// Add loading animation.
					wrapper.classList.add( 'loading' );

					// Handle.
					newImage.onload = function() {
						wrapper.classList.remove( 'loading' );
						let renderImage = btyGetImageSrc( newImage );

						// Set final image src.
						image.src = renderImage;
						image.removeAttribute( 'srcset' );

						// Save image to local storage.
						if ( variationImg ) {
							sessionStorage.setItem( variationImg, renderImage );
						}
					}

					newImage.onerror = function() {
						wrapper.classList.remove( 'loading' );
					}

					// Set image src for 'newImage.onload' function handle.
					newImage.src = dataSrc;
				}

				// Get old selected.
				let oldActive = card.querySelector( '.swatch.selected' );
				if ( oldActive ) {
					oldActive.classList.remove( 'selected' );
				}

				// Set swatch selected.
				el.classList.add( 'selected' );

				// Update product image src.
				if ( image ) {
					let src = el.getAttribute( 'data-src' ) || '';
					if ( src && src != image.src ) {
						imageLoadHandle( src );
					}
				}

				// Update swatch.
				let form      = el.closest( '.product-card' ).querySelector( '[data-type="add-to-cart-form"]' ),
					addToCart = form ? form.querySelector( '.add-to-cart-button' ) : false,
					variants  = form ? form.querySelector( '[data-product-variants]' ) : false,
					productId = form ? form.querySelector( '[name="id"]' ) : false;

				if ( productId && variants ) {
					let variant_pick = {},
						dataName     = el.getAttribute( 'data-name' ),
						dataValue    = el.getAttribute( 'data-value' );

					variants = btyJsonParse( variants.textContent );

					variant_pick[ dataName ] = dataValue;

					// Update stock status.
					btyUpdateStockStatus( variants, card );

					// Get quick add value.
					let quickAdd = card.querySelectorAll( '.quick-add .field-item.selected' );
					if ( quickAdd.length ) {
						quickAdd.forEach(
							function( qa ) {
								variant_pick[ qa.getAttribute( 'data-name' ) ] = qa.getAttribute( 'data-value' );
							}
						);
					}

					let selected = btySelectedVariant( variant_pick, variants );
					if ( selected ) {
						productId.value = selected.id;

						// Update add to cart button status.
						if ( addToCart ) {
							if ( selected.available ) {
								addToCart.classList.remove( 'disabled' );
							} else {
								addToCart.classList.add( 'disabled' );
							}
						}
					}
				}
			}
		}
	);
}

// Product tabs.
function btyProductTabs( doc = document, event = {}) {
	let selectors = doc.querySelectorAll( '.tabs .tab-head' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let wrap  = el.closest( '.tabs' ),
				index = el.getAttribute( 'data-index' ),
				tab   = wrap.querySelector( '.tab-content[data-index="' + index + '"]' );

			if ( ! tab ) {
				return;
			}

			// For design mode.
			if ( Shopify.designMode && Object.keys( event ).length ) {
				let currentTab = doc.querySelector( '.tab-head[data-id="' + event.detail.blockId + '"]' );
				if ( currentTab ) {
					currentTab.click();
				}
			}

			el.addEventListener(
				'click',
				function() {
					if ( el.classList.contains( 'active' )) {
						return;
					}

					let navActived = wrap.querySelector( '.tab-head.active' ),
						tabActived = wrap.querySelector( '.tab-content.active' );
					if ( navActived ) {
						navActived.classList.remove( 'active' );
					}

					if ( tabActived ) {
						tabActived.classList.remove( 'active' );
					}

					el.classList.add( 'active' );
					tab.classList.add( 'active' );
				}
			);
		}
	);

	let dropdown = doc.querySelectorAll( '.dropdown-content li' );
	if ( dropdown.length ) {
		dropdown.forEach(
			function( el ) {
				el.addEventListener(
					'click',
					function() {
						let parent  = el.closest( '.tabs' ),
							current = parent.querySelector( '.tab-head[data-index="' + el.getAttribute( 'data-index' ) + '"]' );
						if ( ! current ) {
							return;
						}

						current.click();
					}
				);
			}
		);
	}
}

// Animation for accordion.
class btyAccordion {
	constructor( el, toggle = 'summary', view = '.details-content' ) {
		const accordion = this;

		accordion.el      = el;
		accordion.summary = el.querySelector( toggle );
		accordion.content = el.querySelector( view );

		accordion.animation   = null;
		accordion.isClosing   = false;
		accordion.isExpanding = false;

		if ( ! accordion.content ) {
			return;
		}

		accordion.summary.addEventListener(
			'click',
			function( e ) {
				accordion.onClick( e );
			}
		);
	}

	onClick(e) {
		e.preventDefault();
		const accordion = this;

		accordion.el.style.overflow = 'hidden';

		let aria = accordion.summary.getAttribute( 'aria-expanded' );

		if ( accordion.isClosing || ! accordion.el.open ) {
			accordion.open();

			if ( aria ) {
				accordion.summary.setAttribute( 'aria-expanded', 'true' );
			}
		} else if ( accordion.isExpanding || accordion.el.open ) {
			accordion.shrink();

			if ( aria ) {
				accordion.summary.setAttribute( 'aria-expanded', 'false' );
			}
		}
	}

	shrink() {
		const accordion = this;

		accordion.isClosing = true;

		let startHeight = accordion.el.offsetHeight + 'px',
			endHeight   = accordion.summary.offsetHeight + 'px';

		if ( accordion.animation ) {
			accordion.animation.cancel();
		}

		accordion.animation = accordion.el.animate(
			{
				height: [startHeight, endHeight]
			},
			{
				duration: 200,
				easing: 'ease-out'
			}
		);

		accordion.animation.onfinish = function() {
			accordion.onAnimationFinish( false );
		}

		accordion.animation.oncancel = function() {
			accordion.isClosing = false;
		}
	}

	open() {
		const accordion = this;

		accordion.el.style.height = accordion.el.offsetHeight + 'px';
		accordion.el.open         = true;

		window.requestAnimationFrame(
			function() {
				accordion.expand();
			}
		);
	}

	expand() {
		const accordion = this;

		accordion.isExpanding = true;

		let startHeight = accordion.el.offsetHeight + 'px',
			endHeight   = ( accordion.summary.offsetHeight + accordion.content.offsetHeight ) + 'px';

		if (accordion.animation) {
			accordion.animation.cancel();
		}

		accordion.animation = accordion.el.animate(
			{
				height: [startHeight, endHeight]
			},
			{
				duration: 200,
				easing: 'ease-out'
			}
		);

		accordion.animation.onfinish = function() {
			accordion.onAnimationFinish( true );
		}

		accordion.animation.oncancel = function() {
			accordion.isExpanding = false;
		}
	}

	onAnimationFinish(open) {
		const accordion = this;

		accordion.el.open     = open;
		accordion.animation   = null;
		accordion.isClosing   = false;
		accordion.isExpanding = false;

		accordion.el.removeAttribute( 'style' );
	}
}

function btyAccordionHandle( doc = document ) {
	let details = doc.querySelectorAll( 'details' );
	if ( ! details.length ) {
		return;
	}

	details.forEach(
		function( el ) {
			// No apply effect for motion reduce node.
			if ( el.hasAttribute( 'data-motion-reduce' )) {
				return;
			}

			new btyAccordion( el );
		}
	);
}

// Footer accordion.
function btyFooterAccordion( doc = document ) {
	let headings = doc.querySelectorAll( '.ft-block-heading' );
	if ( ! headings.length ) {
		return;
	}

	headings.forEach(
		function( el ) {
			let block = el.parentNode.querySelector( '.ft-block-content' );
			if ( ! block ) {
				return;
			}

			if ( window.matchMedia( '(min-width: 768px)' ).matches ) {
				el.parentNode.classList.remove( 'open' );
				block.removeAttribute( 'style' );

				return;
			}

			el.onclick = function() {
				if ( window.matchMedia( '(min-width: 768px)' ).matches ) {
					return;
				}

				if ( 'none' === window.getComputedStyle( block ).display ) {
					btySlideDown( block );
					el.parentNode.classList.add( 'open' );
				} else {
					btySlideUp( block );
					el.parentNode.classList.remove( 'open' );
				}
			}
		}
	);
}

// Video.
function btyVideo( doc = document ) {
	let selectors = doc.querySelectorAll( '.video-item' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let imageWrapper = el.querySelector( '.video-image-wrapper' );

			if ( ! imageWrapper ) {
				return;
			}

			imageWrapper.addEventListener(
				'click',
				function() {
					let iframe = el.querySelector( 'iframe' ),
						video  = el.querySelector( 'video' );

					if ( iframe ) {
						iframe.src = iframe.getAttribute( 'data-src' );

						btyMediaAction( el, 'play' );
					}

					if ( video ) {
						video.setAttribute( 'data-ready', '' );

						let playPromise = video.play();
						if ( undefined !== playPromise ) {
							playPromise.then(
								function() {}
							).catch(
								function( error ) {
									console.log( error );
								}
							);
						}
					}
				}
			);
		}
	);
}

class VideoSection extends HTMLElement {
	constructor() {
		super();

		this.background = true;

		this.init();
	}

	init() {
		this.parentSelector = this.dataset.parent || '.background-video-item';
		this.parent = this.closest(this.parentSelector);

		switch(this.dataset.type) {
			case 'youtube':
				this.initYoutubeVideo();
				break;

			case 'vimeo':
				this.initVimeoVideo();
				break;

			case 'mp4':
				this.initMp4Video();
				break;
		}
	}

	initYoutubeVideo() {
		this.setAsLoading();
		this.loadScript('youtube').then(this.setupYoutubePlayer.bind(this));
	}

	initVimeoVideo() {
		this.setAsLoading();
		this.loadScript('vimeo').then(this.setupVimeoPlayer.bind(this));
	}

	initMp4Video() {
		const player = this.querySelector('video');

		if (player) {
			const promise = player.play();

			// Edge does not return a promise (video still plays)
			if (typeof promise !== 'undefined') {
				promise.then(function() {
					// playback normal
				}).catch(function() {
					player.setAttribute('controls', '');
				});
			}
		}
	}

	loadScript(videoType) {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			document.body.appendChild(script);
			script.onload = resolve;
			script.onerror = reject;
			script.async = true;
			script.src = videoType === 'youtube' ? '//www.youtube.com/iframe_api' : '//player.vimeo.com/api/player.js';
		});
	}

	setAsLoading() {
		this.parent.setAttribute('loading', true);
	}

	setAsLoaded() {
		this.parent.removeAttribute('loading');
		this.parent.setAttribute('loaded', true);
	}

	setupYoutubePlayer() {
		const videoId = this.dataset.videoId;

		const playerInterval = setInterval(() => {
			if (window.YT) {
				window.YT.ready(() => {
					const element = document.createElement('div');
					this.appendChild(element);

					this.player = new YT.Player(element, {
						videoId: videoId,
						playerVars: {
							showinfo: 0,
							controls: !this.background,
							fs: !this.background,
							rel: 0,
							height: '100%',
							width: '100%',
							iv_load_policy: 3,
							html5: 1,
							loop: 1,
							playsinline: 1,
							modestbranding: 1,
							disablekb: 1,
							mute: 1
						},
						events: {
							onReady: this.onYoutubeReady.bind(this),
							onStateChange: this.onYoutubeStateChange.bind(this)
						}
					});
					clearInterval(playerInterval);
				});
			}
		}, 50);
	}

	onYoutubeReady() {
		// iframe once YT loads.
		this.iframe = this.querySelector( 'iframe' );
		this.iframe.setAttribute( 'tabindex', '-1' );

		if ( this.background ) {
			this.player.mute() ? this.player.mute() : null;
		}

		if ( 'function' === typeof( this.player.playVideo )) {
			this.player.playVideo();
		}

		this.setAsLoaded();

		// pause when out of view
		const observer = new IntersectionObserver(
			(entries, _observer) => {
				entries.forEach(
					entry => {
						entry.isIntersecting ? this.youtubePlay() : this.youtubePause();
					}
				);
			},
			{
				rootMargin: '100px'
			}
		);

		observer.observe(this.iframe);
	}

	onYoutubeStateChange(event) {
		switch (event.data) {
			case -1: // unstarted
				// Handle low power state on iOS by checking if
				// video is reset to unplayed after attempting to buffer
				if (this.attemptedToPlay) {
					this.setAsLoaded();
				}
				break;
			case 0: // ended, loop it
				this.youtubePlay();
				break;
			case 1: // playing
				this.setAsLoaded();
				break;
			case 3: // buffering
				this.attemptedToPlay = true;
				break;
		}
	}

	youtubePlay() {
		if ( this.background && this.player && 'function' === typeof( this.player.playVideo )) {
			this.player.playVideo();
		}
	}

	youtubePause() {
		if ( this.background && this.player && 'function' === typeof( this.player.playVideo )) {
			this.player.pauseVideo();
		}
	}

	setupVimeoPlayer() {
		const videoId = this.dataset.videoId;

		const playerInterval = setInterval(
			() => {
				if ( window.Vimeo ) {
					this.player = new Vimeo.Player(this, {
						id: videoId,
						autoplay: true,
						autopause: false,
						background: this.background,
						controls: !this.background,
						loop: true,
						height: '100%',
						width: '100%'
					});

					this.player.ready().then(this.onVimeoReady.bind(this));

					clearInterval( playerInterval );
				}
			},
			50
		);
	}

	onVimeoReady() {
		this.iframe = this.querySelector( 'iframe' );
		this.iframe.setAttribute( 'tabindex', '-1' );

		this.background && this.player.setMuted(true);

		this.setAsLoaded();

		// pause when out of view
		const observer = new IntersectionObserver(
			(entries, _observer) => {
				entries.forEach(
					entry => {
						if ( entry.isIntersecting ) {
							this.vimeoPlay();
						} else {
							this.vimeoPause();
						}
					}
				);
			},
			{rootMargin: '0px 0px 50px 0px'}
		);

		observer.observe( this.iframe );
	}

	vimeoPlay() {
		if ( this.background && this.player && 'function' === typeof( this.player.play )) {
			this.player.play();
		}
	}

	vimeoPause() {
		if ( this.background && this.player && 'function' === typeof( this.player.play )) {
			this.player.pause();
		}
	}
}
customElements.define( 'video-section', VideoSection );

// Video background.
function btyBackgroundVideo( doc = document ) {
	let backgroundVideo = doc.querySelectorAll( '.background-video-item' );
	if ( ! backgroundVideo.length ) {
		return;
	}

	const videoLazyObserver = new IntersectionObserver(
		function( entries, observer ) {
			entries.forEach(
				function( entry ) {
					let iframe = entry.target.querySelector( 'iframe' ),
						video  = entry.target.querySelector( 'video' );

					if ( entry.isIntersecting ) {
						if ( iframe ) {
							if ( iframe.hasAttribute( 'data-src' )) {
								iframe.src = iframe.getAttribute( 'data-src' );
								iframe.removeAttribute( 'data-src' );
							}

							btyMediaAction( entry.target, 'play' );
						} else if ( video ) {
							let playPromise = video.play();
							if ( playPromise ) {
								playPromise.catch( console.error );
							}
						}
					} else {
						btyMediaAction( entry.target, 'pause' );
					}
				}
			);
		}, { threshold: 0.1 }
	);

	backgroundVideo.forEach(
		function( item ) {
			videoLazyObserver.observe( item );

			let togglePopup = item.parentNode.querySelector( '.toggle-popup-bg-video' );
			if ( ! togglePopup || togglePopup.hasAttribute( 'href' )) {
				return;
			}

			togglePopup.addEventListener(
				'click',
				function() {
					let section = item.closest( '.video-background-section' ),
						popup   = section ? section.querySelector( '.background-video-popup' ) : false,
						iframe  = popup ? popup.querySelector( 'iframe' ) : false,
						video   = popup ? popup.querySelector( 'video' ) : false;

					if ( ! popup ) {
						return;
					}

					document.documentElement.classList.add( 'bg-video-popup-open' );
					btyClosePopup( 'bg-video-popup-open', popup );
					item.parentNode.classList.add( 'active' );
					document.addEventListener(
						'theme-popup-close',
						function() {
							item.parentNode.classList.remove( 'active' );
						}
					);

					if ( iframe ) {
						if ( iframe.hasAttribute( 'data-src' )) {
							iframe.src = iframe.getAttribute( 'data-src' );
							iframe.removeAttribute( 'data-src' );
						}

						btyMediaAction( popup, 'play' );
					} else if ( video ) {
						video.setAttribute( 'data-ready', '' );

						let playPromise = video.play();
						if ( playPromise ) {
							playPromise.catch( console.error );
						}
					}
				}
			);
		}
	);
}

// Action for media.
function btyMediaAction( doc = document, type = 'pause' ) {
	let video = doc.querySelectorAll( '.js-youtube, .js-vimeo, video' );
	if ( ! video.length ) {
		return;
	}

	let youtubeFunc = 'stopVideo';

	switch ( type ) {
		case 'pause':
			youtubeFunc = 'pauseVideo';
			break;
		case 'play':
			youtubeFunc = 'playVideo';
			break;
		case 'stop':
			youtubeFunc = 'stopVideo';
			break;
	}

	if ( video.length ) {
		video.forEach(
			function( vd ) {
				if ( 'video' === vd.tagName.toLowerCase()) {
					let playPromise = vd.play();

					if ( 'pause' === type ) {
						if ( undefined !== playPromise ) {
							playPromise.then(
								function() {
									vd.pause();
								}
							).catch(
								function( error ) {
									console.log( error );
								}
							);
						}
					} else {
						if ( undefined !== playPromise ) {
							playPromise.then(
								function() {
									vd.play();
								}
							).catch(
								function( error ) {
									console.log( error );
								}
							);
						}
					}
				} else if ( vd.classList.contains( 'js-youtube' )) {
					vd.contentWindow.postMessage( '{"event":"command","func":"' + youtubeFunc + '","args":""}', '*' );
				} else if ( vd.classList.contains( 'js-vimeo' )) {
					vd.contentWindow.postMessage( '{"method":"' + type + '"}', '*' );
				}
			}
		);
	}
}

// Address box section.
function btyAddress( doc =document ) {
	let selectors = doc.querySelectorAll( '.address-box .address-summary' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let items = el.querySelectorAll( '.summary-item' );
			if ( items.length < 2 ) {
				return;
			}

			items.forEach(
				function( im, index ) {
					im.addEventListener(
						'click',
						function( e ) {
							e.preventDefault();

							const mobile = window.matchMedia( '(max-width: 767px)' ).matches;

							let oldActive = el.querySelector( '.summary-item.active' ),
								subBox    = im.querySelector( '.address-sub' ),
								image     = el.parentNode.querySelector( '.address-content-inner' );

							if ( im.classList.contains( 'active' )) {
								return;
							}

							if ( oldActive ) {
								let oldSubBox = oldActive.querySelector( '.address-sub' );
								if ( oldSubBox && mobile ) {
									btySlideUp( oldSubBox );
								}
								oldActive.classList.remove( 'active' );
							}

							if ( image ) {
								image.setAttribute( 'data-level', index );
							}

							im.classList.add( 'active' );

							if ( subBox && mobile ) {
								btySlideDown( subBox );
							}
						}
					);
				}
			);
		}
	);
}

// Pickup availability.
function btyPickupAvailability( doc = document, variant_id = false, pickup = false ) {
	let panel = document.querySelector( '.pickup-availability-panel' );
	if ( ! pickup || ! panel ) {
		return;
	}

	fetch( '/variants/' + variant_id + '?section_id=pickup-availability' )
		.then(
			function( r ) {
				if ( 200 !== r.status ) {
					console.log( 'Status Code: ' + r.status );
					throw r;
				}

				return r.text();
			}
		).then(
			function( res ) {
				pickup.innerHTML = btyGetSectionHtml( res, '.pickup-availability-info', 'outer' );
				panel.innerHTML  = btyGetSectionHtml( res, '.pickup-availability-modal', 'outer' );

				let toggle = pickup.querySelector( '.toggle-modal' );
				if ( toggle ) {
					toggle.onclick = function() {
						document.documentElement.classList.add( 'pickup-availability-open' );

						btyClosePopup( 'pickup-availability-open', panel );
					}
				}
			}
		).catch(
			function( e ) {
				console.error( e );
			}
		);
}

// Pickup availability for simple product.
function btyPickupAvailabilityInit( doc = document ) {
	let variants = doc.querySelectorAll( '.product-variants' );
	if ( variants.length ) {
		return;
	}

	let inner     = doc.querySelector( '.product-summary-inner[data-selected-id]' ),
		pickup    = doc.querySelector( '.pickup-availability' ),
		productId = inner ? inner.getAttribute( 'data-selected-id' ) : false;

	if ( ! pickup || ! productId ) {
		return;
	}

	btyPickupAvailability( doc, productId, pickup );
}

// Popup content.
function btyProductPopup( doc = document ) {
	let selectors = doc.querySelectorAll( '.product-popup' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let summary = el.closest( '.product-summary' ),
				button  = el.querySelector( '.popup-toggle' ),
				view    = el.querySelector( '.popup-view' ),
				close   = el.querySelector( '.popup-close' );

			if ( ! summary || ! button || ! view || ! close ) {
				return;
			}

			button.onclick = function() {
				summary.classList.add( 'open' );

				// Target.
				view.onclick = function( e ) {
					if ( view !== e.target ) {
						return;
					}

					summary.classList.remove( 'open' );
				}

				// Use ESC key.
				document.addEventListener(
					'keyup',
					function( e ) {
						if ( 27 !== e.keyCode ) {
							return;
						}

						summary.classList.remove( 'open' );
					}
				);

				// Use close button.
				close.onclick = function() {
					summary.classList.remove( 'open' );
				}
			}
		}
	);
}

// Share button.
function btyProductShare( doc = document ) {
	let selector = doc.querySelector( '.product-share[data-os]' );
	if ( ! selector ) {
		return;
	}

	let button  = selector.querySelector( '.share-button' ),
		summary = selector.querySelector( 'summary' ),
		input   = selector.querySelector( '.field-input' ),
		message = selector.querySelector( '.share-message' ),
		copy    = selector.querySelector( '.share-button-copy' ),
		close   = selector.querySelector( '.share-button-close' );

	if ( ! button || ! summary || ! copy || ! close ) {
		return;
	}

	let closeAction = function() {
		summary.parentNode.removeAttribute( 'open' );
		close.classList.add( 'hidden' );
		message.classList.add( 'hidden' );
		message.textContent = '';
	}

	if ( navigator.share ) {
		button.classList.remove( 'hidden' );
		button.onclick = function() {
			navigator.share(
				{
					url: document.location.href,
					title: document.title
				}
			);
		}
	} else {
		summary.classList.remove( 'hidden' );

		copy.onclick = function() {
			navigator.clipboard.writeText( input.value ).then(
				function() {
					message.classList.remove( 'hidden' );
					close.classList.remove( 'hidden' );

					message.textContent = btyStrings.general.share_success;
				}
			);
		}

		// Click any to close.
		document.addEventListener(
			'click',
			function( e ) {
				if ( e.target.closest( '.product-share' )) {
					return;
				}

				closeAction();
			}
		);

		// Use ESC key.
		document.addEventListener(
			'keyup',
			function( e ) {
				if ( 27 !== e.keyCode ) {
					return;
				}

				closeAction();
			}
		);

		// Close button.
		close.onclick = closeAction;
	}
}

// Sale notification.
function btySalesNotification( doc = document ) {
	let selector = doc.querySelector( '.sales-notification' );
	if ( ! selector ) {
		return;
	}

	let inner   = selector.querySelector( '.sn-inner' ),
		options = selector.querySelector( '[data-options]' ),
		items   = selector.querySelector( '[data-items]' );
	if ( ! inner || ! options || ! items ) {
		return;
	}

	let parseOptions = btyJsonParse( options.content.textContent ),
		parseItems   = new DOMParser().parseFromString( items.innerHTML, 'text/html' );

	// Remove html template.
	options.remove();
	items.remove();

	let length = parseItems.querySelectorAll( '.sn-item' );
	if ( ! length.length ) {
		return;
	}

	// Get random item in array.
	const randomItem = function( arr = [] ) {
		return arr[ Math.floor( Math.random() * arr.length ) ];
	}

	// Display function.
	const displayFn = function() {
		let item     = randomItem( length ),
			time     = item.querySelector( '.sn-time' ),
			customer = item.querySelector( '.sn-customer' );

		// Append time text.
		if ( time ) {
			time.innerText = randomItem( parseOptions.virtual_times );
		}

		// Append customer text.
		if ( customer ) {
			customer.innerText = randomItem( parseOptions.virtual_customers ) + parseOptions.purchased;
		}

		inner.innerHTML = item.outerHTML;

		let current = inner.querySelector( '.sn-item' );
		if ( ! current ) {
			return;
		}

		// Set animation.
		setTimeout(
			function() {
				current.classList.add( 'active' );
			},
			50
		);

		// Start loading bar when animation end.
		setTimeout(
			function() {
				current.insertAdjacentHTML( 'beforeend', '<span class="underline-animated' + ( parseOptions.loading_bar ? '' : ' visibility-hidden' ) + '"></span>' );

				// Remove notification after animation end.
				let animation = current.querySelector( '.underline-animated' );
				if ( animation ) {
					animation.addEventListener(
						'animationend',
						function() {
							current.classList.add( 'down' );
						}
					);
				}
			},
			300
		);

		// Remove notification by click to Close button.
		let closeBtn = current.querySelector( '.sn-close' );
		if ( closeBtn ) {
			closeBtn.onclick = function() {
				current.classList.add( 'down' );
			}
		}
	}

	let init, timeTotal = parseOptions.time_total * 1000;
	setTimeout(
		function() {
			displayFn();

			init = setInterval( displayFn, timeTotal );
		},
		( parseOptions.time_init * 1000 )
	);
}

// Newsletter popup.
function btyNewsletterPopup( doc = document ) {
	let form = doc.querySelector( '.newsletter-popup-form' );
	if ( ! form ) {
		return;
	}

	let delay = form.getAttribute( 'data-delay' );

	setTimeout(
		function() {
			// Set cookies.
			// Always show popup when Display mode set to Test mode.
			if ( Shopify.designMode && '' === form.getAttribute( 'data-mode' )) {
				form.parentNode.classList.add( 'closed' );
			} else {
				if ( 'test' === form.getAttribute( 'data-mode' )) {
					form.parentNode.classList.remove( 'closed' );
				} else {
					if ( form.classList.contains( 'first-visit' )) {
						const getCookie = new URLSearchParams( document.cookie.replaceAll( '&', '%26' ).replaceAll( '; ', '&' ));
						if ( ! getCookie.get( 'newsletter-popup-cookie' )) {
							form.parentNode.classList.remove( 'closed' );
						}

						function setCookie( cname, cvalue, exdays ) {
							let d = new Date();

							d.setTime( d.getTime() + ( exdays * 24 * 60 * 60 * 1000));

							let expires = 'expires=' + d.toUTCString();

							document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
						}

						setCookie( 'newsletter-popup-cookie', 1, 30 );
					} else {
						form.parentNode.classList.remove( 'closed' );
					}
				}
			}

			// Click to popup overlay.
			form.addEventListener(
				'click',
				function( e ) {
					if ( e.target != form ) {
						return;
					}

					form.parentNode.classList.add( 'closed' );
				}
			);

			// Use ESC key.
			document.addEventListener(
				'keyup',
				function( e ) {
					if ( 27 !== e.keyCode ) {
						return;
					}

					form.parentNode.classList.add( 'closed' );
				}
			);

			// Use close button.
			let button = form.querySelector( '.close-button' );
			if ( button ) {
				button.onclick = function() {
					form.parentNode.classList.add( 'closed' );
				}
			}
		},
		Number( delay )
	);
}

// Cookies bar.
function btyCookiesBar( doc = document ) {
	let box    = doc.querySelector( '.cookies-bar' ),
		button = doc.querySelector( '.button-cookies' );

	if ( ! box || ! button || ( Shopify.designMode && '' === box.getAttribute( 'data-mode' )) ) {
		return;
	}

	const getCookie = new URLSearchParams( document.cookie.replaceAll( '&', '%26' ).replaceAll( '; ', '&' ));
	if ( ! getCookie.get( 'acceptCookies' )) {
		box.classList.add( 'show' );
	}

	function setCookie( cname, cvalue, exdays ) {
		let d = new Date();

		d.setTime( d.getTime() + ( exdays * 24 * 60 * 60 * 1000));

		let expires = 'expires=' + d.toUTCString();

		document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
	}

	button.onclick = function () {
		if ( '' === box.getAttribute( 'data-mode' )) {
			setCookie( 'acceptCookies', 1, 30 );
		} else {
			document.cookie = 'acceptCookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		}

		box.classList.remove( 'show' );
	}
}

// Hover media video.
function btyHoverMediaVideo( doc = document ) {
	let selectors = doc.querySelectorAll( '.hover-media-video' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let parent = el.parentNode;

			parent.addEventListener(
				'mousemove',
				function( e ) {
					btyMediaAction( parent, 'play' );

					return;
				}
			);
		}
	);
}

// Animation for image load.
function btyAnimationImageLoad( doc = document, removeAttribute = true ) {
	let images = doc.querySelectorAll( '.lazy-image img' );
	if ( ! images.length ) {
		return;
	}

	const imgLazyObserver = new IntersectionObserver(
		function( entries, observer ) {
			entries.forEach(
				function( entry ) {
					const target = entry.target;

					if ( entry.isIntersecting ) {
						target.dataset.src && ( target.src = target.dataset.src );
						target.dataset.srcset && ( target.srcset = target.dataset.srcset );

						entry.target.addEventListener(
							'load',
							function() {
								entry.target.parentNode.classList.add( 'lazy-loaded' );

								if ( removeAttribute && ! target.parentNode.parentNode.classList.contains( 'scrolling-promotion-image' )) {
									target.removeAttribute( 'data-src' );
									target.removeAttribute( 'data-srcset' );
								}
							}
						);

						observer.unobserve( entry.target );
					}
				}
			);
		},
		{
			rootMargin: '100px'
		}
	);

	images.forEach(
		function( img ) {
			if ( ! img.hasAttribute( 'data-src' ) || img.classList.contains( 'swiper-lazy' )) {
				return;
			}

			let parent = img.parentNode.parentNode;
			if ( parent.classList.contains( 'swiper-slide' ) && window.matchMedia( '(max-width: 991px)' ).matches ) {
				return;
			}

			imgLazyObserver.observe( img );
		}
	);
}

// Collection sticky.
function btyCollectionSticky( doc = document ) {
	let items = doc.querySelectorAll( '.collection-sticky' );
	if ( ! items.length ) {
		return
	}

	const updateDynamicLabel = function( el, current, box ) {
		let title          = current.getAttribute( 'data-title' ),
			href           = current.getAttribute( 'data-href' ),
			dataSubHeading = current.getAttribute( 'data-subheading' ),
			dataHeading    = current.getAttribute( 'data-heading' ),
			subHeading     = box ? box.querySelector( '.sub-heading .dynamic-label' ) : false,
			heading        = box ? box.querySelector( '.heading .dynamic-label' ) : false;

		if ( ! el || ! title || ! href || el.innerText == title ) {
			return;
		}

		if ( href.trim()) {
			el.parentNode.href = href;
		}

		if ( title.trim()) {
			el.innerText = title;
		}

		el.parentNode.classList.add( 'bounce-it' );
		setTimeout(
			function() {
				el.parentNode.classList.remove( 'bounce-it' );
			},
			1000
		);

		if ( dataSubHeading.trim() && subHeading ) {
			subHeading.innerText = dataSubHeading;
		}

		if ( dataHeading.trim() && heading ) {
			heading.innerText = dataHeading;
		}
	}

	const stickCollection = function() {
		if ( window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches ) {
			return;
		}

		items.forEach(
			function( el ) {
				let box          = el.querySelector( '.heading-box' ),
					dynamicLabel = box ? box.querySelector( '.collection-list-button .dynamic-label' ) : false,
					cards        = el.querySelectorAll( '.card-item' );
				if ( ! dynamicLabel || ! cards.length ) {
					return;
				}

				for ( let i = 0, j = cards.length; i < j; i++ ) {
					let rect    = cards[i].getBoundingClientRect(),
						index   = i + 1,
						current = el.querySelector( '.card-item:nth-child(' + index + ')' );

					if ( ! current ) {
						return;
					}


					if ( rect.top <= 1 && ( rect.top >= rect.height * -1 )) {
						updateDynamicLabel( dynamicLabel, current, box );

						return;
					}
				}
			}
		);
	}
	stickCollection();

	// Update dynamic label on mobile.
	const updateDynamicLabelMobile = function() {
		if ( window.matchMedia( '(min-width: 992px)' ).matches && ! window.matchMedia( '(hover: none)' ).matches ) {
			return;
		}

		items.forEach(
			function( el ) {
				let box          = el.querySelector( '.heading-box' ),
					secondItem   = el.querySelector( '.second-item' ),
					dynamicLabel = el.querySelector( '.last-item .dynamic-label' ),
					cards        = el.querySelectorAll( '.card-item' );
				if ( ! cards.length || ! secondItem || ! dynamicLabel ) {
					return;
				}

				secondItem.addEventListener(
					'touchmove',
					function() {
						for ( let i = 0, j = cards.length; i < j; i++ ) {
							let rect    = cards[i].getBoundingClientRect(),
								current = el.querySelector( '.card-item:nth-child(' + ( i + 1 ) + ')' );

							if ( ! current ) {
								return;
							}

							if ( rect.left <= 1 && ( rect.left >= rect.width * -1 )) {
								updateDynamicLabel( dynamicLabel, current, box );

								return;
							}
						}
					}
				);
			}
		);
	}
	updateDynamicLabelMobile();

	// Trigger.
	window.addEventListener(
		'scroll',
		function() {
			stickCollection();
		}
	);
}

// Accordion hover.
function btyAccordionHover( doc = document ) {
	let menus = doc.querySelectorAll( '.menu-map.faq-accordion' );

	if ( ! menus.length ) {
		return;
	}

	menus.forEach(
		function( el ) {
			let section   = el.closest( '.shopify-section' ),
				id        = el.getAttribute( 'data-id' ),
				container = section ? section.querySelectorAll( '.content-map[data-id="' + id + '"]' ) : [];

			el.addEventListener(
				'mouseenter',
				function() {
					if ( window.matchMedia( '(max-width: 991px)' ).matches || window.matchMedia( '(hover: none)' ).matches ) {
						return;
					}

					if ( container.length ) {
						container.forEach(
							function( con ) {
								let sibs = btySiblings( con );
								if ( sibs.length ) {
									sibs.forEach(
										function( sib ) {
											sib.classList.remove( 'active' );
										}
									);
								}

								con.classList.add( 'active' );
							}
						);
					}
				}
			);
		}
	);
}

// Google map.
function btyGoogleMap( doc = document ) {
	let selectors = doc.querySelectorAll( '.contact-map' );
	if ( ! selectors.length ) {
		return;
	}

	// Map style.
	let styledMapType = new google.maps.StyledMapType(
		[
			{
				"featureType": "administrative",
				"elementType": "labels.text.fill",
				"stylers": [{ "color": "#444444" }]
			},
			{
				"featureType": "administrative.land_parcel",
				"elementType": "all",
				"stylers": [{ "visibility": "off" }]
			},
			{
				"featureType": "landscape",
				"elementType": "all",
				"stylers": [{ "color": "#f2f2f2" }]
			},
			{
				"featureType": "landscape.natural",
				"elementType": "all",
				"stylers": [{ "visibility": "off" }]
			},
			{
				"featureType": "poi",
				"elementType": "all",
				"stylers": [
					{ "visibility": "on" },
					{ "color": "#052366" },
					{ "saturation": "-70" },
					{ "lightness": "85" }
				]
			},
			{
				"featureType": "poi",
				"elementType": "labels",
				"stylers": [
					{ "visibility": "simplified" },
					{ "lightness": "-53" },
					{ "weight": "1.00" },
					{ "gamma": "0.98" }
				]
			},
			{
				"featureType": "poi",
				"elementType": "labels.icon",
				"stylers": [{ "visibility": "simplified" }]
			},
			{
				"featureType": "road",
				"elementType": "all",
				"stylers": [
					{ "saturation": -100 },
					{ "lightness": 45 },
					{ "visibility": "on" }
				]
			},
			{
				"featureType": "road",
				"elementType": "geometry",
				"stylers": [{ "saturation": "-18" }]
			},
			{
				"featureType": "road",
				"elementType": "labels",
				"stylers": [{ "visibility": "off" }]
			},
			{
				"featureType": "road.highway",
				"elementType": "all",
				"stylers": [{ "visibility": "on" }]
			},
			{
				"featureType": "road.arterial",
				"elementType": "all",
				"stylers": [{ "visibility": "on" }]
			},
			{
				"featureType": "road.arterial",
				"elementType": "labels.icon",
				"stylers": [{ "visibility": "off" }]
			},
			{
				"featureType": "road.local",
				"elementType": "all",
				"stylers": [{ "visibility": "on" }]
			},
			{
				"featureType": "transit",
				"elementType": "all",
				"stylers": [{ "visibility": "off" }]
			},
			{
				"featureType": "water",
				"elementType": "all",
				"stylers": [
					{ "color": "#57677a" },
					{ "visibility": "on" }
				]
			}
		],
		{ name: "Styled Map" }
	);

	// Init.
	selectors.forEach(
		function( el ) {
			let data    = el.querySelector( '[data-options]' ),
				options = data ? btyJsonParse( data.content.textContent ) : false;
			if ( ! options ) {
				return;
			}

			// Remove template.
			data.remove();

			let coordinates = options.coordinates.split( ',' );

			coordinates = { lat: Number( coordinates[0].trim()), lng: Number( coordinates[1].trim()) }

			let map = new google.maps.Map(
				el,
				{
					zoom: options.zoom,
					center: coordinates,
					disableDefaultUI: true,
					mapTypeControlOptions: {
						mapTypeIds: [ 'roadmap', 'satellite', 'hybrid', 'terrain', 'styled_map' ]
					}
				}
			);

			map.mapTypes.set( 'styled_map', styledMapType );
			map.setMapTypeId( 'styled_map' );

			let marker = new google.maps.Marker(
				{
					position: coordinates,
					map: map
				}
			);
		}
	);
}

// Shopable video.
function btyShopableVideo( doc = document ) {
	let togglePopup = doc.querySelectorAll( '.toggle-shopable-popup' ),
		videos      = doc.querySelectorAll( '.shopable-wrapper video' );

	// Toggle popup video.
	if ( togglePopup.length ) {
		togglePopup.forEach(
			function( el ) {
				el.addEventListener(
					'click',
					function( e ) {
						e.preventDefault();

						let section   = el.closest( '.shopable-video-section' ),
							wrapper   = section ? section.querySelector( '.shopable-popup' ) : false,
							popup     = section ? section.querySelector( '.shopable-popup' ) : false,
							productId = el.getAttribute( 'data-id' ),
							current   = popup ? popup.querySelector( '.popup-item[data-id="' + productId + '"]' ) : false;

						if ( ! wrapper || ! current ) {
							return;
						}

						// Show shop now.
						const showNowButton = function( current ) {
							if ( ! current.classList.contains( 'active' )) {
								return;
							}

							let btn = current.querySelector( '.product-buy-now-button' )
							if ( ! btn ) {
								return;
							}

							btn.onclick = function( e ) {
								e.preventDefault();

								let item = btn.closest( '.popup-item' );
								if ( ! item ) {
									return;
								}

								item.classList.add( 'shop-now-open' );
							}
						}

						// Set new active.
						let oldCurrent = current.parentNode.querySelector( '.active' );
						if ( oldCurrent ) {
							oldCurrent.classList.remove( 'active' );
						}
						current.classList.add( 'active' );

						// Play video.
						let video = current.querySelector( '.area-video video' );
						if ( video ) {
							let source = video.querySelector( 'source' );
							if ( source && ! source.src ) {
								source.src = source.getAttribute( 'data-src' );
								source.removeAttribute( 'data-src' );
								video.load();
							}

							video.play();
						}

						showNowButton( current );

						// Close popup.
						document.documentElement.classList.add( 'shopable-popup-open' );
						btyClosePopup( 'shopable-popup-open', popup, true );

						document.addEventListener(
							'click',
							function( e ) {
								if ( e.target.classList.contains( 'popup-controls' )) {
									document.documentElement.classList.remove( 'shopable-popup-open' );

									document.dispatchEvent( new CustomEvent( 'theme-popup-close' ));
								}

								return false;
							}
						);

						// Remove active when close popup.
						document.addEventListener(
							'theme-popup-close',
							function() {
								if ( document.documentElement.classList.contains( 'shopable-popup-open' )) {
									return;
								}

								let currentItem = popup.querySelector( '.popup-item.active' );
								if ( currentItem ) {
									currentItem.classList.remove( 'active', 'shop-now-open' );

									let currentVideo = currentItem.querySelector( '.area-video video' );
									if ( currentVideo ) {
										currentVideo.pause();
									}
								}
							}
						);

						// Next/prev function.
						let arrows = popup.querySelectorAll( '.arrow-button' );
						if ( arrows.length ) {
							arrows.forEach(
								function( ar ) {
									ar.onclick = function() {
										let continueItem,
											currentItem = popup.querySelector( '.popup-item.active' ),
											type        = ar.getAttribute( 'data-type' );

										if ( ! currentItem ) {
											return;
										}

										// Remove item inactive.
										currentItem.classList.remove( 'active', 'shop-now-open' );

										// Pause inactive video.
										let currentVideo = currentItem.querySelector( '.area-video video' );
										if ( currentVideo ) {
											currentVideo.pause();
										}

										// Get prev/next item.
										if ( 'prev' == type ) {
											continueItem = currentItem.previousSibling ? currentItem.previousSibling : currentItem.parentNode.lastChild;
										} else {
											continueItem = currentItem.nextSibling ? currentItem.nextSibling : currentItem.parentNode.firstChild;
										}

										// Set new active.
										continueItem.classList.add( 'active' );

										// Show shop now.
										showNowButton( continueItem );

										// Play video.
										let continueVideo = continueItem.querySelector( '.area-video video' );
										if ( continueVideo ) {
											let source = continueVideo.querySelector( 'source' );
											if ( source && ! source.src ) {
												source.src = source.getAttribute( 'data-src' );
												source.removeAttribute( 'data-src' );
												continueVideo.load();
											}

											continueVideo.play();
										}
									}
								}
							);
						}

						document.documentElement.addEventListener(
							'product-variant-updated',
							function( e ) {
								let currentPopup = popup.querySelector( '.popup-item.active' ),
									currentMedia = currentPopup ? popup.querySelector( '.popup-item.active .product-media' ) : false,
									index        = currentPopup ? Array.from( currentPopup.parentNode.children ).indexOf( currentPopup ) : 0,
									sectionId    = el.closest( '.shopify-section' ).id.replace( 'shopify-section-', '' ) + ( index + 1 ),
									initialSlide = e.detail.selected.featured_image ? e.detail.selected.featured_image.position - 1 : 0;

								if ( 'undefined' !== typeof( btyCarouselInstances[sectionId] )) {
									if ( currentMedia ) {
										currentMedia.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
									}

									btyCarouselInstances[sectionId].slideTo( initialSlide, 600 );
								}
							}
						);
					}
				);
			}
		);
	}

	// Video lazy load.
	if ( videos.length ) {
		const observer = new IntersectionObserver(
			function ( entries, observer ) {
				entries.forEach(
					function ( entry ) {
						let video  = entry.target,
							source = video.querySelector( 'source' );

						if ( entry.isIntersecting ) {
							if ( source && ! source.src ) {
								source.src = source.getAttribute( 'data-src' );
								source.removeAttribute( 'data-src' );
								video.load();
							}

							const promise = video.play();

							if ( undefined !== promise ) {
								promise.then(
									() => {
										video.muted = true;
										video.play();
									}
								).catch(
									error => {
										video.muted = true;
										video.play();
									}
								);
							}

							observer.unobserve( entry.target );
						} else {
							video.pause();
						}
					}
				);
			},
			{
				threshold: 0.1
			}
		);

		videos.forEach(
			function ( video ) {
				observer.observe( video );
			}
		);
	}
}

// Scrolling.
class ScrollingHandler extends HTMLElement {
	constructor() {
		super();

		this.width     = 0;
		this.scrolling = this.querySelector( '.scrolling-inner' );

		window.addEventListener( 'DOMContentLoaded', this.handler.bind( this ));
		window.addEventListener( 'resize', this.handler.bind( this ));

		document.addEventListener( 'shopify:section:load', this.handler.bind( this ));
		document.addEventListener( 'shopify:section:select', this.handler.bind( this ));
		document.addEventListener( 'shopify:block:select', this.handler.bind( this ));
		document.addEventListener( 'product-card-updated', this.handler.bind( this ));
	}

	handler() {
		if ( this.width == window.innerWidth ) {
			return;
		}

		this.width = window.innerWidth;
		this.scrolling.classList.remove( 'scrolling-animation' );
		let boxes = this.querySelectorAll( '.scrolling-dup' );
		if ( boxes.length ) {
			boxes.forEach(e => e.remove());
		}

		let localWidth = this.closest( '.scrolling-wrapper' ).offsetWidth,
			length     = localWidth / this.scrolling.offsetWidth,
			dup        = false;

		length = length == Infinity ? 5 : length;

		for ( let i = 0; i < length; i++ ) {
			dup = this.scrolling.cloneNode( true );
			dup.classList.add( 'scrolling-dup', 'scrolling-animation' );
			this.prepend( dup );
		}

		this.scrolling.classList.add( 'scrolling-animation' );
	}
}
customElements.define( 'scrolling-item', ScrollingHandler );

// Load media.
function btyLoadMedia( selector = undefined, action = 'play' ) {
	if ( ! selector ) {
		return;
	}

	let wrapper = selector.querySelector( '.media-preview-wrap' ),
		playBtn = selector.querySelector( '.view-media' );

	if ( ! playBtn ) {
		return;
	}

	// Return if media loaded.
	if ( wrapper.classList.contains( 'media-loaded' )) {
		btyMediaAction( wrapper, action );

		return;
	}

	// Play current video.
	btyMediaAction( wrapper, action );

	let template = selector.querySelector( 'template' ),
		mediaDiv = wrapper.querySelector( '.media-content' );

	if ( ! mediaDiv ) {
		wrapper.classList.add( 'media-loaded' );

		if ( template ) {
			wrapper.insertAdjacentHTML( 'beforeend', '<div class="media-content">' + template.innerHTML + '</div>' );
		}
	}

	// Remove model after loaded, inside <template> tag.
	if ( template ) {
		template.remove();
	}
}

// Load media on desktop.
function btyMediaDesktop( doc = document ) {
	let selectors = doc.querySelectorAll( '.main-item' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			if ( el.hasAttribute( 'data-model' )) {
				return;
			}

			el.addEventListener(
				'mousemove',
				function() {
					btyLoadMedia( el, 'play' );
				}
			);

			el.addEventListener(
				'mouseleave',
				function() {
					btyLoadMedia( el, 'pause' );
				}
			);
		}
	);
}

// Scrolling promotion.
class BTFScrollingPromotionElement extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.width   = 0;
		this.wrapper = this.parentNode;
		this.item    = this.querySelector( '.scrolling-promotion-item' );

		window.addEventListener( 'DOMContentLoaded', this.handler.bind( this ));
		window.addEventListener( 'resize', this.handler.bind( this ));

		document.addEventListener( 'shopify:section:load', this.handler.bind( this ));
		document.addEventListener( 'shopify:section:select', this.handler.bind( this ));
		document.addEventListener( 'shopify:block:select', this.handler.bind( this ));
	}

	handler() {
		if ( this.width == window.innerWidth ) {
			return;
		}

		this.width = window.innerWidth;
		this.item.classList.remove( 'scrolling-promotion-animation' );

		let boxes = this.querySelectorAll( '.scrolling-promotion-dup' );
		if ( boxes.length ) {
			boxes.forEach( e => e.remove());
		}

		let localWidth = this.wrapper.offsetWidth,
			length     = localWidth / this.item.offsetWidth,
			dup        = false;

		length = length == Infinity ? 5 : length;

		for ( let i = 0; i < length; i++ ) {
			dup = this.item.cloneNode( true );
			dup.classList.add( 'scrolling-promotion-dup', 'scrolling-promotion-animation' );
			this.prepend( dup );
		}

		this.item.classList.add( 'scrolling-promotion-animation' );
		btyAnimationImageLoad( this, false );
	}
}
customElements.define( 'btf-scrolling-promotion', BTFScrollingPromotionElement );

// DOM Loaded.
document.addEventListener(
	'DOMContentLoaded',
	function() {
		if ( ! Shopify.designMode ) {
			btySalesNotification();
		}

		if ( typeof Shopify !== 'undefined' && Shopify.theme?.schema_version ) {
			document.documentElement.setAttribute( 'data-v', Shopify.theme.schema_version );
		}

		btyShopableVideo();
		btyAccordionHover();
		btyScrollBar();
		btyRecipientForm();
		btyNewsletterPopup();
		btyToggleDetails();
		btyQuickAdd();
		btyHoverMediaVideo();
		btyHoverNav();
		btyCollectionSticky();
		btyAnimationImageLoad();
		btyAccountPopup();
		btyCarousel();
		btyTestimonialProduct();
		btySplitSlider();
		btyProductTabs();
		btyCountdownTime();
		btyNavMenu();
		btyCookiesBar();
		btySlider();
		btyQuantityButton();
		btySideCart();
		btyQuickSearch();
		btyAddToCart();
		btyUpdateProductQuantity();
		btyQuickView();
		btySwatch();
		btyAccordionHandle();
		btyToggleDropdown();
		btyFooterAccordion();
		btyVideo();
		btyBackgroundVideo();
		btyAddress();
		btyPickupAvailabilityInit();
		btyProductVariants();
		btyProductPopup();
		btyProductShare();
		btyMediaDesktop();

		window.addEventListener(
			'resize',
			function() {
				btyFooterAccordion();
				btyTestimonialProduct();
				btySplitSlider();
				btyMediaDesktop();
			}
		);

		window.addEventListener(
			'scroll',
			function() {
				btyScrollingDetect();
				btyAnimationImageLoad();
			}
		);
	}
);

document.addEventListener(
	'visibilitychange',
	function() {
		// Pause current shopable popup video when tab inactive.
		let shopablePopupVideo = document.querySelector( '.shopable-popup .popup-item.active video' );
		if ( ! shopablePopupVideo ) {
			return;
		}

		if ( document.hidden ) {
			shopablePopupVideo.pause();
		} else {
			shopablePopupVideo.play();
		}
	}
);

// Design mode event.
document.addEventListener(
	'shopify:section:load',
	function( e ) {
		let section = e.target;


		btyTestimonialProduct( section );
		btySplitSlider( section );
		btyAccordionHover( section );
		btyAnimationImageLoad( section );
		btyCountdownTime( section );
		btyCarousel( section );
		btyProductTabs( section );
		btyAccordionHandle( section );
		btyToggleDropdown( section );
		btySlider( section );
		btyVideo( section );
		btyBackgroundVideo( section );
		btyAddress( section );
		btyProductVariants( section );
		btyProductPopup( section );
		btyProductShare( section );
		btyGoogleMap( section );
		btyCollectionSticky( section );

		console.log( 'Section load.' );
	}
);
document.addEventListener(
	'shopify:section:select',
	function( e ) {
		let section = e.target;

		document.documentElement.classList.remove( 'shopable-popup-open' );
		btyShopableVideo( section );
		btyTestimonialProduct( section );
		btySplitSlider( section );
		btyAccordionHover( section );
		btyQuickSearch();
		btyCookiesBar( section );
		btyNewsletterPopup( section );
		btyAnimationImageLoad( section );
		btyNavMenu( section, e );
		btyToggleDropdown( section );
		btyCarousel( section );
		btyProductTabs( section );
		btyCountdownTime( section );
		btyAccordionHandle( section );
		btyVideo( section );
		btyBackgroundVideo( section );
		btyAddress( section );
		btyProductVariants( section );
		btyProductPopup( section );
		btyProductShare( section );
		btyAccountPopup( section );
		btyQuickAdd( section );
		btyHoverNav( section );
		btyScrollBar( section );
		btyHoverMediaVideo( section );
		btySwatch( section );
		btyCollectionSticky( section );
		btyFooterAccordion( section );

		console.log( 'Section select.' );
	}
);
document.addEventListener(
	'shopify:block:select',
	function( e ) {
		console.log( 'Block select.' );

		let section = document.getElementById( 'shopify-section-' + e.detail.sectionId );
		if ( ! section ) {
			return;
		}

		document.documentElement.classList.remove( 'shopable-popup-open' );
		btyShopableVideo( section );
		btyFooterAccordion( section );
		btyTestimonialProduct( section );
		btySplitSlider( section );
		btyAccordionHover( section );
		btyNewsletterPopup( section );
		btyAnimationImageLoad( section );
		btyProductTabs( section, e );
		btySlider( section, e );
		btyHoverNav( section );
		btyCollectionSticky( section );
	}
);