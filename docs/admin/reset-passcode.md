# Resetting a player's passcode

Run from the project root:

```bash
npx convex run admin:resetPasscode '{"slug":"<slug>"}'
```

Example — reset Candice:

```bash
npx convex run admin:resetPasscode '{"slug":"candice"}'
```

Effects:
- Clears the player's `passcodeHash` (sets it to `null`)
- Deletes all session rows for that player

After running, tell the player to visit the site, click "Player Log In", pick their avatar, and set a new 4-digit passcode. Any other devices they were signed in on will be logged out on their next request (session token no longer valid).

To run against the production deployment instead of dev, prefix with `--prod`:

```bash
npx convex run --prod admin:resetPasscode '{"slug":"candice"}'
```

Valid slugs (v1): `kai`, `khari`, `candice`, `kyanna`, `camara`, `miles`.
