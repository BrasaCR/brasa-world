# BRASA Lessons widget

Add the module once and identify the public school tenant:

```html
<script type="module" src="https://api.brasa.world/widgets/lessons.js"></script>
<brasa-lessons school-id="school-id" locale="en"></brasa-lessons>
```

The widget has no framework dependency, sends no credentials, uses semantic live status, preserves host-page styles through Shadow DOM, and renders API strings with `textContent`. Only published lessons returned by the public Education service appear.

Run `npm run build` before packaging the API Worker; this creates a minimal ignored asset bundle containing the catalog contract and widgets.

Business pathways use the same credential-free model:

```html
<script type="module" src="https://api.brasa.world/widgets/business-pathways.js"></script>
<brasa-business-pathways capability="customer-service" country-code="CR"></brasa-business-pathways>
```

Civic discovery remains anonymous and clearly labels links as informational:

```html
<script type="module" src="https://api.brasa.world/widgets/government-services.js"></script>
<brasa-government-services query="water" country-code="CR"></brasa-government-services>
```
