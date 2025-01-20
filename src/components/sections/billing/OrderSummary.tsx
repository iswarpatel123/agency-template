/** @jsxImportSource solid-js */
import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { products } from '../../../utils/data/products';
import { prices } from '../../../utils/data/prices';

const OrderSummary = () => {
  const [localQuantity, setLocalQuantity] = createSignal<number>(0);
  const [localSelections, setLocalSelections] = createSignal<
    { color: string; size: string }[]
  >([]);
  const [totalDiscountedPrice, setTotalDiscountedPrice] = createSignal<number>(0);
  const [totalOriginalPrice, setTotalOriginalPrice] = createSignal<number>(0);
  const [savePercentage, setSavePercentage] = createSignal<number>(0);
  const [isExpanded, setIsExpanded] = createSignal(false);

  // Function to check if it's desktop view
  const isDesktopView = () => window.innerWidth >= 768; // Adjust breakpoint as needed

  onMount(() => {
    // Set initial expanded state based on view
    setIsExpanded(isDesktopView());

    const storedQuantity = window.localStorage.getItem('selectedQuantity');
    const storedSelections = window.localStorage.getItem('selections');

    if (storedQuantity) {
      const quantity = parseInt(storedQuantity);
      setLocalQuantity(quantity);

      const priceInfo = prices[quantity] || prices[1];
      setTotalDiscountedPrice(quantity * priceInfo.pricePerPair);
      setTotalOriginalPrice(quantity * priceInfo.originalPrice);
      setSavePercentage(priceInfo.savePercentage);
    }

    if (storedSelections) {
      const selections = JSON.parse(storedSelections);
      setLocalSelections(selections);
    }

    // Add event listener for window resize
    const handleResize = () => {
      // Only change isExpanded state if transitioning between desktop and mobile
      if (isDesktopView() !== isExpanded()) {
        setIsExpanded(isDesktopView());
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup event listener on unmount
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const toggleSummary = () => setIsExpanded(!isExpanded());

  return (
    <div class="order-summary">
      <div class="header" onClick={toggleSummary}>
        <h2>Order Summary</h2>
        <span class="total">{formatPrice(totalDiscountedPrice())}</span>
      </div>

      {isExpanded() ? (
        <>
          {localSelections().map((item) => (
            <div class="item">
              <img
                src={products[0].colors.find((c) => c.name === item.color)?.image || ''}
                alt="FootBound X1"
                class="shoe-image"
              />
              <div class="item-details">
                <h4>FootBound X1</h4>
                <p>Color: {item.color}</p>
                <p>Size: MEN {item.size} / WOMEN {Number(item.size) + 1.5}</p>
              </div>
            </div>
          ))}

          <div class="price-details">
            <div class="retail">
              <span>Subtotal</span>
              <span class="strike-through">
                {formatPrice(totalOriginalPrice())}
              </span>
            </div>
            <p class="shipping-note">
              Shipping and tax will be settled upon checkout confirmation
            </p>
            <div class="savings">
              <span>Today you saved</span>
              <span class="discount">
                Discount: {formatPrice(totalOriginalPrice() - totalDiscountedPrice())}
              </span>
            </div>
            <div class="grand-total">
              <span>Grand Total:</span>
              <span class="final-price">{formatPrice(totalDiscountedPrice())}</span>
            </div>
          </div>

          <button class="close-btn" onClick={toggleSummary}>
            Click to Close Summary ↑
          </button>
        </>
      ) : (
        <button class="expand-btn" onClick={toggleSummary}>
          Click to See Summary ↓
        </button>
      )}

      <style>{`
        .order-summary {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #004236;
          color: white;
          cursor: pointer;
        }

        .header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .total {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .shoe-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
        }

        .item-details h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .item-details p {
          margin: 0.25rem 0;
          color: #000000;
          font-size: 0.875rem;
        }

        .price-details {
          padding: 1rem;
        }

        .retail, .savings, .grand-total {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .strike-through {
          text-decoration: line-through;
          color: #000000;
        }

        .shipping-note {
          color: #000000;
          font-size: 0.875rem;
          margin: 0.5rem 0;
        }

        .discount {
          color: #ef4444;
        }

        .grand-total {
          font-weight: 600;
          font-size: 1.125rem;
          margin-top: 1rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 1rem;
        }

        .close-btn, .expand-btn {
          width: 100%;
          text-align: center;
          color: #000000;
          background: none;
          border: none;
          padding: 1rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .close-btn:hover, .expand-btn:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
};

export default OrderSummary;
