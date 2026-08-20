# RugShield — GitHub Flat Final

Upload these files directly to the root of a GitHub repository. No folders are required.

Files:
- index.html — website
- scan.js — Vercel serverless API
- package.json
- vercel.json
- .env.example
- .gitignore
- README.md

## Deploy
1. Create an empty GitHub repository.
2. Upload every file directly to the repository root.
3. Import the repository into Vercel.
4. Deploy.

No `api/` or `public/` folder is needed.

## Scan behavior
The user pastes a token address only. The application attempts to identify the chain automatically across Ethereum, BSC, Robinhood Chain, Base, Arbitrum, Polygon, Avalanche and Solana. The UI does not require manual chain selection.

The API uses public RPC endpoints as fallbacks and live market/metadata sources where available. It does not fabricate security scores when required data is unavailable.

For production-grade security intelligence, an optional GoPlus token can be supplied through Vercel Environment Variables as `GOPLUS_ACCESS_TOKEN`. Never commit secrets to GitHub.
