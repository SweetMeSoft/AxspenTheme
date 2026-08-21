(function() {
class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input", QuantityInput);

class QuantityInputV2 extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
    this.quantityDisplay = this.querySelector(".quantity-number");
    subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.updateDisplay();
    this.validateQtyRules();
  }

  onCartUpdate() {
    this.input.value = 1;
    this.updateDisplay();
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    const targetButton = event.currentTarget;

    if (targetButton.classList.contains("quantity-plus-icon")) {
      this.input.stepUp();
    } else if (targetButton.classList.contains("quantity-minus-icon")) {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) {
      this.input.dispatchEvent(this.changeEvent);
      this.updateDisplay();
      this.validateQtyRules();
    }
  }

  updateDisplay() {
    this.quantityDisplay.textContent = this.input.value;
    let elements = document.getElementsByClassName("product_quantity_input");
    for (let i = 0; i < elements.length; i++) {
      elements[i].value = this.input.value;
    }
    const subtotal = this.closest('.product__info-wrapper').querySelector(`.subtotal-text[id^="subtotal-"]`);
    if (subtotal) {
      const quantity = parseInt(this.input.value) || 1;
      const sectionId = this.input.id.replace('Quantity-', '');
      const priceElement = document.getElementById(`main-price-${sectionId}`);
      if (priceElement) {
        const priceText = priceElement.textContent;
        const price = parseFloat(subtotal.querySelector('.subtotal-amount').getAttribute("price")) / 100.0;
        if (!isNaN(price)) {
          const subtotalAmount = price * quantity;
          // Replace only the number part while keeping currency symbol and position
          subtotal.querySelector('.subtotal-amount').textContent = priceText.replace(/[\d.,]+/, subtotalAmount.toFixed(2));
        }
      }
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    const buttonMinus = this.querySelector(".quantity-minus-icon");
    const buttonPlus = this.querySelector(".quantity-plus-icon");

    if (this.input.min) {
      const min = parseInt(this.input.min);
      buttonMinus.classList.toggle("disabled", value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input-v2", QuantityInputV2);

class AccordeonButton extends HTMLElement { 
  constructor() {
    super();
    this.id_section = this.getAttribute('id-section');
    this.handleAccordion();
  }

  handleAccordion() {
    const DEBOUNCE_DELAY = 100;
    const sectionId = this.id_section;
    let initTimeout;
    let isInitialized = false;

    const handleAccordionClick = (event) => {
      const button = event.target.closest('.accordionButtonStyle-' + sectionId);
      if (!button) return;
      
      button.classList.toggle('active');
      const panel = button.nextElementSibling;
      
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        const contentHeight = panel.scrollHeight;
        const paddingTop = 10;
        const paddingBottom = 10;
        panel.style.maxHeight = (contentHeight + paddingTop + paddingBottom) + 'px';
      }
    }

    const initCollapsibles = () => {
      if (isInitialized) return;
      
      const container = this.querySelector('.singleAccordianContainer-' + sectionId);
      if (!container) return;
      
      // Remove any existing listeners to prevent duplicates
      container.removeEventListener('click', handleAccordionClick);
      // Add single event listener using event delegation
      container.addEventListener('click', handleAccordionClick);
      
      isInitialized = true;
    }

    const safeInitCollapsibles = () => {
      clearTimeout(initTimeout);
      initTimeout = setTimeout(initCollapsibles, DEBOUNCE_DELAY);
    }

    const handleShopifyEvent = (event) => {
      if (event.detail.sectionId === sectionId) {
        isInitialized = false;
        safeInitCollapsibles();
      }
    }
    safeInitCollapsibles();
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', safeInitCollapsibles);

    // Handle Shopify section events in theme editor
    if (Shopify.designMode) {
      document.addEventListener('shopify:section:load', handleShopifyEvent);
      document.addEventListener('shopify:section:unload', handleShopifyEvent);
    }
  }
}

customElements.define('accordeon-button', AccordeonButton);

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector("details");

    this.addEventListener("keyup", this.onKeyUp.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll("summary").forEach((summary) =>
      summary.addEventListener("click", this.onSummaryClick.bind(this))
    );
    this.querySelectorAll("button:not(.localization-selector)").forEach(
      (button) =>
        button.addEventListener("click", this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== "ESCAPE") return;

    const openDetailsElement = event.target.closest("details[open]");
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(
          event,
          this.mainDetailsToggle.querySelector("summary")
        )
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest(".has-submenu");
    const isOpen = detailsElement.hasAttribute("open");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(
        summaryElement.nextElementSibling,
        detailsElement.querySelector("button")
      );
      summaryElement.nextElementSibling.removeEventListener(
        "transitionend",
        addTrapFocus
      );
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen
        ? this.closeMenuDrawer(event, summaryElement)
        : this.openMenuDrawer(summaryElement);

      if (window.matchMedia("(max-width: 990px)")) {
        document.documentElement.style.setProperty(
          "--viewport-height",
          `${window.innerHeight}px`
        );
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add("menu-opening");
        summaryElement.setAttribute("aria-expanded", true);
        parentMenuElement && parentMenuElement.classList.add("submenu-open");
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener(
              "transitionend",
              addTrapFocus
            );
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
    });
    summaryElement.setAttribute("aria-expanded", true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove("menu-opening");
    this.mainDetailsToggle.querySelectorAll("details").forEach((details) => {
      details.removeAttribute("open");
      details.classList.remove("menu-opening");
    });
    this.mainDetailsToggle
      .querySelectorAll(".submenu-open")
      .forEach((submenu) => {
        submenu.classList.remove("submenu-open");
      });
    document.body.classList.remove(
      `overflow-hidden-${this.dataset.breakpoint}`
    );
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent)
      elementToFocus?.setAttribute("aria-expanded", false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (
        this.mainDetailsToggle.hasAttribute("open") &&
        !this.mainDetailsToggle.contains(document.activeElement)
      )
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest("details");
    this.closeSubmenu(detailsElement);
    document.body.classList.remove(
      `overflow-hidden-${this.dataset.breakpoint}`
    );
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest(".submenu-open");
    parentMenuElement && parentMenuElement.classList.remove("submenu-open");
    detailsElement.classList.remove("menu-opening");
    detailsElement
      .querySelector("summary")
      .setAttribute("aria-expanded", false);
    removeTrapFocus(detailsElement.querySelector("summary"));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute("open");
        if (detailsElement.closest("details[open]")) {
          trapFocus(
            detailsElement.closest("details[open]"),
            detailsElement.querySelector("summary")
          );
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define("menu-drawer", MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector(".section-header");
    this.borderOffset =
      this.borderOffset ||
      this.closest(".header-wrapper").classList.contains(
        "header-wrapper--border-bottom"
      )
        ? 1
        : 0;
    document.documentElement.style.setProperty(
      "--header-bottom-position",
      `${parseInt(
        this.header.getBoundingClientRect().bottom - this.borderOffset
      )}px`
    );
    this.header.classList.add("menu-open");

    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
    });

    summaryElement.setAttribute("aria-expanded", true);
    window.addEventListener("resize", this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove("menu-open");
    window.removeEventListener("resize", this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        "--header-bottom-position",
        `${parseInt(
          this.header.getBoundingClientRect().bottom - this.borderOffset
        )}px`
      );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${window.innerHeight}px`
    );
  };
}

customElements.define("header-drawer", HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      "click",
      this.hide.bind(this, false)
    );
    this.addEventListener("keyup", (event) => {
      if (event.code.toUpperCase() === "ESCAPE") this.hide();
    });
    if (this.classList.contains("media-modal")) {
      this.addEventListener("pointerup", (event) => {
        if (
          event.pointerType === "mouse" &&
          !event.target.closest("deferred-media, product-model")
        )
          this.hide();
      });
    } else {
      this.addEventListener("click", (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector(".template-popup");
    document.body.classList.add("overflow-hidden");
    this.setAttribute("open", "");
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove("overflow-hidden");
    document.body.dispatchEvent(new CustomEvent("modalClosed"));
    this.removeAttribute("open");
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define("modal-dialog", ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector("button");

    if (!button) return;
    button.addEventListener("click", () => {
      const modal = document.querySelector(this.getAttribute("data-modal"));
      if (modal) modal.show(button);
    });
  }
}
customElements.define("modal-opener", ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener("click", this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute("loaded")) {
      const content = document.createElement("div");
      content.appendChild(
        this.querySelector("template").content.firstElementChild.cloneNode(true)
      );

      this.setAttribute("loaded", true);
      const deferredElement = this.appendChild(
        content.querySelector("video, model-viewer, iframe")
      );
      if (focus) deferredElement.focus();
      if (
        deferredElement.nodeName == "VIDEO" &&
        deferredElement.getAttribute("autoplay")
      ) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define("deferred-media", DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
      super();
      this.slider = this.querySelector('[id^="Slider-"]');
      this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
      this.enableSliderLooping = false;
      this.currentPageElement = this.querySelector('.slider-counter--current');
      this.pageTotalElement = this.querySelector('.slider-counter--total');
      this.prevButton = this.querySelector('button[name="prev"]');
      this.nextButton = this.querySelector('button[name="next"]');

      // Desktop drag functionality for thumbnail sliders
      this.isThumbnailSlider = this.classList.contains('thumbnail-slider');
      this.isDesktop = window.innerWidth >= 750;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartScrollLeft = 0;
      this.dragThreshold = 5; // Minimum drag distance to start scrolling

      if (!this.slider) return;

      this.initPages();
      const resizeObserver = new ResizeObserver((entries) => this.initPages());
      resizeObserver.observe(this.slider);

      this.slider.addEventListener('scroll', this.update.bind(this));
      
      // Add button event listeners only if buttons exist
      if (this.prevButton) {
          this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
      }
      if (this.nextButton) {
          this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
      }

      // Initialize desktop drag events for thumbnail sliders
      this.initDesktopDragEvents();
      
      // Handle resize events to add/remove drag events
      this.resizeHandler = this.handleResize.bind(this);
      window.addEventListener('resize', this.resizeHandler);
  }

  initPages() {
      this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
      if (this.sliderItemsToShow.length < 2) return;
      this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
      this.slidesPerPage = Math.floor(
          (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
      );
      if( this.slidesPerPage < 1) {
          this.slidesPerPage = 1
      }
      this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
      this.update();
  }

  resetPages() {
      this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
      this.initPages();
  }

  update() {
      // Temporarily prevents unneeded updates resulting from variant changes
      // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
      if (!this.slider) return;

      const previousPage = this.currentPage;
      this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

      if (this.currentPageElement && this.pageTotalElement) {
          this.currentPageElement.textContent = this.currentPage;
          this.pageTotalElement.textContent = this.totalPages;
      }

      if (this.currentPage != previousPage) {
          this.dispatchEvent(
              new CustomEvent('slideChanged', {
                  detail: {
                      currentPage: this.currentPage,
                      currentElement: this.sliderItemsToShow[this.currentPage - 1],
                  },
              })
          );
      }

      if (this.enableSliderLooping) return;

      // Update button states only if buttons exist
      // if (this.prevButton) {
      //     if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      //         this.prevButton.style.display = 'none';
      //     } else {
      //         this.prevButton.style.display = 'block';
      //     }
      // }

      // if (this.nextButton) {
      //     if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      //         this.nextButton.style.display = 'none';
      //     } else {
      //         this.nextButton.style.display = 'block';
      //     }
      // }
  }

  isSlideVisible(element, offset = 0) {
      const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
      return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
      event.preventDefault();
      const step = event.currentTarget.dataset.step || 1;
      this.slideScrollPosition =
          event.currentTarget.name === 'next'
              ? this.slider.scrollLeft + step * this.sliderItemOffset
              : this.slider.scrollLeft - step * this.sliderItemOffset;
      this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
      this.slider.scrollTo({
          left: position,
      });
  }

  // Desktop drag functionality for thumbnail sliders
  initDesktopDragEvents() {
      if (!this.isThumbnailSlider) return;
      
      if (this.isDesktop) {
          this.addDesktopDragEvents();
      } else {
          this.removeDesktopDragEvents();
      }
  }

  addDesktopDragEvents() {
      if (this.dragEventsAdded) return;
      
      this.slider.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.slider.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.slider.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.slider.addEventListener('mouseleave', this.onMouseUp.bind(this));
      
      // Prevent text selection while dragging
      this.slider.addEventListener('selectstart', this.preventDefault.bind(this));
      
      this.dragEventsAdded = true;
  }

  removeDesktopDragEvents() {
      if (!this.dragEventsAdded) return;
      
      this.slider.removeEventListener('mousedown', this.onMouseDown.bind(this));
      this.slider.removeEventListener('mousemove', this.onMouseMove.bind(this));
      this.slider.removeEventListener('mouseup', this.onMouseUp.bind(this));
      this.slider.removeEventListener('mouseleave', this.onMouseUp.bind(this));
      this.slider.removeEventListener('selectstart', this.preventDefault.bind(this));
      
      this.dragEventsAdded = false;
      this.isDragging = false;
  }

  onMouseDown(event) {
      if (!this.isDesktop || !this.isThumbnailSlider) return;
      
      this.isDragging = true;
      this.dragStartX = event.clientX;
      this.dragStartScrollLeft = this.slider.scrollLeft;
      
      // Add visual feedback
      this.slider.style.cursor = 'grabbing';
      this.slider.style.userSelect = 'none';
      
      event.preventDefault();
  }

  onMouseMove(event) {
      if (!this.isDragging || !this.isDesktop || !this.isThumbnailSlider) return;
      
      event.preventDefault();
      
      const deltaX = event.clientX - this.dragStartX;
      
      // Only start scrolling if drag distance exceeds threshold
      if (Math.abs(deltaX) > this.dragThreshold) {
          const newScrollLeft = this.dragStartScrollLeft - deltaX;
          this.slider.scrollLeft = newScrollLeft;
      }
  }

  onMouseUp(event) {
      if (!this.isDesktop || !this.isThumbnailSlider) return;
      
      this.isDragging = false;
      
      // Remove visual feedback
      this.slider.style.cursor = 'grab';
      this.slider.style.userSelect = '';
  }

  preventDefault(event) {
      if (this.isDragging) {
          event.preventDefault();
      }
  }

  handleResize() {
      const wasDesktop = this.isDesktop;
      this.isDesktop = window.innerWidth >= 750;
      
      // Only reinitialize if desktop state changed
      if (wasDesktop !== this.isDesktop) {
          this.initDesktopDragEvents();
      }
  }

  // Cleanup on disconnect
  disconnectedCallback() {
      if (this.resizeHandler) {
          window.removeEventListener('resize', this.resizeHandler);
      }
      this.removeDesktopDragEvents();
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector(".slider-buttons");
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector(".slideshow__slide");
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector(".announcement-bar-slider");
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(
      this.sliderControlWrapper.querySelectorAll(".slider-counter__link")
    );
    this.sliderControlLinksArray.forEach((link) =>
      link.addEventListener("click", this.linkToSlide.bind(this))
    );
    this.slider.addEventListener("scroll", this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      this.reducedMotion.addEventListener("change", () => {
        if (this.slider.getAttribute("data-autoplay") === "true")
          this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true }
        );
      });
    }

    if (this.slider.getAttribute("data-autoplay") === "true")
      this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener("mouseover", this.focusInHandling.bind(this));
    this.addEventListener("mouseleave", this.focusOutHandling.bind(this));
    this.addEventListener("focusin", this.focusInHandling.bind(this));
    this.addEventListener("focusout", this.focusOutHandling.bind(this));

    if (this.querySelector(".slideshow__autoplay")) {
      this.sliderAutoplayButton = this.querySelector(".slideshow__autoplay");
      this.sliderAutoplayButton.addEventListener(
        "click",
        this.autoPlayToggle.bind(this)
      );
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === "prev") {
      this.slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === "next") {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll(".slider-counter__link");
    this.prevButton.removeAttribute("disabled");

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove("slider-counter__link--active");
      link.removeAttribute("aria-current");
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add(
      "slider-counter__link--active"
    );
    this.sliderControlButtons[this.currentPage - 1].setAttribute(
      "aria-current",
      true
    );
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute("aria-live", "off");
    clearInterval(this.autoplay);
    this.autoplay = setInterval(
      this.autoRotateSlides.bind(this),
      this.autoplaySpeed
    );
  }

  pause() {
    this.slider.setAttribute("aria-live", "polite");
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add("slideshow__autoplay--paused");
      this.sliderAutoplayButton.setAttribute(
        "aria-label",
        window.accessibilityStrings.playSlideshow
      );
    } else {
      this.sliderAutoplayButton.classList.remove("slideshow__autoplay--paused");
      this.sliderAutoplayButton.setAttribute(
        "aria-label",
        window.accessibilityStrings.pauseSlideshow
      );
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll("a");
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute("tabindex");
          });
        item.setAttribute("aria-hidden", "false");
        item.removeAttribute("tabindex");
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute("tabindex", "-1");
          });
        item.setAttribute("aria-hidden", "true");
        item.setAttribute("tabindex", "-1");
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = "next") {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === "next" ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = "announcement-bar-slider--fade-in";
    const animationClassOut = "announcement-bar-slider--fade-out";

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext =
      (button === "next" && !isLastSlide) ||
      (button === "prev" && isFirstSlide);
    const direction = shouldMoveNext ? "next" : "prev";

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) +
          1 -
          this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define("slideshow-component", SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();

      if (!this.currentVariant.available) {
        this.toggleAddButton(true, window.variantStrings.soldOut, true);
      } else {
        this.toggleAddButton(false, window.variantStrings.addToCart, true);
      }
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select"),
      (select) => select.value
    );

    this.querySelectorAll("select").forEach((select) => {
      const n = select.getAttribute("name");
      const label = `[data-option="${n
        .replace("options[", "")
        .replace("]", "")}"]`;
      const stickySelect = document.querySelector(label);
      if (stickySelect) {
        stickySelect.value = select.value;
      }
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(
      `[id^="MediaGallery-${this.dataset.section}"]`
    );
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true
      )
    );

    const modalContent = document.querySelector(
      `#ProductModal-${this.dataset.section} .product-media-modal__content`
    );
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(
      `[data-media-id="${this.currentVariant.featured_media.id}"]`
    );
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateShareUrl() {
    const shareButton = document.getElementById(
      `Share-${this.dataset.section}`
    );
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(
      `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateVariantInput() {
    let productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    ); 
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    /* Card product variant selector */
    if(this.closest(".card-product-variant-selector")) {
      const closestParent = this.closest(".card-product-variant-selector");
      const productCardFormId = closestParent.dataset.productFormId;
      let productCardForm = document.querySelector(`#${productCardFormId}`);
      const input = productCardForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(":checked").value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.innerText = input.getAttribute("value");
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          "[value]",
          input.getAttribute("value")
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  removeErrorMessage() {
    const section = this.closest("section");
    if (!section) return;

    const productForm = section.querySelector("product-form");
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, "text/html");
        const destination = document.getElementById(
          `price-container-${this.dataset.section}`
        );
        const source = html.getElementById(
          `price-container-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuSource = html.getElementById(
          `Sku-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuDestination = document.getElementById(
          `Sku-${this.dataset.section}`
        );
        const inventorySource = html.getElementById(
          `Inventory-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const inventoryDestination = document.getElementById(
          `Inventory-${this.dataset.section}`
        );

        const volumePricingSource = html.getElementById(
          `Volume-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );

        const pricePerItemDestination = document.getElementById(
          `Price-Per-Item-${this.dataset.section}`
        );
        const pricePerItemSource = html.getElementById(
          `Price-Per-Item-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );

        const volumePricingDestination = document.getElementById(
          `Volume-${this.dataset.section}`
        );
        const qtyRules = document.getElementById(
          `Quantity-Rules-${this.dataset.section}`
        );
        const volumeNote = document.getElementById(
          `Volume-Note-${this.dataset.section}`
        );
        const subtotalDestination = document.getElementById(
          `subtotal-${this.dataset.section}`
        );
        const subtotalSource = html.getElementById(
          `subtotal-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        if (subtotalSource && subtotalDestination) {
          subtotalDestination.innerHTML = subtotalSource.innerHTML;
        }
        if (volumeNote) volumeNote.classList.remove("hidden");
        if (volumePricingDestination)
          volumePricingDestination.classList.remove("hidden");
        if (qtyRules) qtyRules.classList.remove("hidden");

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination)
          inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle(
            "hidden",
            skuSource.classList.contains("hidden")
          );
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle(
            "hidden",
            pricePerItemSource.classList.contains("hidden")
          );
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove("hidden");
 
        if (inventoryDestination && inventorySource)
          inventoryDestination.classList.toggle(
            "hidden",
            inventorySource.innerText === ""
          );

        const addButtonUpdated = html.getElementById(
          `ProductSubmitButton-${sectionId}`
        );

        if (addButtonUpdated) {
          this.toggleAddButton(
            addButtonUpdated ? addButtonUpdated.hasAttribute("disabled") : true,
            window.variantStrings.soldOut
          );
        }

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    let productForm;
    if(this.closest(".card-product-variant-selector")) {

      const idProductForm = this.closest(".card-product-variant-selector").dataset.productFormId;
        productForm = document.getElementById(
          `${idProductForm}`
        );
    }else{
      productForm = document.getElementById(
        `product-form-${this.dataset.section}`
      )
      if(!productForm) return;
    }
    const addButton = productForm.querySelector('[name="add"]');
    const stickyAddBtn = document.querySelector(".sticky-atc__button button");
    const stickyBtnText = stickyAddBtn?.querySelector("span");
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", "disabled");
      stickyAddBtn?.setAttribute("disabled", "disabled");
      if (text) {
        addButtonText.textContent = text;
        if (stickyBtnText) {
          stickyBtnText.textContent = text;
        }
      }
    } else {
      addButton.removeAttribute("disabled");
      stickyAddBtn?.removeAttribute("disabled");
      addButtonText.textContent = window.variantStrings.addToCart;
      if (stickyBtnText) {
        stickyBtnText.textContent = window.variantStrings.addToCart;
      }
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    let button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if(!button) {
      const idProductFrom = this.closest(".card-product-variant-selector").dataset.productFormId;
      button = document.getElementById(
        `${idProductFrom}`
      );
    }
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(
      `Price-Per-Item-${this.dataset.section}`
    );
    const volumeNote = document.getElementById(
      `Volume-Note-${this.dataset.section}`
    );
    const volumeTable = document.getElementById(
      `Volume-${this.dataset.section}`
    );
    const qtyRules = document.getElementById(
      `Quantity-Rules-${this.dataset.section}`
    );

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("hidden");
    if (inventory) inventory.classList.add("hidden");
    if (sku) sku.classList.add("hidden");
    if (pricePerItem) pricePerItem.classList.add("hidden");
    if (volumeNote) volumeNote.classList.add("hidden");
    if (volumeTable) volumeTable.classList.add("hidden");
    if (qtyRules) qtyRules.classList.add("hidden");
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.classList.remove("disabled");
      } else {
        input.classList.add("disabled");
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.options = fieldsets.map((fieldset) => {
      const selectedInput = Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      );
      const selectedValue = selectedInput.value;
      const legend = fieldset.querySelector("legend span");
      if (legend) {
        legend.textContent = `${selectedValue}`;
      }

      const label = `[data-option="${selectedInput.name}"]`;
      const stickySelect = document.querySelector(label);
      if (stickySelect && this.closest(".product__info-wrapper")) {
        stickySelect.value = selectedValue;
      }

      return selectedValue;
    });
  }
}

customElements.define("variant-radios", VariantRadios);

class HybridVariantPicker extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    const selects = Array.from(this.querySelectorAll("select"));

    // Get values from radio buttons (used for color swatches)
    const radioValues = fieldsets.map((fieldset) => {
      const selectedInput = Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      );
      if (!selectedInput) return null;

      const selectedValue = selectedInput.value;
      const legend = fieldset.querySelector("legend span");
      if (legend) {
        legend.textContent = selectedValue;
      }

      const label = `[data-option="${selectedInput.name}"]`;
      const stickySelect = document.querySelector(label);
      if (stickySelect) {
        stickySelect.value = selectedValue;
      }
      const index = fieldset?.dataset?.optionIndex;
      return { selectedValue, index: index ? parseInt(index) : "" };
    });

    // Get values from dropdowns (used for non-color options)
    const selectValues = selects.map((select) => {
      const n = select.getAttribute("name");
      const label = `[data-option="${n
        .replace("options[", "")
        .replace("]", "")}"]`;
      const stickySelect = document.querySelector(label);
      if (stickySelect) {
        stickySelect.value = select.value;
      }
      const index = select?.dataset?.optionIndex;
      return {
        selectedValue: select.value,
        index: index ? parseInt(index) : "",
      };
    });
    this.options = [...radioValues, ...selectValues]
      .sort((a, b) => (a.index > b.index ? 1 : -1))
      .map((item) => item?.selectedValue)
      .filter(Boolean);
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      const isRadio = input.type === "radio";
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        if (isRadio) {
          input.classList.remove("disabled");
        } else {
          input.innerText = input.getAttribute("value");
        }
      } else {
        if (isRadio) {
          input.classList.add("disabled");
        } else {
          input.innerText =
            window.variantStrings.unavailable_with_option.replace(
              "[value]",
              input.getAttribute("value")
            );
        }
      }
    });
  }
}

customElements.define("hybrid-variant-picker", HybridVariantPicker);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (
            !this.querySelector("slideshow-component") &&
            this.classList.contains("complementary-products")
          ) {
            this.remove();
          }

          if (html.querySelector(".grid__item")) {
            this.classList.add("product-recommendations--loaded");
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}

customElements.define("product-recommendations", ProductRecommendations);


// document.addEventListener("DOMContentLoaded", () => {
//     const accordions = document.querySelectorAll(".product__accordion")
//     accordions.forEach( accordion => {
//         const summary = accordion.querySelector("summary")
//         const content = accordion.querySelector(".accordion__content")

//         summary.addEventListener("click", () => {
//             const isOpen = accordion.hasAttribute("open")
//             accordion.setAttribute("open", !isOpen)
//         })
//     })
// })

if (!customElements.get('product-info')) {
  customElements.define('product-info', class ProductInfo extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.quantity__input');
      this.currentVariant = this.querySelector('.product-variant-id');
      this.variantSelects = this.querySelector('variant-radios')
      this.submitButton = this.querySelector('[type="submit"]');
    }

    cartUpdateUnsubscriber = undefined;
    variantChangeUnsubscriber = undefined;

    connectedCallback() {
      if (!this.input) return;
      this.quantityForm = this.querySelector('.product-form__quantity');
      if (!this.quantityForm) return;
      this.setQuantityBoundries();  
      if (!this.dataset.originalSection) {
        this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
      }
      this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
        if (event.data.sectionId !== sectionId) return;
        this.updateQuantityRules(event.data.sectionId, event.data.html);
        this.setQuantityBoundries();
      });
    }

    disconnectedCallback() {
      if (this.cartUpdateUnsubscriber) {
        this.cartUpdateUnsubscriber();
      }
      if (this.variantChangeUnsubscriber) {
        this.variantChangeUnsubscriber();
      }
    }

    setQuantityBoundries() {
      const data = {
        cartQuantity: this.input.dataset.cartQuantity ? parseInt(this.input.dataset.cartQuantity) : 0,
        min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1,
        max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null,
        step: this.input.step ? parseInt(this.input.step) : 1
      }

      let min = data.min;
      const max = data.max === null ? data.max : data.max - data.cartQuantity;
      if (max !== null) min = Math.min(min, max);
      if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

      this.input.min = min;
      this.input.max = max;
      this.input.value = min;
      publish(PUB_SUB_EVENTS.quantityUpdate, undefined);  
    }

    fetchQuantityRules() {
      if (!this.currentVariant || !this.currentVariant.value) return;
      this.querySelector('.quantity__rules-cart .loading-overlay').classList.remove('hidden');
      fetch(`${this.dataset.url}?variant=${this.currentVariant.value}&section_id=${this.dataset.section}`).then((response) => {
        return response.text()
      })
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        this.updateQuantityRules(this.dataset.section, html);
        this.setQuantityBoundries();
      })
      .catch(e => {
        console.error(e);
      })
      .finally(() => {
        this.querySelector('.quantity__rules-cart .loading-overlay').classList.add('hidden');
      });
    }

    updateQuantityRules(sectionId, html) {
      const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
      const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label','.quantity-number'];
      for (let selector of selectors) { 
        const current = this.quantityForm.querySelector(selector);
        const updated = quantityFormUpdated.querySelector(selector);
        if (!current || !updated) continue;
        if (selector === '.quantity__input') {
          const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
          for (let attribute of attributes) {
            const valueUpdated = updated.getAttribute(attribute);
            if (valueUpdated !== null) current.setAttribute(attribute, valueUpdated);
          }
        } else {
          current.innerHTML = updated.innerHTML;
        }
      }
    }
  }
)};

if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form');
      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('[type="submit"]'); 
      if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
    }

    onSubmitHandler(evt) {
      evt.preventDefault(); 
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      this.handleErrorMessage();

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton?.classList?.add('loading');
      this.querySelector('.product-form-button-text')?.classList?.add('hidden');
      this.querySelector('.loading-overlay__spinner')?.classList?.remove('hidden');
      if(this.closest(".product__info-wrapper")){
        document.querySelector('.sticky-atc-container .product-form-button-text')?.classList?.add('hidden');
        document.querySelector('.sticky-atc-container .loading-overlay__spinner')?.classList?.remove('hidden');
      }

      var config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      var formData = new FormData(this.form);
      if (this.cart) {
        formData.append('sections', this.cart.getSectionsToRender().map((section) => section.section || section.id));
        // Use cart page URL to ensure cart drawer section is available
        formData.append('sections_url', window.routes?.cart_url || '/cart');
        this.cart.setActiveElement(document.activeElement);
      }

      this.formIdInputValue = this.form.querySelector('[name=id]').value;
      if (this.formIdInputValue.includes(',')) {
          formData.delete('id');
          formData.delete('quantity');
      } 
      
      config.body = formData;

      this.skipCart = false;
      if (this.form.querySelector('[name=id]').dataset.skipCart && this.form.querySelector('[name=id]').dataset.skipCart === 'true') {
        this.skipCart = true;
      }
      fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this.handleErrorMessage(response.description);

            const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
            if (!soldOutMessage) return;
            this.submitButton.setAttribute('aria-disabled', true);
            this.submitButton.querySelector('span').classList.add('hidden');
            soldOutMessage.classList.remove('hidden');
            this.error = true;
            return;
          } else if (this.skipCart) {
            window.location = "/checkout";
            return;
          }

          if (!this.error) publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form'});
          this.error = false;

          // Dispatch generic cart:add event for any listening code
          try {
            document.dispatchEvent(new CustomEvent('cart:add', { bubbles: true, detail: response }));
          } catch(e) {}

          // If Atlas cart upsells drawer is active, let its fetch hook handle everything
          if (document.getElementById('atlas-upsell-cart-drawer-main-container')) {
            this.updateCartBubbleCount();
            return;
          }

          this.handleCartUI(response);

          // Update host theme cart bubble count
          this.updateCartBubbleCount();
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.submitButton.classList.remove('loading');
          if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
          if (!this.error) this.submitButton.removeAttribute('aria-disabled');
          this.querySelector('.loading-overlay__spinner').classList.add('hidden');
          if(this.closest(".product__info-wrapper")){
            const stickyContainer = document.querySelector('.sticky-atc-container .loading-overlay__spinner');
            if (stickyContainer){
              stickyContainer.classList.add('hidden');
            } 
          }
         
          if(this.querySelector('.product-added-success')){
            this.querySelector('.product-added-success').classList.remove('hidden');
            if(this.closest(".product__info-wrapper")){
              const stickySuccessMessage = document.querySelector('.sticky-atc-container .product-added-success');
              if (stickySuccessMessage){ 
                stickySuccessMessage.classList.remove('hidden');
              }
            }
          } 
          
          setTimeout(() => {
            if(this.querySelector('.product-added-success')){
              this.querySelector('.product-added-success').classList.add('hidden');
            }
            if(this.closest(".product__info-wrapper")){
              const stickyAddedSuccess = document.querySelector('.sticky-atc-container .product-added-success');
              if (stickyAddedSuccess){
                stickyAddedSuccess.classList.add('hidden');
              }
            }
            if(this.querySelector('.product-form-button-text')){
              this.querySelector('.product-form-button-text').classList.remove('hidden');
            }
            if(this.closest(".product__info-wrapper")){
            const stickyButtonText = document.querySelector('.sticky-atc-container .product-form-button-text');
              if (stickyButtonText){
                stickyButtonText.classList.remove('hidden');
              }
            }
          }, 1000);
        });
    }

    triggerHostCartAction() {
      // Generic fallback: refresh the host theme's header section via Section
      // Rendering API so cart data is fresh, then simulate clicking the cart icon
      // to trigger whatever the theme does natively (open drawer, show notification,
      // navigate to /cart).
      var bubble = document.querySelector('#cart-icon-bubble')
        || document.querySelector('.cart-bubble')
        || document.querySelector('[data-cart-count]');
      var headerSection = bubble
        ? bubble.closest('[id^="shopify-section-"]')
        : document.querySelector('#shopify-section-header, [id^="shopify-section-"][id*="header"]');

      var clickCartIconOrRedirect = function(container) {
        var cartLink = container
          ? (container.querySelector('a[href*="/cart"]')
            || container.querySelector('button[aria-controls*="cart"]')
            || container.querySelector('[data-action*="cart"][data-action*="open"]'))
          : null;
        if (cartLink) {
          cartLink.click();
        } else {
          window.location.href = window.routes?.cart_url || '/cart';
        }
      };

      if (!headerSection) {
        clickCartIconOrRedirect(document);
        return;
      }

      var sectionId = headerSection.id.replace('shopify-section-', '');
      fetch(window.location.pathname + '?section_id=' + sectionId)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var newSection = doc.querySelector('[id^="shopify-section-"]');
          if (newSection) headerSection.innerHTML = newSection.innerHTML;
          clickCartIconOrRedirect(headerSection);
        })
        .catch(function() {
          clickCartIconOrRedirect(headerSection);
        });
    }

    handleCartUI(response) {
      // 1. Dawn/Refresh/Sense: use native renderContents
      if (this.cart && typeof this.cart.renderContents === 'function') {
        const quickAddModal = this.closest('quick-add-modal');
        if (quickAddModal) {
          document.body.addEventListener('modalClosed', () => {
            setTimeout(() => { this.cart.renderContents(response) });
          }, { once: true });
          quickAddModal.hide(true);
        } else {
          this.cart.renderContents(response);
        }
        return;
      }

      // 2. Horizon/dialog-based cart drawer
      if (this.triggerDialogCartDrawer()) return;

      // 3. Generic fallback: refresh header + click cart icon
      this.triggerHostCartAction();
    }

    triggerDialogCartDrawer() {
      // Detect dialog-based cart drawer (Horizon and similar themes)
      var dialog = document.querySelector('dialog.cart-drawer__dialog')
        || document.querySelector('#cart-drawer dialog')
        || document.querySelector('[id*="cart-drawer"] dialog');
      if (!dialog) return false;

      // Find the Shopify section wrapping this dialog
      var section = dialog.closest('[id^="shopify-section-"]');
      if (!section) {
        try { dialog.showModal(); } catch(e) {}
        return true;
      }

      var sectionId = section.id.replace('shopify-section-', '');

      // Refresh cart drawer section with fresh data from Shopify
      fetch('/?section_id=' + sectionId)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var newSection = doc.querySelector('#' + CSS.escape(section.id));
          if (newSection) {
            section.innerHTML = newSection.innerHTML;
          }
          // Re-find dialog after DOM replacement, then open
          var freshDialog = section.querySelector('dialog');
          if (freshDialog) {
            try { freshDialog.showModal(); } catch(e) {
              try { freshDialog.show(); } catch(e2) {}
            }
          }
        })
        .catch(function() {
          // If section refresh fails, try opening existing dialog anyway
          try { dialog.showModal(); } catch(e) {}
        });

      return true;
    }

    updateCartBubbleCount() {
      // Find the cart bubble element (Dawn: #cart-icon-bubble, Horizon: .cart-bubble)
      var bubble = document.querySelector('#cart-icon-bubble')
        || document.querySelector('.cart-bubble')
        || document.querySelector('[data-cart-count]');
      if (!bubble) return;

      // Find the Shopify section that wraps this bubble
      var sectionEl = bubble.closest('[id^="shopify-section-"]');
      if (!sectionEl) return;

      var sectionId = sectionEl.id.replace('shopify-section-', '');

      // Use Section Rendering API to get fresh HTML from Shopify
      fetch(window.location.pathname + '?section_id=' + sectionId)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var newBubble = doc.querySelector('#cart-icon-bubble')
            || doc.querySelector('.cart-bubble')
            || doc.querySelector('[data-cart-count]');
          if (newBubble) {
            bubble.replaceWith(newBubble);
          }
        })
        .catch(function() {});
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItems =
        this.closest("cart-items") || this.closest("cart-drawer-items");
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById("shopping-cart-line-item-status") ||
      document.getElementById("CartDrawer-LineItemStatus");

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.cartUpdate,
      (event) => {
        if (event.source === "cart-items") {
          return;
        }
        this.onCartUpdate();
      }
    );
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute("name")
    );
  }

  onCartUpdate() {
    fetch("/cart?section_id=atlas-main-cart-items")
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const sourceQty = html.querySelector("cart-items");
        this.innerHTML = sourceQty.innerHTML;
      })
      .catch((e) => {
        console.error(e);
      });
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: "atlas-main-cart-items",
        selector: ".js-contents",
      },
      {
        id: "cart-icon-bubble",
        section: "atlas-cart-icon-bubble",
        selector: ".shopify-section",
      },
      {
        id: "cart-live-region-text",
        section: "atlas-cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) ||
          document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll(".cart-item");

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute("value");
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle("is-empty", parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector("cart-drawer");
        const cartFooter = document.getElementById("main-cart-footer");

        if (cartFooter)
          cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle(
            "is-empty",
            parsedState.item_count === 0
          );

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document
              .getElementById(section.id)
              ?.querySelector(section.selector) ||
            document.getElementById(section.id);
          if (elementToReplace) {
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          }
        });
        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = "";
        if (
          items.length === parsedState.items.length &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === "undefined") {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              "[quantity]",
              updatedValue
            );
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(
                cartDrawerWrapper,
                lineItem.querySelector(`[name="${name}"]`)
              )
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper.querySelector(".drawer__inner-empty"),
            cartDrawerWrapper.querySelector("a")
          );
        } else if (document.querySelector(".cart-item") && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper,
            document.querySelector(".cart-item__name")
          );
        }
        publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-items" });
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
        const errors =
          document.getElementById("cart-errors") ||
          document.getElementById("CartDrawer-CartErrors");
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) ||
      document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError)
      lineItemError.querySelector(".cart-item__error-text").innerHTML = message;

    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus =
      document.getElementById("cart-live-region-text") ||
      document.getElementById("CartDrawer-LiveRegionText");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.add("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove("hidden")
    );

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.remove("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    cartItemElements.forEach((overlay) => overlay.classList.add("hidden"));
    cartDrawerItemElements.forEach((overlay) =>
      overlay.classList.add("hidden")
    );
  }
}

customElements.define("cart-items", CartItems);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          "change",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (cartLink) {
      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      cartLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.open(cartLink)
      });
      cartLink.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    }
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {this.classList.add('animate', 'active')});

    this.addEventListener('transitionend', () => {
      const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.drawer__inner-empty') : document.getElementById('CartDrawer');
      const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
      trapFocus(containerToTrapFocusOn, focusElement);
    }, { once: true });

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if(cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') && this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    
    let sectionsUpdated = false;
    this.getSectionsToRender().forEach((section => {
      if (section) {
        const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
        if(sectionElement) {
          const sectionKey = section.section || section.id;
          const sectionHTML = parsedState.sections?.[sectionKey];
          if (sectionHTML) {
            const innerHTML = this.getSectionInnerHTML(sectionHTML, section.selector);
            if (innerHTML) {
              sectionElement.innerHTML = innerHTML;
              sectionsUpdated = true;
            }
          }
        }
      }
    }));

    // If no sections were updated, refresh the cart drawer items instead
    if (!sectionsUpdated && parsedState.item_count !== undefined) {
      const cartDrawerItems = this.querySelector('cart-drawer-items');
      if (cartDrawerItems && cartDrawerItems.onCartUpdate) {
        cartDrawerItems.onCartUpdate();
      }
    }

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    if (!html) return '';
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const element = parsed.querySelector(selector);
    return element ? element.innerHTML : '';
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        section: 'atlas-cart-drawer',
        selector: '#CartDrawer'
      },
      {
        id: 'cart-icon-bubble',
        section: 'atlas-cart-icon-bubble'
      }
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'atlas-cart-drawer',
        selector: '.drawer__inner'
      },
      {
        id: 'cart-icon-bubble',
        section: 'atlas-cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);


class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    })
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach(animation => animation.play());
    } else {
      this.animations.forEach(animation => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty('--header-bottom-position-desktop', `${Math.floor(this.header.getBoundingClientRect().bottom)}px`);
  }
}

customElements.define('header-menu', HeaderMenu);

class DetailsModal extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    this.detailsContainer.addEventListener(
      'keyup',
      (event) => event.code.toUpperCase() === 'ESCAPE' && this.close()
    );
    this.summaryToggle.addEventListener(
      'click',
      this.onSummaryClick.bind(this)
    );
    this.querySelector('button[type="button"]').addEventListener(
      'click',
      this.close.bind(this)
    );

    this.summaryToggle.setAttribute('role', 'button');
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open')
      ? this.close()
      : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    this.onBodyClickEvent =
      this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden');

    trapFocus(
      this.detailsContainer.querySelector('[tabindex="-1"]'),
      this.detailsContainer.querySelector('input:not([type="hidden"])')
    );
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden');
  }
}

customElements.define('details-modal', DetailsModal);



document.addEventListener("DOMContentLoaded", () => {
  function initFadeInAnimation() {
    try {
      const observer = new IntersectionObserver(
        (entries, observerInstance) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observerInstance.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.05,
          rootMargin: "50px 0px",
        }
      );

      const sections = document.querySelectorAll(".animation-section");

      if (!sections || sections.length === 0) return;

      sections.forEach((section) => {
        observer.observe(section);
      });

      const checkVisibleElements = () => {
        sections.forEach((section) => {
          window.requestAnimationFrame(() => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              section.classList.add("visible");
              observer.unobserve(section);
            }
          });
        });
      };

      checkVisibleElements();
    } catch (error) {
      console.error("Error initializing fade-in animation:", error);
    }
  }

  initFadeInAnimation();

  if (Shopify.designMode) {
    document.addEventListener("shopify:section:unload", initFadeInAnimation);
    document.addEventListener("shopify:section:load", initFadeInAnimation);
  }
});
// Video Testimonials Component
class VideoTestimonials extends HTMLElement {
  constructor() {
    super();
    this.swiper = null;
    this.init();
  }

  init() {
    // Wait for Swiper to be available
    if (window.Swiper) {
      this.initSwiper();
      this.initVideoControls();
    }else{
      document.addEventListener('DOMContentLoaded', function () {
        this.initSwiper();
        this.initVideoControls();
      })
    }

    
  }

  initSwiper() {
    const swiperContainer = this.querySelector('.testimonials-swiper') || this.querySelector('[class*="testimonials-swiper-"]');
    if (!swiperContainer) return;

    // Get configuration from data attributes
    const slidesDesktop = parseInt(swiperContainer.dataset.slidesDesktop) ;
    const slidesTablet = parseInt(swiperContainer.dataset.slidesTablet);
    const slidesMobile = parseInt(swiperContainer.dataset.slidesMobile);
    const gap = parseInt(swiperContainer.dataset.gap);
    // Get fixed width settings
    const enableSlideWidthDesktop = swiperContainer.dataset.enableFixedDesktopWidth === 'true';
    const enableSlideWidthMobile = swiperContainer.dataset.enableFixedMobileWidth === 'true';
    const cardWidthDesktop = parseInt(swiperContainer.dataset.fixedDesktopWidth) ;
    const cardWidthMobile = parseInt(swiperContainer.dataset.fixedMobileWidth);
    // Configure breakpoints based on slide width settings
    const breakpoints = {
      320: {
        slidesPerView: enableSlideWidthMobile ? "auto" : slidesMobile,
        spaceBetween: gap,
      },
      768: {
        slidesPerView: enableSlideWidthDesktop ? "auto" : slidesTablet,
        spaceBetween: gap,
      },
      1024: {
        slidesPerView: enableSlideWidthDesktop ? "auto" : slidesDesktop,
        spaceBetween: gap,
      }
    };

    // Apply fixed widths via CSS if enabled
    if (enableSlideWidthDesktop || enableSlideWidthMobile) {
      const slides = this.querySelectorAll('.swiper-slide');
      slides.forEach(slide => {
        if (enableSlideWidthMobile) {
          slide.style.setProperty('--slide-width-mobile', `${cardWidthMobile}px`);
        }
        if (enableSlideWidthDesktop) {
          slide.style.setProperty('--slide-width-desktop', `${cardWidthDesktop}px`);
        }
      });
    }

    this.swiper = new Swiper(swiperContainer, {
      slidesPerView: enableSlideWidthDesktop ? "auto" : slidesDesktop,
      spaceBetween: gap,
      centeredSlides: false,
      loop: false,
      navigation: {
        nextEl: this.querySelector('.swiper-button-next') || this.querySelector('[class*="swiper-button-next-"]'),
        prevEl: this.querySelector('.swiper-button-prev') || this.querySelector('[class*="swiper-button-prev-"]'),
      },
      pagination: {
        el: this.querySelector('.swiper-pagination'),
        type: 'progressbar'
      },
      breakpoints: breakpoints,
    });
  }

  initVideoControls() {
    const videoCards = this.querySelectorAll('.video-card, [class*="video-card-"]');
    
    videoCards.forEach(card => {
      const video = card.querySelector('video');
      
      if (video) {
        // Click on entire card to play/pause
        card.addEventListener('click', () => {
          if (card.classList.contains('playing')) {
            // Currently playing - stop it
            video.pause();
            card.classList.remove('playing');
          } else {
            // Not playing - start it
            // Pause all other videos first
            videoCards.forEach(otherCard => {
              if (otherCard !== card) {
                const otherVideo = otherCard.querySelector('video');
                if (otherVideo) {
                  otherVideo.pause();
                }
                otherCard.classList.remove('playing');
              }
            });
            
            // Play current video
            card.classList.add('playing');
            video.play();
          }
        });
        
        video.addEventListener('ended', () => {
          card.classList.remove('playing');
        });
      }
    });
  }
}

customElements.define('video-testimonials', VideoTestimonials);

// Global function to initialize video testimonials (for backward compatibility)
window.initVideoTestimonials = function() {
  const videoTestimonials = document.querySelector('video-testimonials');
  if (videoTestimonials) {
    videoTestimonials.init();
  }
};
class reviewsSwiper extends HTMLElement {
  constructor() {
    super();
    this.id = this.getAttribute('block-class');
    this.paginationId = this.getAttribute('pagination-id');
    if(window.Swiper){
    this.initSwiper();
    }else{
      document.addEventListener('DOMContentLoaded', function () {
        this.initSwiper();
      })
    }
  }
  initSwiper() {
    const closestPagination = this.querySelector(this.paginationId);
    new Swiper(this.id, {
      slidesPerView: 1,
      spaceBetween: 10,
      loop: false,
      pagination: {
        el: closestPagination,
        clickable: true,
        bulletClass: 'swiper-pagination-bullet',
        bulletActiveClass: 'swiper-pagination-bullet-active',
      }
    });
  }
}
customElements.define('reviews-swiper', reviewsSwiper);

// Choose Option Button functionality
document.addEventListener('DOMContentLoaded', function() {
  const chooseOptionButtons = document.querySelectorAll('.choose-option__button');
  
  chooseOptionButtons.forEach(button => {
    if (button.classList.contains('choose-option-initialized')) return;
    
    button.classList.add('choose-option-initialized');
    
    const productId = button.dataset.productId;
    const variantSelector = document.getElementById(`variant-selector-${productId}`);
    let isExpanded = false;
    
    button.addEventListener('click', function(event) {
      event.preventDefault();
      
      if (!variantSelector) return;

      isExpanded = !isExpanded;
      
      if (isExpanded) {
        showVariantSelector();
      } else {
        hideVariantSelector();
      }
    });
    
    function showVariantSelector() {
      if (!variantSelector) return;

      // Remove hidden class and add visible class
      variantSelector.classList.remove('variant-selector-hidden');
      variantSelector.classList.add('variant-selector-visible');
      
      // Update button state
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('.choose-option__text').textContent = button.getAttribute('data-hide-options-text');
      
      // Add a small delay to ensure smooth animation
      setTimeout(() => {
        variantSelector.style.maxHeight = 'none';
      }, 400);
    }
    
    function hideVariantSelector() {
      if (!variantSelector) return;

      // Remove visible class and add hidden class
      variantSelector.classList.add('variant-selector-hidden');
      variantSelector.classList.remove('variant-selector-visible');
      
      // Update button state
      button.setAttribute('aria-expanded', 'false');
      button.querySelector('.choose-option__text').textContent = button.getAttribute('data-show-options-text');
      
      // Reset max-height for next animation
      setTimeout(() => {
        variantSelector.style.maxHeight = '';
      }, 400);
    }
  });
});
// Product Card Slider Functionality
class ProductCardSlider extends HTMLElement {
  constructor() {
    super();
    this.slider = this;
    this.slides = this.querySelectorAll('.product-card-slider__slide');
    this.prevBtn = this.parentElement.parentElement.querySelector('.product-card-slider__nav--prev');
    this.nextBtn = this.parentElement.parentElement.querySelector('.product-card-slider__nav--next');
    this.showSecondaryImage = this.getAttribute('show-secondary-image');
    this.currentSlide = 0;
    this.totalSlides = this.slides.length;
    this.init();
  }
  
  init() {
    if (this.totalSlides <= 1) {
      // Hide navigation if only one slide
      if (this.prevBtn) this.prevBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;
      return;
    }
    this.updateNavigation();
    this.bindEvents();
    this.handleSecondaryImage();
  }
  handleSecondaryImage() {
      if (this.showSecondaryImage === 'true') {
      this.parentElement.parentElement.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
        e.preventDefault();
        for(let i = 0; i < this.slides.length; i++) {
          if(this.slides[i].style.opacity === "1" && i < this.slides.length - 1) {
            this.nextSlide();
            break;
          }
        }
      });
      this.parentElement.parentElement.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
        e.preventDefault();
        for(let i = 0; i < this.slides.length; i++) {
          if(this.slides[i].style.opacity === "1" && i > 0) {
            this.previousSlide();
            break;
          }
        }
      });
    }
  }
  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.previousSlide();
      });
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.nextSlide();
      });
    }
  }
  
  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this.updateSlide();
      this.updateNavigation();
    }
  }
  
  previousSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateSlide();
      this.updateNavigation();
    }
  }
  
  updateSlide() {
    this.slides.forEach((slide, index) => {
      slide.style.opacity = index === this.currentSlide ? "1" : "0";
    });
  }
  
  updateNavigation() {
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentSlide === 0;
    }
    
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentSlide === this.totalSlides - 1;
    }
  }
}
customElements.define('product-card-slider', ProductCardSlider);

// Export base classes needed by external atlas scripts (atlas-product-modal.js, etc.)
// On Dawn hosts: Dawn's lexical bindings take precedence in variable lookup, so Dawn wins.
// On non-Dawn hosts: these window properties serve as fallback.
window.ModalDialog = ModalDialog;
window.DeferredMedia = DeferredMedia;
window.DetailsDisclosure = DetailsDisclosure;
})();
