# 🧹 NETLIFY ENVIRONMENT VARIABLES CLEANUP

## ❌ REMOVE These Environment Variables

Go to **Netlify Dashboard** → **Your Site** → **Site Settings** → **Environment Variables** and **DELETE** these:

```bash
# ❌ DELETE - No longer needed (moved to backend)
VITE_OPENAI_API_KEY
VITE_GEMINI_API_KEY  
VITE_REPLICATE_API_TOKEN
```

## ✅ KEEP These Environment Variables

Make sure these are still present (they're needed):

```bash
# ✅ KEEP - Frontend needs these (public by design)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ KEEP - Backend functions need these (secure)
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=r8_...
```

## 🚀 After Cleanup

1. **Redeploy** your site: `netlify deploy --prod`
2. **Test** that everything still works
3. **Verify** no API keys are visible in browser dev tools

## ✅ Security Verification

After cleanup, check browser dev tools → Network tab:
- ❌ Should NOT see any `sk-` keys (OpenAI)
- ❌ Should NOT see any `r8_` tokens (Replicate)  
- ❌ Should NOT see Gemini API keys
- ✅ Should only see `pk_` keys (Stripe publishable - this is OK)