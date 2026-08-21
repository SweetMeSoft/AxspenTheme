/**
 * Product page
 *
 * @package Dev
 */

'use strict';

// Gallery slide layout.
window.btyGroupGalleryInstances      = window.btyGroupGalleryInstances || {};
window.btyGroupThumbGalleryInstances = window.btyGroupThumbGalleryInstances || {};
function btyProductGallery( doc = document ) {
	let gallery      = doc.querySelector( '.gallery-media' ),
		mainSelector = gallery ? gallery.querySelectorAll( '.product-main-slide' ) : false;

	if ( ! mainSelector.length || 'undefined' === typeof( Swiper ) ) {
		return;
	}

	let layout = gallery.parentNode.getAttribute( 'data-id' );

	mainSelector.forEach(
		function( el, index ) {
			let groupImage = el.querySelector( '.group-image' ),
				groupId    = groupImage && groupImage.hasAttribute( 'data-color' ) ? groupImage.getAttribute( 'data-color' ) : index;

			// Destroy swiper on desktop.
			if ( layout !== 'layout-3' && window.matchMedia( '(min-width: 992px)' ).matches ) {
				if ( 'object' === typeof( btyGroupGalleryInstances[groupId] ) ) {
					btyGroupGalleryInstances[groupId].destroy();
				}

				return;
			}

			if ( el.classList.contains( 'swiper-initialized' ) ) {
				return;
			}

			// Layout 3, carousel with horizontal thumbnail.
			if ( layout === 'layout-3' ) {
				let btyThumbSliderOptions = {
					slidesPerView: 5,
					spaceBetween: 15,
					speed: 800,
					preloadImages: false,
					lazy: true,
					breakpoints: {
						320: {
							slidesPerView: 4,
							spaceBetween: 10
						},
						992: {
							slidesPerView: 6,
							spaceBetween: 15
						}
					}
				}

				btyGroupThumbGalleryInstances[groupId] = new Swiper( el.nextSibling, btyThumbSliderOptions );
			}

			// Options.
			let btyMainSlideOptions = {
				slidesPerView: 1,
				spaceBetween: 10,
				speed: 800,
				preloadImages: false,
				lazy: true,
				navigation: {
					nextEl: el.querySelector( '.swiper-button-next' ),
					prevEl: el.querySelector( '.swiper-button-prev' )
				},
				thumbs: {
					swiper: 'layout-3' === layout ? btyGroupThumbGalleryInstances[groupId] : null
				}
			}

			if ( 'layout-3' !== layout ) {
				btyMainSlideOptions.pagination = {
					el: el.querySelector( '.swiper-pagination' ),
					type: 'custom',
					renderCustom: function( swiper, current, total ) {
						return current + '/' + total;
					}
				}
			}

			// Init.
			btyGroupGalleryInstances[groupId] = new Swiper( el, btyMainSlideOptions );

			// Autoplay video.
			btyGroupGalleryInstances[groupId].on(
				'slideChange',
				function( swp ) {
					btyMediaAction();

					let nthChild      = swp.realIndex + 1,
						mediaTemplate = swp.el.querySelector( '.main-item:nth-child(' + nthChild + ')' );
					if ( mediaTemplate ) {
						setTimeout(
							function() {
								btyLoadMedia( mediaTemplate, 'play' );
							}
						);
					}
				}
			);

			document.documentElement.addEventListener(
				'product-variant-updated',
				function( e ) {
					btyGroupGalleryInstances[groupId].slideTo( e.detail.indexSlide, 800 );
				}
			);
		}
	);
}

// Gallery layout list.
function btyGalleryList( doc = document ) {
	let list = doc.querySelector( '.product-gallery[data-id]' );
	if ( ! list ) {
		return;
	}

	let hasGroupVariant    = doc.querySelector( '.check-group-image' ),
		headerSticky       = document.querySelector( '.header.header-sticky' ),
		headerStickyHeight = headerSticky ? headerSticky.offsetHeight : 0;

	if ( hasGroupVariant && window.matchMedia( '(max-width: 991px)' ).matches ) {
		return;
	}

	if ( headerSticky ) {
		list.parentNode.setAttribute( 'style', '--product-padding-top: ' + ( headerStickyHeight + 20 ) + 'px;' );
	}

	if ( 'layout-2' !== list.getAttribute( 'data-id' ) ) {
		return;
	}

	// Active current image item.
	const activeThumb = function() {
		let imagesItem = list.querySelectorAll( '.product-main-slide:not(.sr-only) .media-preview-wrap' );
		if ( ! imagesItem.length ) {
			return;
		}

		for ( let i = 0, j = imagesItem.length; i < j; i++ ) {
			let rect       = imagesItem[i].getBoundingClientRect(),
				style      = window.getComputedStyle( imagesItem[i] ),
				marginBot  = parseInt( style.marginBottom ),
				itemHeight = rect.height,
				itemTop    = rect.top - headerStickyHeight,
				thumbIndex = i + 1,
				thumbItem  = hasGroupVariant ? list.querySelector( '.product-main-slide:not(.sr-only) + .group-image-thumb .media-preview-wrap:nth-child(' + thumbIndex + ')' ) : list.querySelector( '.product-main-slide[data-slider] .group-image-thumb .media-preview-wrap:nth-child(' + thumbIndex + ')' );

			if ( ! thumbItem ) {
				return;
			}

			// Add 1 value for compatibility display.
			if ( itemTop <= 1 && ( ( itemTop + marginBot - 1 ) >= itemHeight * -1 ) ) {
				thumbItem.classList.add( 'active' );
			} else {
				thumbItem.classList.remove( 'active' );
			}
		}
	}

	// Scroll to image item.
	const scrollToImage = function() {
		let thumbItems = hasGroupVariant ? list.querySelectorAll( '.product-main-slide:not(.sr-only) + .group-image-thumb .media-preview-wrap' ) : list.querySelectorAll( '.product-main-slide[data-slider] .group-image-thumb .media-preview-wrap' );
		if ( ! thumbItems.length ) {
			return;
		}

		for ( let i = 0, j = thumbItems.length; i < j; i++ ) {
			thumbItems[i].onclick = function() {
				let imageIndex = i + 1,
					imageItem  = list.querySelector( '.product-main-slide:not(.sr-only) .main-item:nth-child(' + imageIndex + ') .media-preview-wrap' );
				if ( ! imageItem ) {
					return;
				}

				imageItem.scrollIntoView( { behavior: 'smooth' } );
			}
		}
	}

	// Init.
	activeThumb();
	scrollToImage();

	// Trigger.
	window.onscroll = function() {
		activeThumb();
	}

	window.onload = function() {
		activeThumb();
	}

	document.documentElement.addEventListener(
		'product-variant-updated',
		function() {
			scrollToImage();
			activeThumb();
		}
	);
}

// Hover zoom image for gallery.
function btyGalleryZoom( doc = document ) {
	let selectors = doc.querySelectorAll( '.media-preview-wrap.hover-zoom' );
	if ( ! selectors.length ) {
		return;
	}

	selectors.forEach(
		function( item ) {
			item.onmousemove = function( e ) {
				let x          = e.offsetX / item.offsetWidth * 100,
					y          = e.offsetY / item.offsetHeight * 100,
					imgFullSrc = item.getAttribute( 'data-zoom' ),
					newImage   = new Image();

				if ( ! imgFullSrc ) {
					return;
				}

				item.classList.add( 'zooming' );

				newImage.crossOrigin = 'anonymous';

				let productImg = item.getAttribute( 'data-key' ) || false;

				// Set background image only first time.
				if ( ! item.style.backgroundImage ) {
					if ( sessionStorage.getItem( productImg ) ) {
						item.style.backgroundImage = 'url(' + sessionStorage.getItem( productImg ) + ')';
					} else {
						item.classList.add( 'loading' );

						newImage.onload = function() {
							let imageSrc = btyGetImageSrc( newImage );

							if ( productImg ) {
								sessionStorage.setItem( productImg, imageSrc );
							}

							item.style.backgroundImage = 'url(' + imageSrc + ')';
							item.classList.remove( 'loading' );
						}

						newImage.src = imgFullSrc;

						newImage.onerror = function() {
							item.classList.remove( 'loading' );
							console.log( 'Error! Loading Image.' );
						}
					}
				}

				// Set background position when hover.
				item.style.backgroundPosition = x + '% ' + y + '%';

				return;
			}

			// Remove BG properties when mouse leave.
			item.onmouseleave = function() {
				item.classList.remove( 'zooming' );
				item.style.backgroundImage    = '';
				item.style.backgroundPosition = '';

				return;
			}
		}
	);
}

// Photoswipe handle.
function btyPhotoswipeHandle( doc = document ) {
	// parse slide data (url, title, dimension ...) from DOM elements (children of gallerySelector).
	let parseThumbnailElements = function( el ) {
		let thumbElements = el.querySelectorAll( '.media-preview-wrap' ),
			items         = [],
			wrapEl, dimension, item;

		if ( ! thumbElements.length ) {
			return;
		}

		for ( let i = 0, ij = thumbElements.length; i < ij; i++ ) {
			wrapEl = thumbElements[ i ];

			// include only element nodes.
			if ( 'BUTTON' !== wrapEl.tagName ) {
				continue;
			}

			dimension = wrapEl.getAttribute( 'data-dimension' );
			if ( ! dimension ) {
				continue;
			}

			dimension = dimension.split( 'x' );

			// create slide object.
			item = {
				src: wrapEl.getAttribute( 'data-zoom' ),
				w: parseInt( dimension[0], 10 ),
				h: parseInt( dimension[1], 10 ),
				position: Number( wrapEl.getAttribute( 'data-pos' ) )
			};

			if ( wrapEl.children.length > 0 ) {
				// <img> thumbnail element, retrieving thumbnail url.
				item.msrc = wrapEl.children[0].getAttribute( 'src' );
			}

			item.el = wrapEl; // save link to element for getThumbBoundsFn.
			items.push( item );
		}

		return items;
	};

	// find nearest parent element.
	let closest = function closest( el, fn ) {
		return el && ( fn( el ) ? el : closest( el.parentNode, fn ) );
	};

	// triggers when user clicks on thumbnail.
	let onThumbnailsClick = function( e ) {
		e = e || window.event;
		e.preventDefault ? e.preventDefault() : e.returnValue = false;

		let eTarget = e.target || e.srcElement;

		// find root element of slide.
		let clickedListItem = closest(
			eTarget,
			function( el ) {
				return ( el.tagName && 'BUTTON' === el.tagName );
			}
		);

		if ( ! clickedListItem ) {
			return;
		}

		// find index of clicked item by looping through all child nodes
		// alternatively, you may define index via data- attribute.
		let clickedGallery = clickedListItem.parentNode.parentNode,
			childNodes     = clickedGallery.childNodes,
			nodeIndex      = 0,
			index;

		for ( let i = 0, j = childNodes.length; i < j; i++ ) {
			if ( childNodes[ i ].nodeType !== 1 ) {
				continue;
			}

			if ( ! childNodes[ i ].querySelector( '[data-dimension]' ) ) {
				continue;
			}

			if ( childNodes[ i ] === clickedListItem.parentNode ) {
				index = nodeIndex;
				break;
			}
			nodeIndex++;
		}

		if ( index >= 0 ) {
			// open PhotoSwipe if valid index found.
			openPhotoSwipe( index, clickedGallery );
		}

		return false;
	};

	// parse picture index and gallery index from URL (#&pid=1&gid=2).
	let photoswipeParseHash = function() {
		let hash   = window.location.hash.substring( 1 ),
			params = {};

		if ( hash.length < 5 ) {
			return params;
		}

		let vars = hash.split( '&' );
		for ( let i = 0, ij = vars.length; i < ij; i++ ) {
			if ( ! vars[ i ] ) {
				continue;
			}
			let pair = vars[ i ].split( '=' );
			if ( pair.length < 2 ) {
				continue;
			}
			params[ pair[0] ] = pair[1];
		}

		if ( params.gid ) {
			params.gid = parseInt( params.gid, 10 );
		}

		return params;
	};

	// open photoswipe.
	let openPhotoSwipe = function( index, galleryElement, disableAnimation, fromURL ) {
		let pswpElement = doc.querySelector( '.pswp' ),
			gallery,
			options,
			items;

		items = parseThumbnailElements( galleryElement );

		// define options (if needed).
		options = {
			// define gallery index (for URL).
			galleryUID: galleryElement.getAttribute( 'data-pswp-uid' ),
			getThumbBoundsFn: function( index ) {
				// See Options -> getThumbBoundsFn section of documentation for more info.
				let thumbnail   = items[ index ].el.querySelector( 'img' ), // find thumbnail.
					pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
					rect        = thumbnail.getBoundingClientRect();

				return {
					x: rect.left,
					y: rect.top + pageYScroll,
					w: rect.width
				};
			}
		};

		// PhotoSwipe opened from URL.
		if ( fromURL ) {
			if ( options.galleryPIDs ) {
				// parse real index when custom PIDs are used
				// http://photoswipe.com/documentation/faq.html#custom-pid-in-url.
				for ( let j = 0, ji = items.length; j < ji; j++ ) {
					if ( items[ j ].pid == index ) {
						options.index = j;
						break;
					}
				}
			} else {
				// in URL indexes start from 1.
				options.index = parseInt( index, 10 ) - 1;
			}
		} else {
			options.index = parseInt( index, 10 );
		}

		// exit if index not found.
		if ( isNaN( options.index ) ) {
			return;
		}

		if ( disableAnimation ) {
			options.showAnimationDuration = 0;
		}

		// Pass data to PhotoSwipe and initialize it.
		gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options );
		gallery.init();

		// Update current slide for Swiper.
		gallery.listen(
			'afterChange',
			function( e ) {
				if ( 'object' === typeof( window.btyMainSlider ) ) {
					let pos = gallery.items[ gallery.getCurrentIndex() ].position - 1;
					window.btyMainSlider.slideTo( pos, 0 );
				}
			}
		);
	};

	// loop through all gallery elements and bind events.
	let galleryElements = doc.querySelectorAll( '.product-main-slide' );
	if ( galleryElements.length ) {
		for ( let i = 0, l = galleryElements.length; i < l; i++ ) {
			galleryElements[ i ].setAttribute( 'data-pswp-uid', i + 1 );
			galleryElements[ i ].onclick = onThumbnailsClick;
		};

		// Parse URL and open gallery if it contains #&pid=3&gid=1.
		let hashData = photoswipeParseHash();
		if ( hashData.pid && hashData.gid ) {
			openPhotoSwipe( hashData.pid, galleryElements[ hashData.gid - 1 ], true, true );
		};
	}
}

// Product model html structure.
class ProductModel extends HTMLElement {
	constructor() {
		super();

		const poster = this.querySelector( '[id^="deferred-poster-"]' );
		if ( ! poster ) {
			return;
		}

		poster.addEventListener( 'click', this.loadContent.bind( this ) );
	}

	loadContent( focus = true ) {
		if ( ! this.getAttribute( 'loaded' ) ) {
			const content  = document.createElement( 'div' );
			const template = this.querySelector( 'template' );

			if ( template ) {
				content.appendChild( this.querySelector( 'template' ).content.firstElementChild.cloneNode( true ) );

				this.setAttribute( 'loaded', true );

				const deferredElement = this.appendChild( content.querySelector( 'model-viewer' ) );
				if ( focus ) {
					deferredElement.focus();
				}
			}
		}

		Shopify.loadFeatures(
			[
				{
					name: 'model-viewer-ui',
					version: '1.0',
					onLoad: this.setupModelViewerUI.bind( this )
				}
			]
		);
	}

	setupModelViewerUI( errors ) {
		if ( errors ) {
			return;
		}

		this.modelViewerUI = new Shopify.ModelViewerUI( this.querySelector( 'model-viewer' ) );
	}
}

if ( ! customElements.get( 'product-model' ) ) {
	customElements.define( 'product-model', ProductModel );
}

// Product model setup.
window.ProductModel = {
	loadShopifyXR() {
		Shopify.loadFeatures(
			[
				{
					name: 'shopify-xr',
					version: '1.0',
					onLoad: this.setupShopifyXR.bind( this )
				}
			]
		);
	},
	setupShopifyXR( errors ) {
		if ( errors ) {
			return;
		}

		if ( ! window.ShopifyXR ) {
			document.addEventListener( 'shopify_xr_initialized', () => this.setupShopifyXR() );

			return;
		}

		let modelConfig = document.getElementById( 'product-model-config' );
		if ( ! modelConfig ) {
			return;
		}

		window.ShopifyXR.addModels( JSON.parse( modelConfig.textContent ) );
		window.ShopifyXR.setupXRElements();

		modelConfig.remove();
	}
};

// Toggle modal.
function btyToggleModal( doc = document ) {
	let selectors = doc.querySelectorAll( '.modal-toggle-button' ),
		modal     = doc.querySelector( '.product-modal' ),
		close     = modal ? modal.querySelector( '.media-modal-toggle' ) : false;
	if ( ! selectors.length || ! close ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			el.onclick = function() {
				modal.classList.add( 'is-open' );

				let item = modal.querySelector( '[data-media-id="' + el.parentNode.getAttribute( 'data-media-id' ) + '"]' );
				if ( ! item ) {
					return;
				}

				document.documentElement.classList.add( 'overflow-hidden' );
				item.classList.add( 'active' );
			}
		}
	);

	close.onclick = function() {
		let modalActive = modal.querySelector( '.product-model.active' );
		if ( modalActive ) {
			modalActive.classList.remove( 'active' );
		}

		modal.classList.remove( 'is-open' );
		document.documentElement.classList.remove( 'overflow-hidden' );
	}
}

// Sticky add to cart.
function btyStickyAddToCart( doc = document ) {
	let selector = doc.querySelector( '.sticky-add-to-cart' );
	if ( ! selector ) {
		return;
	}

	let image        = selector.querySelector( '.sticky-product-image' ),
		price        = selector.querySelector( '.product-price' ),
		form         = selector.querySelector( '[data-type="add-to-cart-form"]' ),
		formSummary  = selector.closest( '.shopify-section' ).querySelector( '.summary-item .product-buy' ),
		productId    = selector.querySelector( '[name="id"]' ),
		button       = selector.querySelector( '[name="add"]' ),
		qtyInput     = selector.querySelector( '.quantity-input' ),
		variants     = selector.closest( '.shopify-section' ).querySelector( '[data-product-variants]' ),
		quantity     = selector.closest( '.shopify-section' ).querySelector( '[data-inventory-quantity]' ),
		field        = selector.querySelectorAll( '.field-value' ),
		variant_pick = {};

	variants = variants && btyJsonParse( variants.textContent ) || {};
	quantity = quantity && btyJsonParse( quantity.textContent ) || {};

	if ( field.length ) {
		field.forEach(
			function( el ) {
				variant_pick[ el.name ] = el.value;

				el.onchange = function() {
					variant_pick[ el.name ] = el.value;

					let selected = btySelectedVariant( variant_pick, variants, window.btyMainSlider );
					if ( selected ) {
						// Update product variant ID.
						if ( productId ) {
							productId.value = selected.id;
						}

						// Update image on Featured product.
						if ( image && selected.featured_image ) {
							btyImageLoad( image, selected.featured_image.src, selected.featured_media.id, image.parentNode );
						}

						// Update price.
						if ( price ) {
							price.innerHTML = btyPriceHtml( selected.price, selected.compare_at_price, selected.unit_price, selected.unit_price_measurement );
						}

						// Set max quantity.
						if ( qtyInput ) {
							let max = quantity.filter(
								function ( e ) {
									return e.id === selected.id;
								}
							);

							if ( max.length ) {
								let qty = max[0].qty;

								if ( qty > 0 ) {
									if ( Number( qtyInput.value ) > qty ) {
										qtyInput.value = qty;
									}

									qtyInput.setAttribute( 'max', qty );
								} else {
									qtyInput.removeAttribute( 'max' );
								}
							} else {
								qtyInput.removeAttribute( 'max' );
							}
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
				}
			}
		);
	}

	// Scroll to show.
	let summaryAddToCart = doc.querySelector( '.summary-item.add-to-cart' );
	if ( ! summaryAddToCart ) {
		return;
	}

	// Scroll to add to cart.
	const scrollToAddToCart = function() {
		button.addEventListener(
			'click',
			function() {
				if ( window.matchMedia( '(min-width: 768px)' ).matches || ! button.classList.contains( 'add-product-variants' ) || ! formSummary ) {
					return;
				}

				formSummary.scrollIntoView( { behavior: 'smooth', block: 'end', inline: 'end' } );
			}
		);
	}
	scrollToAddToCart();

	const observerSummaryAddToCart = new IntersectionObserver(
		function( entries ) {
			window.addEventListener(
				'resize',
				function() {
					scrollToAddToCart();
				}
			);

			if ( entries[0].boundingClientRect.top < 0 && entries[0].intersectionRatio <= 0 ) {
				selector.classList.add( 'active' );
			} else {
				selector.classList.remove( 'active' );
			}
		}
	);

	observerSummaryAddToCart.observe( summaryAddToCart );
}

// Complementary products.
function btyComplementaryProducts( doc = document ) {
	let selector = doc.querySelector( '.complementary-products-container' );
	if ( ! selector ) {
		return;
	}

	let url = selector.getAttribute( 'data-url' );

	if ( selector.innerHTML.trim() || ! url ) {
		return;
	}

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
				selector.innerHTML = btyGetSectionHtml( res, '.complementary-products-container' );

				btyQuickView( selector );
				btyCarousel( selector );
				btyAnimationImageLoad( selector );
				btyAddToCart( selector );
				btyAccordionHandle( selector );
			}
		).catch(
			function( err ) {
				console.log( err );
			}
		);
}

// Product recommendations.
function btyProductRecommendations( doc = document ) {
	let selector = doc.querySelector( '.product-recommendations' );
	if ( ! selector ) {
		return;
	}

	let url = selector.getAttribute( 'data-url' );

	if ( selector.innerHTML.trim() || ! url ) {
		return;
	}

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
				selector.innerHTML = btyGetSectionHtml( res, '.product-recommendations' );

				btyAddToCart( selector );
				btyQuickView( selector );
				btySwatch( selector );
				btyAnimationImageLoad( selector );
				btyHoverMediaVideo( selector );
				btyQuickAdd( selector );
				btyCarousel( selector );

				// Custom event.
				document.dispatchEvent( new CustomEvent( 'product-card-updated' ) );
			}
		).catch(
			function( err ) {
				console.log( err );
			}
		);
}

document.addEventListener(
	'DOMContentLoaded',
	function() {
		if ( window.ProductModel ) {
			window.ProductModel.loadShopifyXR();
		}

		btyGalleryList();
		btyStickyAddToCart();
		btyToggleModal();
		btyProductGallery();
		btyPhotoswipeHandle();
		btyProductRecommendations();
		btyComplementaryProducts();

		window.addEventListener(
			'resize',
			function() {
				btyProductGallery();
			}
		);
	}
);

document.addEventListener(
	'shopify:section:load',
	function( e ) {
		let section = e.target.closest( 'section.shopify-section' );

		setTimeout(
			function() {
				btyComplementaryProducts( section );
				btyProductRecommendations( section );
				btyStickyAddToCart( section );
			}
		);
	}
);

document.addEventListener(
	'shopify:section:select',
	function( e ) {
		let section = e.target;

		btyGalleryList( section );
		btyProductGallery( section );
		btyPhotoswipeHandle( section );

		setTimeout(
			function() {
				btyComplementaryProducts( section );
				btyProductRecommendations( section );
				btyStickyAddToCart( section );
			}
		);
	}
);

document.addEventListener(
	'shopify:block:select',
	function( e ) {
		let section = e.target.closest( '.shopify-section' );
		if ( ! section ) {
			return;
		}

		btySlider( section, e );
		btyProductGallery( section );
		btyPhotoswipeHandle( section );
		btyStickyAddToCart( section );
	}
);
