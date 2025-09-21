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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Upgrade Your Plan
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Choose a plan that fits your AI usage needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const color = getPlanColor(plan.modelType);
                const isPopular = plan.modelType === 'paid';
                
                return (
                  <div
                    key={plan._id}
                    className={`relative border-2 rounded-xl p-6 transition-all duration-200 hover:scale-105 ${
                      isPopular 
                        ? 'border-purple-500 shadow-purple-100 dark:shadow-purple-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Most Popular
                        </span>
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

                    {/* Pricing */}
                    <div className="mb-6">
                      {plan.priceINR === 0 ? (
                        <div className="text-2xl font-bold text-green-600">Free</div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                            ₹{plan.priceINR}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                            / {formatTokens(plan.tokens)} tokens
                          </span>
                        </div>
                      )}
                    </div>

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

                    {/* Purchase button */}
                    <button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isPopular
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {purchasing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Processing...
                        </div>
                      ) : plan.priceINR === 0 ? (
                        'Get Started'
                      ) : (
                        'Purchase Plan'
                      )}
                    </button>

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

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/20">
          <div className="text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              🔒 Secure payment powered by Razorpay
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              All plans include email support. Enterprise plans include priority support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansModal;