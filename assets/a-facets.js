class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    }
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
    if (countContainer){
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop){
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl) ?
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) :
        FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then(response => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements =
      parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter');
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    }
    const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    })

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    const targetElementAccessibility = target.querySelector('.facets__summary');
    const sourceElementAccessibility = source.querySelector('.facets__summary');

    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }

    if (targetElementAccessibility && sourceElementAccessibility) {
      target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      }
    ]
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'))
      this.onSubmitForm(searchParams, event)
    } else {
      const forms = [];
      const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            const noJsElements = document.querySelectorAll('.no-js-list');
            noJsElements.forEach((el) => el.remove());
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event)
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.numericInputs = Array.from(this.querySelectorAll('input.field__input'));
    this.sliderMin = this.querySelector('.price-slider__input--min');
    this.sliderMax = this.querySelector('.price-slider__input--max');
    this.slider = this.querySelector('.price-slider');

    // Number inputs -> validate and sync sliders
    this.numericInputs.forEach((el) => {
      el.addEventListener('change', this.onRangeChange.bind(this));
      el.addEventListener('input', this.onNumberInput.bind(this));
    });

    // Slider inputs -> sync numbers
    if (this.sliderMin && this.sliderMax) {
      this.sliderMin.addEventListener('input', this.onSliderInput.bind(this));
      this.sliderMax.addEventListener('input', this.onSliderInput.bind(this));
      // Initialize track fill
      this.updateSliderTrack();
    }
    if (this.slider) {
      this.slider.addEventListener('pointerdown', this.onSliderClick.bind(this));
    }
    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
    // keep sliders aligned after manual number changes
    if (this.sliderMin && this.sliderMax) {
      const [minInput, maxInput] = this.numericInputs;
      if (minInput && minInput.value !== '') this.sliderMin.value = minInput.value;
      if (maxInput && maxInput.value !== '') this.sliderMax.value = maxInput.value;
      this.updateSliderTrack();
    }
  }

  onSliderClick(event) {
    if (!this.sliderMin || !this.sliderMax) return;
    const rect = this.slider.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const minBound = Number(this.sliderMin.min || 0);
    const maxBound = Number(this.sliderMin.max || this.sliderMax.max || 100);
    const clickedValue = Math.round(minBound + ratio * (maxBound - minBound));

    const currentMin = Number(this.sliderMin.value || minBound);
    const currentMax = Number(this.sliderMax.value || maxBound);

    // Decide which handle is closer to the click
    const distanceToMin = Math.abs(clickedValue - currentMin);
    const distanceToMax = Math.abs(clickedValue - currentMax);
    if (distanceToMin <= distanceToMax) {
      // Move min handle, but ensure it does not pass max
      const newMin = Math.min(clickedValue, currentMax);
      this.sliderMin.value = String(newMin);
      if (this.numericInputs[0]) this.numericInputs[0].value = String(newMin);
    } else {
      // Move max handle, but ensure it does not go below min
      const newMax = Math.max(clickedValue, currentMin);
      this.sliderMax.value = String(newMax);
      if (this.numericInputs[1]) this.numericInputs[1].value = String(newMax);
    }

    this.updateSliderTrack();

    // Trigger form update via number input event
    if (this.numericInputs[1]) {
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      this.numericInputs[1].dispatchEvent(inputEvent);
    }
  }

  onNumberInput() {
    // while typing, reflect to slider without submitting
    if (!this.sliderMin || !this.sliderMax) return;
    const [minInput, maxInput] = this.numericInputs;
    if (minInput) this.sliderMin.value = minInput.value || 0;
    if (maxInput) this.sliderMax.value = maxInput.value || this.sliderMax.max;
    this.updateSliderTrack();
  }

  onSliderInput(event) {
    const [minInput, maxInput] = this.numericInputs;
    const minGap = 0; // no enforced gap
    let minVal = Number(this.sliderMin.value);
    let maxVal = Number(this.sliderMax.value);
    if (maxVal - minVal < minGap) {
      if (event.target === this.sliderMin) {
        minVal = maxVal - minGap;
        this.sliderMin.value = String(minVal);
      } else {
        maxVal = minVal + minGap;
        this.sliderMax.value = String(maxVal);
      }
    }
    if (minInput) minInput.value = String(minVal);
    if (maxInput) maxInput.value = String(maxVal);

    this.updateSliderTrack();

    // bubble an input event from a number field so the form auto-submits via existing logic
    if (maxInput) {
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      maxInput.dispatchEvent(inputEvent);
    }
  }

  setMinAndMaxValues() {
    const inputs = this.numericInputs && this.numericInputs.length ? this.numericInputs : this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }

  updateSliderTrack() {
    if (!this.sliderMin || !this.sliderMax) return;
    const min = Number(this.sliderMin.min || 0);
    const max = Number(this.sliderMin.max || this.sliderMax.max || 100);
    const left = ((Number(this.sliderMin.value || min) - min) / (max - min)) * 100;
    const right = ((Number(this.sliderMax.value || max) - min) / (max - min)) * 100;
    const track = this.querySelector('.price-slider__track');
    if (track) {
      track.style.setProperty('--range-left', left + '%');
      track.style.setProperty('--range-right', right + '%');
    }
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);

class CustomDropdown extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const selected = this.querySelector('.custom-dropdown__selected');
    const options = this.querySelector('.custom-dropdown__options');
    const hiddenSelect = this.querySelector('select');
    
    if (!selected || !options || !hiddenSelect) return;

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.contains(event.target)) {
        this.classList.remove('active');
      }
    });

    // Toggle dropdown on click
    selected.addEventListener('click', (e) => {
      e.stopPropagation();
      this.classList.toggle('active');
    });

    // Handle option selection
    options.querySelectorAll('.custom-dropdown__option').forEach((option) => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
        const text = option.textContent.trim();
        
        // Update selected text
        selected.textContent = text;
        
        // Update hidden select value
        hiddenSelect.value = value;
        
        // Update selected state
        options.querySelectorAll('.custom-dropdown__option').forEach(opt => {
          opt.classList.remove('custom-dropdown__option--selected');
        });
        option.classList.add('custom-dropdown__option--selected');
        
        // Close dropdown
        this.classList.remove('active');
        
        // Trigger input event to trigger form submission
        // The event will bubble up to the form where FacetFiltersForm is listening for input events
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        hiddenSelect.dispatchEvent(inputEvent);
      });
    });
  }

  disconnectedCallback() {
    // Cleanup if needed
  }
}

customElements.define('custom-dropdown', CustomDropdown);