# Performance Optimization: Code Splitting & Lazy Loading

## Notes
- The project is a modern e-commerce template built with Astro, SolidJS, Tailwind, and Braintree.
- User requested a detailed plan for implementing code splitting and lazy loading to improve performance.
- Bundle analysis tools (rollup-plugin-visualizer) and chunk naming added to config.
- Baseline audit and best-practices research completed.
- Switched to rollup-plugin-visualizer for bundle analysis due to npm registry issues.
- Fixed build:stats script to use astro build only.
- Attempted lazy hydration for Testimonials/FAQ, reverted due to Astro component hydration limitations.
- Build verified after dependency and config changes.
- Dynamic imports implemented for Braintree libraries in BraintreeHostedFields (main optimization target).
- User confirmed to proceed with further optimizations: lazy loading homepage media-heavy components (Testimonials, FAQ, Hero video), deferring analytics/optional scripts, etc.
- All homepage, analytics, and third-party script optimizations complete; documentation updated in repo.md.
- All optimization tasks complete.

## Task List
- [x] Audit current bundle and identify large components/pages
- [x] Research Astro/SolidJS best practices for code splitting
- [x] List candidate components/pages for dynamic import/lazy loading
- [x] Plan dynamic imports for heavy or rarely used components (e.g., FAQ, Testimonials, Order Confirmation)
- [x] Plan route-based splitting for pages (Astro supports this natively)
- [x] Identify third-party libraries suitable for async loading (e.g., Braintree, analytics)
- [x] Update import statements to use dynamic imports where appropriate (Testimonials, FAQ, Braintree)
- [x] Test bundle size and loading performance improvements
- [x] Refactor components to support lazy loading (if needed)
- [x] Implement lazy loading for homepage media-heavy components (Testimonials, FAQ, Hero video)
- [x] Defer analytics and optional scripts (e.g., appwrite) using client:idle or similar
- [x] Document the changes in repo.md (include diagrams if helpful)

## Current Goal
Optimization complete – review or request further changes