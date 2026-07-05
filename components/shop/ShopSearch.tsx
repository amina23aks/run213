export function ShopSearch() {
  return (
    <form className="shopSearch" action="#" role="search">
      <label>
        <span>Search products</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input type="search" placeholder="Search products" />
      </label>
    </form>
  );
}
