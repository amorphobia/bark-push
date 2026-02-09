---
inclusion: always
---

# Userscript Development Standards

## vite-plugin-monkey Configuration

### Required Grants
Always declare these in `vite.config.ts` userscript section:
- `GM_xmlhttpRequest` - For making API calls to Bark servers
- `GM_setValue` - For storing user configuration
- `GM_getValue` - For reading user configuration
- `GM_notification` - Optional: for showing confirmation messages

### Match Patterns
- Use `['*://*/*']` to run on all websites
- Be careful with performance on universal scripts

### Namespace & Metadata
- Use descriptive namespace (not the default npm/vite-plugin-monkey)
- Include clear description for users
- Add appropriate version number
- Consider adding @homepageURL and @supportURL

## Development Workflow

### Hot Reload
- Run `pnpm dev` to start development server
- Install the dev version in Tampermonkey (it auto-updates)
- Changes reflect immediately without page refresh

### Building for Production
- Run `pnpm build` to create production userscript
- Output goes to `dist/` folder
- Test the production build before publishing

### Testing Strategy
1. Test on multiple websites (simple pages, complex SPAs)
2. Test with invalid/missing configuration
3. Test network failures (offline, wrong server URL)
4. Test with multiple devices configured
5. Verify Tampermonkey storage persistence

## Code Organization

### File Structure
```
src/
  main.ts          # Entry point, UI injection
  api/
    bark.ts        # Bark API client
  storage/
    config.ts      # GM_setValue/getValue wrappers
  ui/
    components/    # UI elements (settings, notification form)
  types/
    index.ts       # TypeScript interfaces
  utils/
    validation.ts  # Input validation helpers
```

### TypeScript Best Practices
- Use strict mode
- Define interfaces for all data structures
- Type all GM_* function calls properly
- Avoid `any` type

## Security & Privacy

### Never Do This
- ❌ Hardcode API keys or server URLs
- ❌ Send user data to external servers (except Bark)
- ❌ Store sensitive data in plain text (though Bark keys are meant to be semi-public)
- ❌ Execute arbitrary code from user input

### Always Do This
- ✅ Validate all user inputs
- ✅ Use HTTPS for all API calls
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Provide clear privacy information to users
- ✅ Sanitize content before sending to Bark API

## Performance Considerations
- Minimize DOM manipulation
- Use event delegation for dynamic elements
- Lazy load UI components
- Don't block page load
- Clean up event listeners when needed
