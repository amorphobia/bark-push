---
inclusion: always
---

# Code Style & Standards

## TypeScript Configuration
- Use strict mode (`strict: true`)
- Enable all recommended checks
- No implicit any
- Strict null checks enabled

## Naming Conventions
- **Files**: kebab-case (`bark-api.ts`, `device-config.ts`)
- **Classes**: PascalCase (`BarkClient`, `DeviceManager`)
- **Functions**: camelCase (`sendNotification`, `getUserConfig`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `API_VERSION`)
- **Interfaces**: PascalCase with descriptive names (`BarkDevice`, `NotificationPayload`)

## Code Organization Principles

### Keep It Simple
- Write minimal code that solves the problem
- Avoid over-engineering
- Prefer clarity over cleverness
- One function = one responsibility

### Error Handling
```typescript
// Always handle errors with user-friendly messages
try {
  await sendNotification(device, payload);
} catch (error) {
  showUserError('Failed to send notification. Check your device settings.');
  console.error('Bark API error:', error);
}
```

### Comments
- Write self-documenting code (good names > comments)
- Add comments for "why", not "what"
- Document complex logic or workarounds
- Add JSDoc for public APIs

## UI/UX Standards

### User-Facing Text
- Clear, concise, friendly
- No technical jargon
- Actionable error messages
- Example: "Server URL is required" not "Invalid config.serverUrl"

### Visual Design
- Clean, minimal interface
- Consistent spacing and colors
- Mobile-friendly (if applicable)
- Accessible (proper contrast, keyboard navigation)

### User Feedback
- Show loading states for async operations
- Confirm successful actions
- Explain errors clearly
- Provide helpful hints

## Git Commit Messages
- Use conventional commits format
- Examples:
  - `feat: add multi-device support`
  - `fix: handle network timeout errors`
  - `docs: update README with setup instructions`
  - `refactor: simplify storage API`

## Testing Mindset
- Test happy path AND edge cases
- Think about what users will break
- Validate all inputs
- Handle network failures gracefully
- Test on different websites (simple HTML, React SPAs, etc.)
