if (!customElements.get("cart-remove-button")) {
  class CartRemoveButton extends HTMLElement {
    constructor() {
      super();

      this.addEventListener("click", async (event) => {
        event.preventDefault();
        const cartItems =
          this.closest("cart-items") || this.closest("cart-drawer-items");

        // Check if this is a progressive gift being deleted - mark as declined
        const itemIndex = this.dataset.index;
        if (cartItems && cartItems.currentCart) {
          const item = cartItems.currentCart.items?.[parseInt(itemIndex) - 1];
          if (item?.properties?._progressive_gift === "true" && item?.properties?._progressive_gift_item_id) {
            const giftItemId = item.properties._progressive_gift_item_id;
            try {
              await fetch(`${window.Shopify?.routes?.root || '/'}cart/update.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ attributes: { [`_atlas_declined_gift_${giftItemId}`]: "true" } }),
              });
            } catch (e) {
              console.error('[Cart] Failed to mark gift as declined:', e);
            }
          }
        }

        cartItems.updateQuantity(this.dataset.index, 0);
      });
    }
  }

  customElements.define("cart-remove-button", CartRemoveButton);
}

if (!customElements.get("cart-items")) {
  class CartItems extends HTMLElement {
    constructor() {
      super();
      this.lineItemStatusElement =
        document.getElementById("shopping-cart-line-item-status") ||
        document.getElementById("CartDrawer-LineItemStatus");
      this.currentCart = null;
      this.isProcessingGifts = false;
      this.localeUrlBase = window?.Shopify?.routes?.root || "/";

      const debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, ON_CHANGE_DEBOUNCE_TIMER);

      this.addEventListener("change", debouncedOnChange.bind(this));

      // Fetch initial cart state
      this.fetchCartState();
    }

    // Get bundle config from window or sessionStorage
    getBundleConfig() {
      // First try window.Atlas.bundler.bundle (set on product pages with bundler)
      if (window?.Atlas?.bundler?.bundle) {
        // Save to sessionStorage for use on /cart page
        try {
          sessionStorage.setItem('atlasBundleConfig', JSON.stringify(window.Atlas.bundler.bundle));
        } catch (e) {}
        return window.Atlas.bundler.bundle;
      }

      // Fallback to sessionStorage (for /cart page)
      try {
        const stored = sessionStorage.getItem('atlasBundleConfig');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {}

      return null;
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

  async fetchCartState() {
    try {
      const response = await fetch(`${this.localeUrlBase}cart.js`);
      this.currentCart = await response.json();
    } catch (e) {
      console.error('[Cart] Failed to fetch cart state:', e);
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

  // Extract numeric ID from Shopify GID format
  extractNumericId(id) {
    if (!id) return null;
    const idStr = String(id);
    if (/^\d+$/.test(idStr)) return idStr;
    if (idStr.includes('gid://shopify/')) {
      const parts = idStr.split('/');
      return parts[parts.length - 1];
    }
    return idStr;
  }

  // Check and update progressive gifts after quantity change
  async checkAndUpdateProgressiveGifts(cart) {
    if (this.isProcessingGifts) return false;

    const bundleConfig = this.getBundleConfig();
    if (!bundleConfig || !bundleConfig.progressive_gift?.enabled) {
      return false;
    }

    this.isProcessingGifts = true;
    let hasChanges = false;

    try {
      const cartItems = cart.items || [];
      const bundleOffers = bundleConfig.bundle_offers || [];
      const giftItems = bundleConfig.progressive_gift.gift_items || [];
      const bundleId = String(bundleConfig.id);

      // Group bundle items by bundle_id (excluding gifts)
      const bundleGroups = {};
      cartItems.forEach(item => {
        const itemBundleId = item.properties?._bundle;
        const isGift = item.properties?._progressive_gift === "true" || item.properties?._progressive_gift === true;
        if (itemBundleId && !isGift) {
          if (!bundleGroups[itemBundleId]) {
            bundleGroups[itemBundleId] = { items: [], totalQuantity: 0 };
          }
          bundleGroups[itemBundleId].items.push(item);
          bundleGroups[itemBundleId].totalQuantity += item.quantity || 0;
        }
      });

      // Find progressive gifts in cart
      const progressiveGifts = cartItems.filter(item =>
        item.properties?._progressive_gift === "true" || item.properties?._progressive_gift === true
      );

      // Track gifts to convert to regular items
      const giftsToConvert = [];

      progressiveGifts.forEach(gift => {
        const giftBundleId = gift.properties?._bundle;
        const minQuantityRequired = parseInt(gift.properties?._min_quantity_required || gift.properties?._unlock_tier || "1", 10);
        const bundleGroup = bundleGroups[giftBundleId];

        if (!bundleGroup) {
          giftsToConvert.push(gift);
        } else if (bundleGroup.totalQuantity < minQuantityRequired) {
          giftsToConvert.push(gift);
        }
      });

      // Check free shipping revocation
      const freeShippingToRevoke = [];
      if (cart.attributes) {
        for (const [key, value] of Object.entries(cart.attributes)) {
          if (key.startsWith('_atlas_free_shipping_') && !key.includes('_min_qty_') && value === 'true') {
            const attrBundleId = key.replace('_atlas_free_shipping_', '');
            const bundleGroup = bundleGroups[attrBundleId];

            if (!bundleGroup) {
              freeShippingToRevoke.push(attrBundleId);
            } else {
              let stillQualifies = false;
              if (bundleConfig && String(bundleConfig.id) === attrBundleId) {
                const currentQuantity = bundleGroup.totalQuantity;
                for (const giftItem of giftItems) {
                  if (giftItem.gift_type === 'free_shipping') {
                    const unlockTier = giftItem.unlock_tier || 1;
                    const unlockAtIndex = unlockTier - 1;
                    let minQty = 1;
                    if (bundleOffers[unlockAtIndex]) {
                      const unlockOffer = bundleOffers[unlockAtIndex].offer || bundleOffers[unlockAtIndex];
                      if (unlockOffer.pricing_type === "Buy X get Y %") {
                        minQty = (unlockOffer.quantity || 1) + (unlockOffer.discount || 0);
                      } else {
                        minQty = unlockOffer.quantity || 1;
                      }
                    }
                    if (currentQuantity >= minQty) {
                      stillQualifies = true;
                      break;
                    }
                  }
                }
              }
              if (!stillQualifies) {
                freeShippingToRevoke.push(attrBundleId);
              }
            }
          }
        }
      }

      // Convert gifts to regular items
      if (giftsToConvert.length > 0) {
        for (const gift of giftsToConvert) {
          try {
            const giftItemId = gift.properties?._progressive_gift_item_id || "";
            await fetch(`${this.localeUrlBase}cart/change.js`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({
                id: gift.key,
                properties: {
                  _progressive_gift: "",
                  _bundle: "",
                  _bundle_offer: "",
                  _progressive_gift_item_id: "",
                  _unlock_tier: "",
                  _min_quantity_required: "",
                  _was_progressive_gift: "true",
                  _was_progressive_gift_item_id: giftItemId
                }
              }),
            });
            hasChanges = true;
          } catch (e) {
            console.error('[Cart] Failed to convert gift:', e);
          }
        }
      }

      // Revoke free shipping
      if (freeShippingToRevoke.length > 0) {
        const attrs = {};
        freeShippingToRevoke.forEach(bid => { attrs[`_atlas_free_shipping_${bid}`] = ""; });
        try {
          await fetch(`${this.localeUrlBase}cart/update.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ attributes: attrs }),
          });
          hasChanges = true;
        } catch (e) {
          console.error('[Cart] Failed to revoke free shipping:', e);
        }
      }

      // Check for missing gifts to add (if no conversions were needed)
      if (giftsToConvert.length === 0 && freeShippingToRevoke.length === 0) {
        const addedGifts = await this.checkAndAddMissingGifts(bundleGroups, progressiveGifts, cartItems, bundleConfig, cart);
        if (addedGifts) hasChanges = true;
      }

    } catch (e) {
      console.error('[Cart] Error processing progressive gifts:', e);
    } finally {
      this.isProcessingGifts = false;
    }

    return hasChanges;
  }

  // Check and add missing progressive gifts
  async checkAndAddMissingGifts(bundleGroups, existingProgressiveGifts, cartItems, bundleConfig, cart) {
    const giftItems = bundleConfig.progressive_gift.gift_items || [];
    const bundleOffers = bundleConfig.bundle_offers || [];
    const bundleId = String(bundleConfig.id);

    const bundleGroup = bundleGroups[bundleId];
    if (!bundleGroup) return false;

    const currentQuantity = bundleGroup.totalQuantity;
    const firstBundleItem = bundleGroup.items[0];
    const offerId = firstBundleItem?.properties?._bundle_offer;
    if (!offerId) return false;

    const existingGiftItemIds = new Set();
    const existingGiftVariantIds = new Set();
    existingProgressiveGifts.forEach(gift => {
      if (gift.properties?._progressive_gift_item_id) {
        existingGiftItemIds.add(String(gift.properties._progressive_gift_item_id));
      }
      existingGiftVariantIds.add(String(gift.variant_id));
    });

    const giftsToAdd = [];
    const giftsToConvertBack = [];
    let shouldHaveFreeShipping = false;
    let freeShippingMinQty = 0;

    giftItems.forEach(giftItem => {
      if (existingGiftItemIds.has(String(giftItem.id))) return;

      let variantId = giftItem.variant_id;
      if (!variantId && giftItem.product?.variants?.[0]?.id) {
        variantId = giftItem.product.variants[0].id;
      }
      variantId = this.extractNumericId(variantId);

      if (variantId && existingGiftVariantIds.has(String(variantId))) return;

      const unlockTier = giftItem.unlock_tier || 1;
      const unlockAtIndex = unlockTier - 1;
      let minQuantityRequired = 1;
      if (bundleOffers[unlockAtIndex]) {
        const unlockOffer = bundleOffers[unlockAtIndex].offer || bundleOffers[unlockAtIndex];
        if (unlockOffer.pricing_type === "Buy X get Y %") {
          minQuantityRequired = (unlockOffer.quantity || 1) + (unlockOffer.discount || 0);
        } else {
          minQuantityRequired = unlockOffer.quantity || 1;
        }
      }

      const qualifiesForGift = currentQuantity >= minQuantityRequired;

      if (giftItem.gift_type === 'free_shipping') {
        if (qualifiesForGift) {
          shouldHaveFreeShipping = true;
          freeShippingMinQty = minQuantityRequired;
        }
        return;
      }

      if (giftItem.gift_type !== 'free_gift') return;

      const isGiftDeclined = cart?.attributes?.[`_atlas_declined_gift_${giftItem.id}`] === "true";

      if (qualifiesForGift && !isGiftDeclined && variantId) {
        const giftItemIdStr = String(giftItem.id);

        // Check for existing item that was previously this gift
        let existingRegularItem = cartItems.find(item => {
          const wasThisGift = item.properties?._was_progressive_gift === "true" &&
            item.properties?._was_progressive_gift_item_id === giftItemIdStr;
          return wasThisGift;
        });

        if (!existingRegularItem) {
          existingRegularItem = cartItems.find(item => {
            const wasAnyGift = item.properties?._was_progressive_gift === "true";
            return wasAnyGift && String(item.variant_id) === String(variantId);
          });
        }

        if (existingRegularItem) {
          giftsToConvertBack.push({
            key: existingRegularItem.key,
            properties: {
              _progressive_gift: "true",
              _bundle: bundleId,
              _bundle_offer: offerId,
              _progressive_gift_item_id: String(giftItem.id),
              _unlock_tier: String(giftItem.unlock_tier || 1),
              _min_quantity_required: String(minQuantityRequired),
              _was_progressive_gift: "",
              _was_progressive_gift_item_id: ""
            }
          });
        } else {
          const variantAlreadyInCart = cartItems.some(item => String(item.variant_id) === String(variantId));
          if (!variantAlreadyInCart) {
            giftsToAdd.push({
              id: variantId,
              quantity: 1,
              properties: {
                _progressive_gift: "true",
                _bundle: bundleId,
                _bundle_offer: offerId,
                _progressive_gift_item_id: giftItem.id,
                _unlock_tier: giftItem.unlock_tier || 1,
                _min_quantity_required: String(minQuantityRequired),
              }
            });
          }
        }
      }
    });

    let hasChanges = false;

    // Convert items back to progressive gifts
    for (const giftToConvert of giftsToConvertBack) {
      try {
        await fetch(`${this.localeUrlBase}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: giftToConvert.key, properties: giftToConvert.properties }),
        });
        hasChanges = true;
      } catch (e) {
        console.error('[Cart] Failed to convert item back to gift:', e);
      }
    }

    // Add new gift items
    if (giftsToAdd.length > 0) {
      try {
        const addResponse = await fetch(`${this.localeUrlBase}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: giftsToAdd }),
        });
        if (addResponse.ok) hasChanges = true;
      } catch (e) {
        console.error('[Cart] Failed to add gifts:', e);
      }
    }

    // Grant free shipping
    const currentFreeShippingAttr = cart?.attributes?.[`_atlas_free_shipping_${bundleId}`];
    if (shouldHaveFreeShipping && currentFreeShippingAttr !== 'true') {
      const attrs = {};
      attrs[`_atlas_free_shipping_${bundleId}`] = "true";
      attrs[`_atlas_free_shipping_min_qty_${bundleId}`] = String(freeShippingMinQty);
      try {
        await fetch(`${this.localeUrlBase}cart/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ attributes: attrs }),
        });
        hasChanges = true;
      } catch (e) {
        console.error('[Cart] Failed to grant free shipping:', e);
      }
    }

    return hasChanges;
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

  async updateQuantity(line, quantity, name) {
    this.enableLoading(line);

    try {
      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      });

      const response = await fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } });
      const state = await response.text();
      let parsedState = JSON.parse(state);

      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`);
      const items = document.querySelectorAll(".cart-item");

      if (parsedState.errors) {
        quantityElement.value = quantityElement.getAttribute("value");
        this.updateLiveRegions(line, parsedState.errors);
        return;
      }

      // Fetch full cart data for progressive gift checking
      const cartResponse = await fetch(`${this.localeUrlBase}cart.js`);
      const fullCart = await cartResponse.json();
      this.currentCart = fullCart;

      // Check and update progressive gifts
      const giftChangesNeeded = await this.checkAndUpdateProgressiveGifts(fullCart);

      // If gift changes were made, re-fetch sections with updated cart
      if (giftChangesNeeded) {
        const sectionsToFetch = this.getSectionsToRender().map(s => s.section).join(',');
        const sectionsResponse = await fetch(`${window.location.pathname}?sections=${sectionsToFetch}`);
        const sectionsData = await sectionsResponse.json();
        parsedState.sections = sectionsData;

        // Update cart data
        const updatedCartResponse = await fetch(`${this.localeUrlBase}cart.js`);
        const updatedCart = await updatedCartResponse.json();
        this.currentCart = updatedCart;
        parsedState.items = updatedCart.items;
        parsedState.item_count = updatedCart.item_count;
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
        updatedValue !== parseInt(quantityElement?.value)
      ) {
        if (typeof updatedValue === "undefined") {
          message = window.cartStrings?.error || "";
        } else {
          message = (window.cartStrings?.quantityError || "").replace(
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
          : lineItem.querySelector(`[name="${name}"]`)?.focus();
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
    } catch (error) {
      console.error('[Cart] updateQuantity error:', error);
      this.querySelectorAll(".loading-overlay").forEach((overlay) =>
        overlay.classList.add("hidden")
      );
      const errors =
        document.getElementById("cart-errors") ||
        document.getElementById("CartDrawer-CartErrors");
      if (errors) errors.textContent = window.cartStrings?.error || "Error updating cart";
    } finally {
      this.disableLoading(line);
    }
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
}

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
