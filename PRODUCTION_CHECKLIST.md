# 🚀 AI Pasta Production Deployment Checklist

## 🏁 PRE-DEPLOYMENT (Do these first)

### 📝 Razorpay Account Setup
- [ ] Create Razorpay business account
- [ ] Complete KYC verification (2-3 business days)
- [ ] Choose "Payment Gateway" product
- [ ] Wait for account activation email

### 🔑 API Keys & Security
- [ ] Generate live API keys from Razorpay dashboard
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Replace all YOUR_* placeholders with real values
- [ ] Generate secure JWT secret (min 32 characters)
- [ ] Set up production MongoDB Atlas cluster

### 🌐 Domain & SSL
- [ ] Purchase domain name
- [ ] Set up SSL certificate
- [ ] Configure DNS records

## 🔧 DEPLOYMENT SETUP

### 🖥️ Server Configuration
- [ ] Deploy backend to production server (Heroku/Railway/VPS)
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Update CORS settings for production domain
- [ ] Configure environment variables on hosting platform

### 🔗 Razorpay Configuration
- [ ] Add webhook URL: `https://your-domain.com/api/plans/webhook`
- [ ] Select webhook events: `payment.captured`, `payment.failed`, `order.paid`
- [ ] Set webhook secret (match your .env file)
- [ ] Enable live mode in Razorpay dashboard

### 🧪 Testing
- [ ] Run production checker: `node scripts/check-production.js`
- [ ] Test with ₹1 transaction
- [ ] Verify webhook delivery
- [ ] Test plan purchases end-to-end
- [ ] Verify token crediting

## 🎯 GO-LIVE STEPS

### 🚀 Final Launch
- [ ] Switch from test to live Razorpay keys
- [ ] Update frontend to production API URLs
- [ ] Test complete user journey
- [ ] Monitor error logs
- [ ] Set up payment monitoring/alerts

### 📊 Post-Launch Monitoring
- [ ] Monitor Razorpay dashboard for payments
- [ ] Check webhook delivery success rates  
- [ ] Monitor user registration and token usage
- [ ] Set up automated backups
- [ ] Configure log aggregation

## 💰 PRICING BREAKDOWN

### Razorpay Transaction Fees
- **Domestic cards**: 2% + GST
- **International cards**: 3% + GST
- **UPI/Net Banking**: 2% + GST
- **Wallets**: 2% + GST

### Your Profit Margins (after 2% + GST ≈ 2.36%)
- **₹19 plan**: ~₹18.55 net (97.6%)
- **₹99 plan**: ~₹96.66 net (97.6%)

## 🆘 SUPPORT CONTACTS

### Razorpay Support
- **Email**: support@razorpay.com
- **Phone**: +91-80-61581111
- **Dashboard**: Live chat available

### Documentation
- **API Docs**: https://razorpay.com/docs/
- **Webhooks**: https://razorpay.com/docs/webhooks/
- **Testing**: https://razorpay.com/docs/payment-gateway/test-card-details/

---

## ⚡ QUICK START (If you have Razorpay account ready)

1. **Get live keys**: Razorpay Dashboard → Settings → API Keys
2. **Update environment**: Copy template, add real values  
3. **Deploy code**: Your current code is production-ready!
4. **Set webhook**: Point to your domain + `/api/plans/webhook`
5. **Test**: Small transaction to verify everything works

Your integration is already production-ready - just need the live keys! 🎉