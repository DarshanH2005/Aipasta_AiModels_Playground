import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../lib/api-client.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { IconCurrency, IconCheck, IconStar, IconBolt, IconShield, IconRocket, IconX } from '@tabler/icons-react';

const PlansModal = ({ isOpen, onClose, onPlanSelect }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  // Local safe JSON parser: read text, detect HTML/dev-overlay, and attempt JSON.parse
  const safeParseResponse = async (response) => {
    const text = await response.text();
    const isHtml = /<\/?html|<!doctype html|<\!DOCTYPE/i.test(text) || response.headers.get('content-type')?.includes('text/html');
    if (isHtml) {
      return { __nonJson: true, text };
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return { __nonJson: true, text };
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
  // Use buildApiUrl to construct a backend URL that respects NEXT_PUBLIC_API_URL or origin
  const plansUrl = buildApiUrl('/api/plans');
  const response = await fetch(plansUrl, { credentials: 'include' });
      const data = await safeParseResponse(response);
      if (data && data.__nonJson) {
        console.warn('Non-JSON plans response', data.text?.slice?.(0,200));
        throw new Error('Non-JSON response when loading plans');
      }
      
      if (data.status === 'success') {
        setPlans(data.data.plans);
      } else {
        setError('Failed to load plans');
      }
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan) => {
    try {
      setPurchasing(true);
      // For free plans, fallback to mock purchase endpoint which credits tokens server-side
      if (plan.priceINR === 0) {
        const purchaseUrl = buildApiUrl(`/api/plans/${plan._id}/purchase`);
        const response = await fetch(purchaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ paymentMethod: 'mock' })
        });
        const result = await safeParseResponse(response);
        if (result && result.__nonJson) throw new Error('Non-JSON response from purchase endpoint');
        if (result.status === 'success') {
          if (onPlanSelect) onPlanSelect(result.data);
          alert(`Successfully activated ${plan.displayName}!${plan.tokens > 0 ? ` You received ${plan.tokens.toLocaleString()} tokens.` : ''}`);
          onClose();
          return;
        }
        throw new Error(result.message || 'Purchase failed');
      }

      // Paid plan: create server-side Razorpay order
      const createOrderUrl = buildApiUrl(`/api/plans/${plan._id}/create-order`);
      const createRes = await fetch(createOrderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const createResult = await safeParseResponse(createRes);
      if (createResult && createResult.__nonJson) throw new Error('Non-JSON response from create-order');
      if (createResult.status !== 'success' || !createResult.data) throw new Error(createResult.message || 'Failed to create order');

      const { orderId, amount, currency, razorpayKey } = createResult.data;

      // Load Razorpay script dynamically
      await new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.body.appendChild(s);
      });

      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: 'AI Pasta',
        description: plan.displayName,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment with backend
            const verifyUrl = buildApiUrl(`/api/plans/${plan._id}/verify-payment`);
            const verifyRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyResult = await safeParseResponse(verifyRes);
            if (verifyResult && verifyResult.__nonJson) throw new Error('Non-JSON response from verify endpoint');
            if (verifyResult.status === 'success') {
              if (onPlanSelect) onPlanSelect(verifyResult.data);
              alert(`Payment successful — ${plan.tokens.toLocaleString()} tokens credited.`);
              onClose();
            } else {
              throw new Error(verifyResult.message || 'Verification failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment processed but verification failed. Our team will reconcile this.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          plan_id: plan._id
        },
        theme: {
          color: '#6D28D9'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      console.error('Purchase error:', err);
      const errorMessage = err.message || 'Purchase failed. Please try again.';
      console.log('Detailed error info:', {
        planId: plan._id,
        planPrice: plan.priceINR,
        token: localStorage.getItem('authToken') ? 'Present' : 'Missing',
        error: errorMessage
      });
      alert(`Error: ${errorMessage}`);
    } finally {
      setPurchasing(false);
    }
  };

  const getPlanIcon = (modelType) => {
    switch (modelType) {
      case 'free':
        return <IconBolt className="w-6 h-6" />;
      case 'paid':
        return <IconRocket className="w-6 h-6" />;
      case 'premium':
        return <IconShield className="w-6 h-6" />;
      default:
        return <IconStar className="w-6 h-6" />;
    }
  };

  const getPlanColor = (modelType) => {
    switch (modelType) {
      case 'free':
        return 'blue';
      case 'paid':
        return 'purple';
      case 'premium':
        return 'gold';
      default:
        return 'gray';
    }
  };

  const formatTokens = (tokens) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(0)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  // Get savings percentage compared to the most expensive plan
  const getSavingsPercent = (currentPrice, highestPrice) => {
    if (currentPrice === 0 || currentPrice >= highestPrice) return null;
    return Math.round(((highestPrice - currentPrice) / highestPrice) * 100);
  };

  // Get plan urgency text
  const getUrgencyText = (planName) => {
    const urgencyTexts = {
      'pocket-pack': '🔥 LIMITED TIME: ₹39 only!',
      'pro-essential': '⏰ Most Popular Choice!',
      'pro-unlimited': '🚀 Best Value for Professionals!',
      'enterprise': '💼 Custom Solutions Available!'
    };
    return urgencyTexts[planName] || '';
  };

  // Get social proof text
  const getSocialProof = (planName) => {
    const proofTexts = {
      'pocket-pack': '🎯 2,847+ users chose this',
      'starter-boost': '👥 Perfect for students',
      'pro-essential': '⭐ #1 Choice for professionals',
      'pro-unlimited': '🏆 Trusted by 500+ businesses'
    };
    return proofTexts[planName] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header with conversion psychology */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">
              🚀 Unlock Your AI Superpowers!
            </h2>
            <p className="text-purple-100 text-lg mb-1">
              Join 10,000+ users already using premium AI
            </p>
            <p className="text-sm text-purple-200">
              ⏰ Limited time: Get premium AI for the price of a coffee!
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading plans...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={loadPlans}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const color = getPlanColor(plan.modelType);
                const isPocketPack = plan.name === 'pocket-pack';
                const isProEssential = plan.modelType === 'paid';
                const isPopular = isPocketPack || isProEssential;
                const highestPrice = Math.max(...plans.map(p => p.priceINR));
                const savings = getSavingsPercent(plan.priceINR, highestPrice);
                const urgencyText = getUrgencyText(plan.name);
                const socialProof = getSocialProof(plan.name);
                
                return (
                  <div
                    key={plan._id}
                    className={`relative border-2 rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      isPocketPack 
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 shadow-orange-200 transform scale-105' 
                        : isProEssential
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-purple-200'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    {/* Urgency Badge */}
                    {urgencyText && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold animate-pulse ${
                          isPocketPack 
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        }`}>
                          {urgencyText}
                        </span>
                      </div>
                    )}

                    {/* Savings Badge */}
                    {savings && savings > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Save {savings}%
                        </div>
                      </div>
                    )}

                    {/* Plan icon and type */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                      color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      color === 'gold' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getPlanIcon(plan.modelType)}
                    </div>

                    {/* Plan details */}
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {plan.displayName}
                    </h3>
                    
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                      {plan.description}
                    </p>

                    {/* Pricing with Psychology */}
                    <div className="mb-6">
                      {plan.priceINR === 0 ? (
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">FREE</div>
                          <div className="text-sm text-green-600">Perfect to Get Started</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            {isPocketPack && (
                              <span className="text-lg text-gray-500 line-through mr-2">₹99</span>
                            )}
                            <span className={`text-3xl font-bold ${
                              isPocketPack 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-neutral-900 dark:text-neutral-100'
                            }`}>
                              ₹{plan.priceINR}
                            </span>
                          </div>
                          
                          {/* Daily cost psychology */}
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Only ₹{(plan.priceINR / 30).toFixed(1)}/day
                          </div>
                          
                          {/* Token value */}
                          <div className="text-xs text-neutral-500">
                            {formatTokens(plan.tokens)} tokens included
                          </div>
                          
                          {/* Pocket Pack special messaging */}
                          {isPocketPack && (
                            <div className="mt-2 text-xs text-orange-600 font-medium animate-pulse">
                              🍿 Less than a movie ticket!
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Social Proof */}
                    {socialProof && (
                      <div className="text-center mb-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full inline-block">
                          {socialProof}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <IconCheck className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Purchase button with psychology */}
                    <button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing}
                      className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                        isPocketPack
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white animate-pulse'
                          : isPopular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                          : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white dark:from-gray-100 dark:to-gray-200 dark:hover:from-gray-200 dark:hover:to-gray-300 dark:text-gray-900'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                    >
                      {purchasing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                          Processing...
                        </div>
                      ) : plan.priceINR === 0 ? (
                        <span className="flex items-center justify-center">
                          🚀 Start Free Journey
                        </span>
                      ) : isPocketPack ? (
                        <span className="flex items-center justify-center">
                          🔥 Grab This Deal Now!
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          ⚡ Upgrade Now
                        </span>
                      )}
                    </button>

                    {/* Urgency/Scarcity messaging */}
                    {isPocketPack && (
                      <div className="mt-3 text-center">
                        <div className="text-xs text-orange-600 font-medium">
                          ⏰ Limited time offer expires soon!
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Join 2,847+ smart users who chose this
                        </div>
                      </div>
                    )}

                    {/* Risk reversal for premium plans */}
                    {plan.priceINR > 100 && (
                      <div className="mt-3 text-center">
                        <div className="text-xs text-gray-500">
                          💰 30-day money-back guarantee
                        </div>
                      </div>
                    )}

                    {/* Value indicator */}
                    {plan.priceINR > 0 && (
                      <div className="mt-3 text-center">
                        <span className="text-xs text-neutral-500">
                          {Math.round(plan.tokens / plan.priceINR).toLocaleString()} tokens per ₹
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with trust signals and urgency */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10">
          <div className="text-center space-y-3">
            {/* Trust signals */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                🔒 <span className="ml-1">Secure by Razorpay</span>
              </div>
              <div className="flex items-center">
                ⚡ <span className="ml-1">Instant Activation</span>
              </div>
              <div className="flex items-center">
                💰 <span className="ml-1">Money-back Guarantee</span>
              </div>
            </div>
            
            {/* Social proof counter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 inline-block">
              <div className="text-lg font-bold text-green-600">🔥 2,847+ Happy Users</div>
              <div className="text-xs text-gray-500">Upgraded in the last 30 days</div>
            </div>
            
            {/* Final urgency push */}
            <div className="text-center">
              <p className="text-sm text-orange-600 font-medium animate-pulse">
                ⏰ Special pricing ends in 24 hours! Don't miss out.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All plans include email support • Premium plans include priority support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansModal;