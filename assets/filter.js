/**
 * Main collection
 *
 * @package Dev
 */

'use strict';

// Check element inviewport.
function btyInViewport( el ) {
	if ( ! el ) {
		return;
	}

	let rect = el.getBoundingClientRect();

	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= ( window.innerHeight || document.documentElement.clientHeight ) &&
		rect.right <= ( window.innerWidth || document.documentElement.clientWidth )
	);
};

// Toggle nav menu.
function btyToggleNavList( doc = document ) {
	let selectors = doc.querySelectorAll( '.link-arrow' );
	if ( ! selectors.length || 'function' !== typeof( btySlideUp ) || 'function' !== typeof( btySlideDown ) ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			el.onclick = function( e ) {
				e.preventDefault();

				let linkItem = el.parentNode.parentNode,
					linkSub  = linkItem.querySelector( '.link-sub' );
				if ( ! linkSub ) {
					return;
				}

				if ( linkItem.classList.contains( 'active' ) ) {
					btySlideUp( linkSub );
					linkItem.classList.remove( 'active' );
				} else {
					btySlideDown( linkSub );
					linkItem.classList.add( 'active' );
				}

				// Remove active siblings.
				for ( let i = 0, j = linkItem.parentNode.children.length; i < j; i++ ) {
					let sb = linkItem.parentNode.children[i];
					if ( ! sb.classList.contains( 'active' ) || linkItem === sb || sb.nodeName !== linkItem.nodeName ) {
						continue;
					}

					sb.classList.remove( 'active' );
					let siblingsSub = sb.querySelector( '.link-sub' );
					if ( ! siblingsSub ) {
						continue;
					}

					btySlideUp( siblingsSub );
				}
			}
		}
	);
}

// Range slider.
function btyRangeSlider( doc = document ) {
	let selectors = doc.querySelectorAll( '.price-slider' );
	if ( ! selectors.length || 'undefined' === typeof( window.noUiSlider ) ) {
		return;
	}

	selectors.forEach(
		function( el ) {
			let template = el.querySelector( 'template' );
			if ( ! template || 'function' !== typeof( btyJsonParse ) || 'object' === typeof( el.noUiSlider ) ) {
				return;
			}

			let options = btyJsonParse( template.content.textContent ),
				input   = el.parentNode.querySelectorAll( '.price-value' );

			options.format = {
				from: function( value ) {
					return ( options.range.min == value ? value : Math.round( value ) );
				},
				to: function( value ) {
					return ( options.range.max == value ? value : Math.round( value ) );
				}
			};

			window.btyRangePrice = noUiSlider.create( el, options );

			// Remove template html.
			if ( template ) {
				template.remove();
			}

			// Register min/max value.
			let minValue = 0,
				maxValue = 0;

			// Update event.
			btyRangePrice.on(
				'slide',
				function( values ) {
					// Update unput value.
					if ( input.length ) {
						input.forEach(
							function( ip ) {
								let inputType  = ip.getAttribute( 'data-type' ),
									inputValue = Number( ip.value | 0 );

								if ( 'min' === inputType ) {
									minValue = inputValue;
									ip.value = values[0];
								} else if ( 'max' === inputType ) {
									ip.value = values[1];
									maxValue = inputValue;
								}
							}
						);
					}
				}
			);

			// End event.
			btyRangePrice.on(
				'change',
				function( values ) {
					// Update unput value.
					if ( input.length ) {
						let eventChange = new Event( 'change', { bubbles: true } ),
							inputVal    = [];
						input.forEach(
							function( ip ) {
								inputVal.push( Number( ip.value ) );
							}
						);

						// Trigger change event.
						input[0].dispatchEvent( eventChange );
					}
				}
			);

			// Set value.
			if ( input.length ) {
				input.forEach(
					function( ip ) {
						let inputType  = ip.getAttribute( 'data-type' ),
							inputValue = Number( ip.value || 0 );
						// When first load.
						if ( 'min' === inputType ) {
							minValue = inputValue;
						} else if ( 'max' === inputType ) {
							maxValue = inputValue;
						}

						// When input change.
						ip.oninput = function() {
							let minInput      = Number( ip.getAttribute( 'min' ) || 0 ),
								maxInput      = Number( ip.getAttribute( 'max' ) || 0 ),
								newInputValue = Number( ip.value || 0 );

							if ( newInputValue < minInput ) {
								ip.value = minInput;
							}

							if ( newInputValue > maxInput ) {
								ip.value = maxInput;
							}

							if ( 'min' === inputType ) {
								minValue = Number( ip.value || 0 );
							} else if ( 'max' === inputType ) {
								maxValue = Number( ip.value || 0 );
							}

							if ( minValue != maxValue && minValue < maxValue ) {
								btyRangePrice.set( [minValue, maxValue] );
							}
						}
					}
				);
			}
		}
	);
}

// Remove params on string.
function btyRemoveParam( key, url ) {
	let param,
		rtn         = url.split( '?' )[0],
		paramsArr   = [],
		queryString = url.includes( '?' ) ? url.split( '?' )[1] : '';
	if ( '' !== queryString ) {
		paramsArr = queryString.split( '&' );

		for ( let i = paramsArr.length - 1; i >= 0; i -= 1 ) {
			param = paramsArr[i].split( '=' )[0];

			if ( param === key ) {
				paramsArr.splice( i, 1 );
			}
		}

		if ( paramsArr.length ) {
			rtn = rtn + '?' + paramsArr.join( '&' );
		}
	}

	return rtn;
}

// Pagination.
function btyPagination( callback, currentUrl ) {
	let pag = document.querySelectorAll( '.pagination a' );
	if ( ! pag.length ) {
		return;
	}

	pag.forEach(
		function( el ) {
			el.onclick = function( e ) {
				e.preventDefault();

				let page = el.getAttribute( 'data-page' ) || 2;
				currentUrl.searchParams.set( 'page', Number( page ) );

				callback( currentUrl );
			}
		}
	);
}

// Search field.
function btyMiniSearch( doc = document ) {
	let searchField = doc.querySelector( '[name="q"]' );
	if ( ! searchField ) {
		return;
	}

	let miniResults = searchField.parentNode.querySelector( '.mini-results' );
	if ( ! miniResults ) {
		return;
	}

	searchField.oninput = function() {
		let value = searchField.value.trim();
		if ( ! value ) {
			miniResults.innerHTML = '';

			return;
		}

		btySearchDelay(
			function() {
				searchField.parentNode.classList.add( 'searching' );

				let url = btyGlobals.search_url + '?section_id=mini-search&type=' + btyGlobals.search_type + '&options[prefix]=last&options[unavailable_products]=' + btyGlobals.search_unavailable + '&limit=4&q=' + value;
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
							miniResults.innerHTML = btyGetSectionHtml( res, '.fetch-search' );
						}
					).catch(
						function( e ) {
							console.error( e );
						}
					).finally(
						function() {
							searchField.parentNode.classList.remove( 'searching' );

							// Custom event.
							document.dispatchEvent( new CustomEvent( 'product-card-updated' ) );
						}
					);
			},
			300
		)
	}

	searchField.onfocus = function() {
		miniResults.classList.remove( 'hidden' );
	}

	searchField.onblur = function() {
		setTimeout(
			function() {
				miniResults.classList.add( 'hidden' );
			},
			200
		);
	}
}

// Desktop filter.
function btyDesktopFilters( doc = document ) {
	let currentUrl = new URL( window.location.href ),
		wrapper    = doc.querySelector( '.has-product-filters' );

	if ( ! wrapper ) {
		return;
	}

	let collections = wrapper ? wrapper.querySelector( '.collections' ) : false,
		form        = wrapper ? wrapper.querySelector( '.filter-form' ) : false;

	// Toggle filters.
	let toggleFilters = function() {
		let items = form ? form.querySelectorAll( '.filter-item[data-motion-reduce]' ) : [];
		if ( ! items.length ) {
			return;
		}

		items.forEach(
			function( el ) {
				el.addEventListener(
					'click',
					function() {
						let sibling = el.parentNode.querySelector( '.filter-item[open]' );
						if ( ! sibling || sibling === el ) {
							return;
						}

						sibling.removeAttribute( 'open' );
					}
				);
			}
		);

		document.addEventListener(
			'click',
			function( e ) {
				let target = e.target,
					parent = target.closest( '.filter-item' );

				if ( parent ) {
					return;
				}

				let active = form.querySelector( '.filter-item[open]' );
				if ( active ) {
					active.removeAttribute( 'open' );
				}
			}
		);
	}

	// Sort by.
	let sortBy = function() {
		let select = form ? ( form.querySelector( '[name="sort_by"]' ) || wrapper.querySelector( '.layer-last-header [name="sort_by"]' ) ) : false;
		if ( ! select ) {
			return;
		}

		select.onchange = function () {
			if ( ! select.value.trim() ) {
				return;
			}

			currentUrl = new URL( window.location.href );
			currentUrl.searchParams.set( 'sort_by', select.value );

			desktopFiltering( currentUrl, 'sort_by' );
		}
	}

	// Filters.
	let sidebarFilters = function() {
		let filters = form ? form.querySelectorAll( '[name^="filter."]' ) : [];
		if ( ! filters.length ) {
			return;
		}

		filters.forEach(
			function( el ) {
				el.onchange = function() {
					let formData           = new FormData( form ),
						searchParamsString = window.location.pathname + '?' + new URLSearchParams( formData ).toString();

					currentUrl = new URL( searchParamsString, window.location.origin );

					desktopFiltering( currentUrl, 'filters' );
				}
			}
		);
	}

	// Reset filter.
	let resetFilters = function() {
		let selectors = wrapper.querySelectorAll( '.active-filter .active-filter-item, .item-reset' );
		if ( ! selectors.length ) {
			return;
		}

		selectors.forEach(
			function( el ) {
				el.addEventListener(
					'click',
					function( e ) {
						e.preventDefault();

						currentUrl = new URL( el.href, window.location.origin );

						desktopFiltering( currentUrl );
					}
				);
			}
		);
	}

	// Remove empty filter.
	let removeEmptyFilter = function( wrapper ) {
		let list = wrapper.querySelectorAll( '.item-list' );
		if ( ! list.length ) {
			return;
		}

		list.forEach(
			function( el ) {
				if ( el.innerHTML === '' ) {
					el.parentNode.parentNode.remove();
				}
			}
		);
	}

	// Scroll to filters.
	let scrollToFilters = function() {
		let selector = wrapper.querySelector( '.filter-form-wrapper' );
		if ( ! selector ) {
			return;
		}

		let rect = selector.getBoundingClientRect();

		if ( rect.top < 0 ) {
			selector.scrollIntoView( { behavior: 'smooth' } );
		}
	}

	// Seach field.
	btyMiniSearch( wrapper );

	// Filtering.
	let desktopFiltering = function( currentUrl, dataType = false ) {
		let loadingBar = document.querySelector( '.loading-bar' );
		if ( loadingBar ) {
			loadingBar.classList.add( 'active' );
			loadingBar.style.transform = 'scaleX(0.7)';
		}

		// For search results page.
		let searchField = wrapper.querySelector( '[name="q"]' );
		if ( searchField ) {
			currentUrl.searchParams.set( 'q', searchField.value.trim() );
			currentUrl.searchParams.set( 'type', btyGlobals.search_type );
			currentUrl.searchParams.set( 'options[prefix]', 'last' );
			currentUrl.searchParams.set( 'options[unavailable_products]', btyGlobals.search_unavailable );
		}

		// Add loading animation.
		document.documentElement.setAttribute( 'data-filtering', '' );

		// Update current url.
		if ( currentUrl ) {
			// Remove 'page' param when using infinite scroll.
			let string = currentUrl.toString();
			if ( collections && collections.classList.contains( 'infinite-scroll' ) && ['infinite-scroll', 'filters', 'sort_by'].includes( dataType ) ) {
				string = btyRemoveParam( 'page', string );
			}

			window.history.pushState(
				{
					path: string
				},
				'',
				string
			);
		}

		let paramsUrl  = currentUrl && currentUrl.search ? '&' + currentUrl.search.slice( 1 ) : '',
			sectionUrl = window.location.pathname + '?section_id=' + wrapper.getAttribute( 'data-id' ) + paramsUrl;

		fetch( sectionUrl )
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
					let activeFilters  = wrapper.querySelector( '.active-filter' ),
						filterForm     = wrapper.querySelector( '.filter-form' ),
						resultsCount   = wrapper.querySelector( '.results-count' ),
						searchResults  = wrapper.querySelector( '.search-result-info' ),
						products       = wrapper.querySelector( '.products' ),
						pagination     = wrapper.querySelector( '.pagination' ),
						infiniteScroll = wrapper.querySelector( '.infinite-loading' );

					// Active filter.
					if ( activeFilters ) {
						activeFilters.innerHTML = btyGetSectionHtml( res, '.active-filter' );
					}

					// Resuls count.
					if ( resultsCount ) {
						resultsCount.innerHTML = btyGetSectionHtml( res, '.results-count' );
					}

					// Search resuls info.
					if ( searchResults ) {
						searchResults.innerHTML = btyGetSectionHtml( res, '.search-result-info' );
					}

					// Collapse/enpand filter group.
					if ( filterForm && 'infinite-scroll' !== dataType ) {
						let div     = document.createElement( 'div' ),
							filters = filterForm.querySelectorAll( '.filter-item' );

						div.innerHTML = btyGetSectionHtml( res, '.filter-form', 'outer' );

						// Loop each filter.
						if ( filters.length ) {
							filters.forEach(
								function( el ) {
									let tmpIndex = el.getAttribute( 'data-index' ) || 0,
										item     = div.querySelector( '.filter-item[data-index="' + tmpIndex + '"]' );

									if ( ! item ) {
										return;
									}

									// Set open state.
									if ( 'string' === typeof( el.getAttribute( 'open' ) ) ) {
										item.setAttribute( 'open', '' );
									}
								}
							);
						}

						// Remove empty filter.
						removeEmptyFilter( div );

						// Update html.
						filterForm.innerHTML = btyGetSectionHtml( div.innerHTML, '.filter-form' );
					}

					// For collections page.
					if ( collections ) {
						if ( collections && collections.classList.contains( 'infinite-scroll' ) ) {
							if ( 'infinite-scroll' === dataType ) {
								let tmpRes   = new DOMParser().parseFromString( res, 'text/html' ),
									tmpCards = tmpRes.querySelectorAll( '.product-card[data-product-id]' );

								if ( tmpCards.length ) {
									tmpCards.forEach(
										function( el ) {
											let tmpId = el.getAttribute( 'data-product-id' );

											el.classList.add( 'ready' );

											if ( collections.querySelector( '.product-card[data-product-id="' + tmpId + '"]' ) ) {
												return;
											}

											if ( products ) {
												products.insertAdjacentHTML( 'beforeend', el.outerHTML );
											}
										}
									);
								}

								// Scroll to animation image.
								let scrollAnimationImage = function() {
									let itemsReady = collections.querySelectorAll( '.product-card.ready' );
									if ( ! itemsReady.length ) {
										return;
									}

									const onIntersectionChange = new IntersectionObserver(
										function( entries, observer ) {
											entries.forEach(
												function( entry ) {
													if ( entry.isIntersecting ) {
														let el = entry.target;
														if ( el.classList.contains( 'animate' ) ) {
															return;
														}

														el.classList.add( 'animate' );

														observer.unobserve( el );
													}
												}
											);
										},
										{
											threshold: 0
										}
									);

									itemsReady.forEach(
										function( el ) {
											onIntersectionChange.observe( el );
										}
									);
								}

								scrollAnimationImage();
								window.addEventListener( 'scroll', scrollAnimationImage );
							} else if ( products ) {
								products.innerHTML = btyGetSectionHtml( res, '.products' );
							}
						} else if ( products ) {
							// For search results.
							products.innerHTML = btyGetSectionHtml( res, '.products' );
						}

						// Infinite scroll loading.
						let tmpInfiniteScroll = btyGetSectionHtml( res, '.infinite-loading' );
						if ( infiniteScroll ) {
							if ( tmpInfiniteScroll ) {
								infiniteScroll.innerHTML = tmpInfiniteScroll;
								infiniteScroll.classList.remove( 'visible' );
							} else {
								infiniteScroll.remove();
							}
						} else if ( products && tmpInfiniteScroll ) {
							products.insertAdjacentHTML( 'afterend', '<div class="infinite-loading">' + tmpInfiniteScroll + '</div>' );
						}
					} else if ( wrapper.querySelector( '.search-content' ) && products ) {
						// For search page.
						products.innerHTML = btyGetSectionHtml( res, '.products' );
					}

					// Product pagination.
					if ( pagination ) {
						pagination.innerHTML = btyGetSectionHtml( res, '.pagination' );
					}

					// Re-init some functions.
					toggleFilters();
					sidebarFilters();
					btyPagination( desktopFiltering, currentUrl );
					btyAnimationImageLoad( wrapper );
					sortBy();
					resetFilters();
					btyRangeSlider( wrapper );
					btyDesktopFilters( document );

					if ( 'function' === typeof( btyToggleDetails ) ) {
						btyToggleDetails( wrapper );
					}

					if ( 'function' === typeof( btyHoverMediaVideo ) ) {
						btyHoverMediaVideo( wrapper );
					}

					if ( 'function' === typeof( btyQuickView ) ) {
						btyQuickView( wrapper );
					}

					if ( 'function' === typeof( btyQuickAdd ) ) {
						btyQuickAdd( wrapper );
					}

					if ( 'function' === typeof( btySwatch ) ) {
						btySwatch( wrapper );
					}

					if ( 'function' === typeof( btyAccordionHandle ) ) {
						btyAccordionHandle( wrapper );
					}

					if ( 'function' === typeof( btyAddToCart ) ) {
						btyAddToCart( wrapper );
					}
				}
			).catch(
				function( e ) {
					console.error( e );
				}
			).finally(
				function() {
					// Remove animation.
					document.documentElement.removeAttribute( 'data-filtering' );

					// Scroll to filters.
					if ( 'infinite-scroll' !== dataType ) {
						scrollToFilters();
					}

					// Loading bar.
					if ( loadingBar ) {
						loadingBar.style.transform = 'scaleX(1)';
						loadingBar.setAttribute( 'data-finished', '' );

						loadingBar.addEventListener(
							'transitionend',
							function( e ) {
								if ( 'transform' === e.propertyName && 'string' === typeof( loadingBar.getAttribute( 'data-finished' ) ) ) {
									loadingBar.classList.remove( 'active' );
									loadingBar.removeAttribute( 'data-finished' );
									loadingBar.style.transform = 'scaleX(0)';
								}
							}
						);
					}

					// Custom event.
					document.dispatchEvent( new CustomEvent( 'product-card-updated' ) );
				}
			);
	}

	// Infinite scroll.
	let infiniteScroll = function() {
		let selector = collections ? collections.querySelector( '.infinite-loading' ) : false;
		if ( ! selector || selector.classList.contains( 'visible' ) ) {
			return;
		}

		if ( btyInViewport( selector ) ) {
			selector.classList.add( 'visible' );

			let dataPage = selector.querySelector( 'span[data-page]' );
			if ( ! dataPage ) {
				return;
			}

			// Fetching.
			currentUrl = new URL( window.location.href );
			currentUrl.searchParams.set( 'page', Number( dataPage.getAttribute( 'data-page' ) ) );
			desktopFiltering( currentUrl, 'infinite-scroll' );
		}
	}

	window.addEventListener(
		'scroll',
		function() {
			infiniteScroll();
		}
	);

	toggleFilters();
	infiniteScroll();
	sidebarFilters();
	sortBy();
	resetFilters();
	removeEmptyFilter( wrapper );

	if ( window.matchMedia( '(min-width: 992px)' ).matches ) {
		btyPagination( desktopFiltering, currentUrl );
	}
}

// Mobile filters.
function btyMobileFilters( doc = document ) {
	let wrapper      = doc.querySelector( '.has-product-filters' ),
		collections  = wrapper ? wrapper.querySelector( '.collections' ) : false,
		mobileFilter = wrapper ? wrapper.querySelector( '.mobile-filter' ) : false,
		open         = mobileFilter ? mobileFilter.querySelector( '.filter-sort' ) : false,
		close        = mobileFilter ? mobileFilter.querySelector( '.close-button' ) : false,
		back         = mobileFilter ? mobileFilter.querySelector( '.back-button' ) : false,
		active       = mobileFilter ? mobileFilter.querySelector( '.mobile-active-filter' ) : false,
		modal        = mobileFilter ? mobileFilter.querySelector( '.mobile-filter-modal' ) : false,
		form         = mobileFilter ? mobileFilter.querySelector( '.mobile-filter-form' ) : false,
		items        = form ? form.querySelectorAll( '.filter-item' ) : [],
		reset        = form ? form.querySelector( '.form-footer .active-filter-item' ) : false,
		submit       = form ? form.querySelector( '[type="submit"]' ) : false;

	if ( ! open || ! close || ! back || ! items.length || ! modal || ! reset || ! submit ) {
		return;
	}

	let currentUrl = new URL( window.location.href );

	// Seach field.
	btyMiniSearch( wrapper );

	// Remove filter.
	const removeFilter = function() {
		let selectors = mobileFilter.querySelectorAll( 'a.active-filter-item' );
		if ( ! selectors.length ) {
			return;
		}

		selectors.forEach(
			function( el ) {
				el.addEventListener(
					'click',
					function( e ) {
						e.preventDefault();

						currentUrl = new URL( el.href, window.location.origin );

						mobileFiltering( currentUrl );
					}
				);
			}
		);
	}

	// Scroll to filters.
	let scrollToFilters = function() {
		let selector = wrapper.querySelector( '.mobile-filter' );
		if ( ! selector ) {
			return;
		}

		let rect = selector.getBoundingClientRect();

		if ( rect.top < 0 ) {
			selector.scrollIntoView( { behavior: 'smooth' } );
		}
	}

	// Filtering.
	let mobileFiltering = function( currentUrl, dataType = false ) {
		let loadingBar = document.querySelector( '.loading-bar' );
		if ( loadingBar ) {
			loadingBar.classList.add( 'active' );
			loadingBar.style.transform = 'scaleX(0.7)';
		}

		// For search results page.
		let searchField = wrapper.querySelector( '[name="q"]' );
		if ( searchField ) {
			currentUrl.searchParams.set( 'q', searchField.value.trim() );
			currentUrl.searchParams.set( 'type', btyGlobals.search_type );
			currentUrl.searchParams.set( 'options[prefix]', 'last' );
			currentUrl.searchParams.set( 'options[unavailable_products]', btyGlobals.search_unavailable );
		}

		document.documentElement.setAttribute( 'data-filtering', '' );

		// Update current url.
		if ( currentUrl ) {
			// Remove 'page' param when using infinite scroll.
			let string = currentUrl.toString();
			if ( collections && collections.classList.contains( 'infinite-scroll' ) && ['infinite-scroll', 'filters', 'sort_by'].includes( dataType ) ) {
				string = btyRemoveParam( 'page', string );
			}

			window.history.pushState(
				{
					path: string
				},
				'',
				string
			);
		}

		let paramsUrl  = currentUrl && currentUrl.search ? '&' + currentUrl.search.slice( 1 ) : '',
			sectionUrl = window.location.pathname + '?section_id=' + wrapper.getAttribute( 'data-id' ) + paramsUrl;

		fetch( sectionUrl )
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
					let pagination     = wrapper.querySelector( '.pagination' ),
						products       = wrapper.querySelector( '.products' ),
						resultsCount   = wrapper.querySelector( '.results-count' ),
						infiniteScroll = wrapper.querySelector( '.infinite-loading' );

					// Active filter.
					if ( active ) {
						active.innerHTML = btyGetSectionHtml( res, '.mobile-active-filter' );
					}

					// Results count.
					if ( resultsCount ) {
						resultsCount.innerHTML = btyGetSectionHtml( res, '.results-count' );
					}

					// Filters.
					if ( modal ) {
						modal.innerHTML = btyGetSectionHtml( res, '.mobile-filter-modal' );
					}

					// Product grid.
					if ( collections ) {
						if ( collections.classList.contains( 'infinite-scroll' ) ) {
							if ( 'infinite-scroll' === dataType ) {
								let tmpRes = new DOMParser().parseFromString( res, 'text/html' ),
									col1   = wrapper.querySelector( '.col-1' ).lastElementChild,
									col2   = wrapper.querySelector( '.col-2' ).lastElementChild;

								// Append product columns.
								if ( col1 && col2 ) {
									let tmpCards = tmpRes.querySelectorAll( '.product-card[data-product-id]' ),
										rect1    = col1.getBoundingClientRect(),
										top1     = rect1.top,
										rect2    = col2.getBoundingClientRect(),
										top2     = rect2.top;

									if ( tmpCards.length ) {
										tmpCards.forEach(
											function( el, index ) {
												let tmpId = el.getAttribute( 'data-product-id' ),
													isInt = index / 2;

												el.classList.add( 'ready' );

												if ( wrapper.querySelector( '.product-card[data-product-id="' + tmpId + '"]' ) ) {
													return;
												}

												if ( top1 > top2 ) {
													let itemTop1Top2 = Number.isInteger( isInt ) ? col2 : col1;

													itemTop1Top2.parentNode.insertAdjacentHTML( 'beforeend', el.outerHTML );
												} else {
													let itemTop2Top1 = Number.isInteger( isInt ) ? col1 : col2;

													itemTop2Top1.parentNode.insertAdjacentHTML( 'beforeend', el.outerHTML );
												}
											}
										);
									}
								}

								// Scroll to animation image.
								let scrollAnimationImage = function() {
									let itemsReady = wrapper.querySelectorAll( '.product-card.ready' );
									if ( ! itemsReady.length ) {
										return;
									}

									const onIntersectionChange = new IntersectionObserver(
										function( entries, observer ) {
											entries.forEach(
												function( entry ) {
													if ( entry.isIntersecting ) {
														let el = entry.target;
														if ( el.classList.contains( 'animate' ) ) {
															return;
														}

														el.classList.add( 'animate' );

														observer.unobserve( el );
													}
												}
											);
										},
										{
											threshold: 0
										}
									);

									itemsReady.forEach(
										function( el ) {
											onIntersectionChange.observe( el );
										}
									);
								}

								scrollAnimationImage();
								window.addEventListener( 'scroll', scrollAnimationImage );
							} else {
								products.innerHTML = btyGetSectionHtml( res, '.products' );
							}
						} else if ( products ) {
							products.innerHTML = btyGetSectionHtml( res, '.products' );
						}
					} else if ( wrapper.parentNode.parentNode.classList.contains( 'search-page-section' ) && products ) {
						products.innerHTML = btyGetSectionHtml( res, '.products' );
					}

					// Product pagination.
					if ( pagination ) {
						pagination.innerHTML = btyGetSectionHtml( res, '.pagination' );
					}

					// Infinite scroll.
					let tmpInfiniteScroll = btyGetSectionHtml( res, '.infinite-loading' );
					if ( infiniteScroll ) {
						if ( tmpInfiniteScroll ) {
							infiniteScroll.innerHTML = tmpInfiniteScroll;
							infiniteScroll.classList.remove( 'visible' );
						} else {
							infiniteScroll.remove();
						}
					} else if ( products && tmpInfiniteScroll ) {
						products.insertAdjacentHTML( 'afterend', '<div class="infinite-loading">' + tmpInfiniteScroll + '</div>' );
					}

					// Re-init some functions.
					btyMobileFilters();
					btyAnimationImageLoad( wrapper );
					btyRangeSlider( wrapper );
					removeFilter();
					btyPagination( mobileFiltering, currentUrl );

					if ( 'function' === typeof( btyToggleDetails ) ) {
						btyToggleDetails( wrapper );
					}

					if ( 'function' === typeof( btyQuickView ) ) {
						btyQuickView( wrapper );
					}

					if ( 'function' === typeof( btySwatch ) ) {
						btySwatch( wrapper );
					}

					if ( 'function' === typeof( btyQuickAdd ) ) {
						btyQuickAdd( wrapper );
					}

					if ( 'function' === typeof( btyAccordionHandle ) ) {
						btyAccordionHandle( wrapper );
					}

					if ( 'function' === typeof( btyAddToCart ) ) {
						btyAddToCart( wrapper );
					}
				}
			).catch(
				function( e ) {
					console.error( e );
				}
			).finally(
				function() {
					document.documentElement.removeAttribute( 'data-filtering' );

					// Scroll to filters.
					if ( 'infinite-scroll' !== dataType ) {
						scrollToFilters();
					}

					// Loading bar.
					if ( loadingBar ) {
						loadingBar.style.transform = 'scaleX(1)';
						loadingBar.setAttribute( 'data-finished', '' );

						loadingBar.addEventListener(
							'transitionend',
							function( e ) {
								if ( 'transform' === e.propertyName && 'string' === typeof( loadingBar.getAttribute( 'data-finished' ) ) ) {
									loadingBar.classList.remove( 'active' );
									loadingBar.removeAttribute( 'data-finished' );
									loadingBar.style.transform = 'scaleX(0)';
								}
							}
						);
					}

					// Custom event.
					document.dispatchEvent( new CustomEvent( 'product-card-updated' ) );
				}
			);
	}

	// Heading.
	let heading     = mobileFilter.querySelector( '.form-header .heading' ),
		headingText = heading ? heading.innerHTML : '';

	// Toggle filter.
	mobileFilter.onclick = function( e ) {
		let target = e.target;

		if ( open === target ) {
			mobileFilter.classList.add( 'is-open' );
		}

		// Get current heading.
		if ( target.classList.contains( 'filter-heading' ) && heading ) {
			let currentHeadingText = target.querySelector( '.heading-text' );
			if ( currentHeadingText ) {
				if ( currentHeadingText.hasAttribute( 'data-helptext' ) ) {
					heading.innerHTML = currentHeadingText.innerHTML + '<span class="item-helptext">' + currentHeadingText.getAttribute( 'data-helptext' ) + '</span>';
				} else {
					heading.innerHTML = currentHeadingText.innerHTML;
				}
			}
		}

		// Hide model.
		if ( close === target || modal === target || submit === target || 'per_page' === target.name ) {
			mobileFilter.classList.remove( 'is-open' );
		}

		// Remove transform state.
		if ( back === target || reset === target || submit === target || 'per_page' === target.name ) {
			let activeItem = form.querySelector( '.filter-item.active' );
			if ( activeItem ) {
				activeItem.classList.remove( 'active' );
			}

			mobileFilter.classList.remove( 'transform' );

			// Reset heading.
			if ( headingText ) {
				heading.innerHTML = headingText;
			}
		}

		// Submit.
		if ( submit === target ) {
			e.preventDefault();

			let formData           = new FormData( form ),
				searchParamsString = window.location.pathname + '?' + new URLSearchParams( formData ).toString();

			currentUrl = new URL( searchParamsString, window.location.origin );

			mobileFiltering( currentUrl );
		}
	}

	// Show filter.
	items.forEach(
		function( el ) {
			let heading = el.querySelector( '.filter-heading' ),
				content = el.querySelector( '.filter-content' );

			if ( ! heading || ! content ) {
				return;
			}

			heading.onclick = function() {
				mobileFilter.classList.add( 'transform' );
				el.classList.add( 'active' );
			}
		}
	);

	removeFilter();

	if ( window.matchMedia( '(max-width: 991px)' ).matches ) {
		btyPagination( mobileFiltering, currentUrl );
	}
}

// DOM Loaded.
document.addEventListener(
	'DOMContentLoaded',
	function() {
		btyToggleNavList();
		btyRangeSlider();
		btyDesktopFilters();
		btyMobileFilters();
	}
);

document.addEventListener(
	'shopify:section:select',
	function( e ) {
		btyToggleNavList( e.target );
		btyRangeSlider( e.target );
		btyDesktopFilters( e.target );
		btyMobileFilters( e.target );
	}
);
