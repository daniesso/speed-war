# Contest

Some initial setup is required:

- npx remix init
- npm install
- npm run setup

An `.env` file must be present credentials and properties.

For instance:

```
DATABASE_URL="file:./data.db?connection_limit=1"
SESSION_SECRET="99a64178-97f7-4ef2-bc8c-b88f3946efae"
BOOTSTRAP_ACCESS_KEY="976da142-7afe-49c5-8c08-bdea79ae2452"
REPO_BASE_PATH= "/path/to/repo/speed-war"
```

Then, to start app:

```
npm run dev
```

## Remix Indie Stack

This app uses the Remix [Indie Stack](https://github.com/remix-run/indie-stack) template.
