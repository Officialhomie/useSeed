This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root of your project with the following content:

```
# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here


```

- Replace `your-privy-app-id-here` with your actual Privy App ID from [privy.io](https://privy.io)
- The Biconomy API key shown above is an example - replace it with your actual API key from the Biconomy Dashboard


The code dynamically inserts the chain ID based on the current chain being used (e.g., baseSepolia has ID 84532).

**Note:** The `.env.local` file is gitignored by default, which means it won't be committed to your repository. This is intentional as it contains sensitive information.

### Complete Biconomy Nexus Integration

To fully implement the Biconomy Nexus integration:

1. Install ethers.js:
   ```bash
   npm install ethers@5.7.2
   # or
   yarn add ethers@5.7.2
   ```

2. Set up a Biconomy account and get your API key from the [Biconomy Dashboard](https://dashboard.biconomy.io)

3. Add the environment variables to your `.env.local` file as shown above

4. Uncomment the production code in `src/app/page.tsx`

### Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.