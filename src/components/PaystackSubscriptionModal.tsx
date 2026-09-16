import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  PhoneCall,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { SubscriptionPlan } from '../types';

interface PaystackSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'annual';
  customerEmail: string;
  hotelName: string;
  onSuccess: (paymentReference: string) => void;
}

export const PaystackSubscriptionModal: React.FC<PaystackSubscriptionModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  customerEmail,
  hotelName,
  onSuccess,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'card' | 'bank' | 'transfer' | 'ussd'>('card');
  const [cardNumber, setCardNumber] = useState('5399 •••• •••• 4821');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('831');
  const [cardName, setCardName] = useState(hotelName ? `${hotelName} Admin` : 'Finance Director');
  
  const [selectedBank, setSelectedBank] = useState('GTBank Nigeria');
  const [selectedUssdBank, setSelectedUssdBank] = useState('gtb');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dueAmount = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const paystackRef = `pstk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  // Simulated Paystack Virtual Dynamic Account for transfer
  const virtualAccount = {
    bankName: 'Wema Bank (Paystack Checkout)',
    accountNumber: '0289410384',
    accountName: `IGHO-${hotelName.slice(0, 10).toUpperCase()}`,
    expiresIn: '29:45',
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTransactionRef(paystackRef);
      setTimeout(() => {
        onSuccess(paystackRef);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-neutral-100 flex flex-col max-h-[92vh]">
        {/* Paystack Header Banner */}
        <div className="bg-[#0BA4DB] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm tracking-tight text-white">
              P
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-wide uppercase text-white/80">Secured by Paystack</div>
              <div className="text-sm font-bold text-white tracking-tight">IGHO Platform Gateway</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Header */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">{customerEmail}</div>
            <div className="text-xs font-bold text-neutral-900">{plan.name} ({billingCycle})</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Amount Due</div>
            <div className="text-lg font-black text-black">₦{dueAmount.toLocaleString()}</div>
          </div>
        </div>

        {/* Success State */}
        {paymentSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-neutral-900">Payment Successful</h3>
              <p className="text-xs text-neutral-500">
                Your subscription has been activated instantly via Paystack.
              </p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 font-mono text-center">
              Ref: {transactionRef}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to your workspace...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Paystack Channel Selection Tabs */}
            <div className="grid grid-cols-4 gap-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedChannel('card')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedChannel === 'card'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px]">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('bank')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedChannel === 'bank'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-[10px]">Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('transfer')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedChannel === 'transfer'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span className="text-[10px]">Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('ussd')}
                className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedChannel === 'ussd'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                <span className="text-[10px]">USSD</span>
              </button>
            </div>

            {/* Channel Content */}
            <form onSubmit={handlePay} className="space-y-4">
              {selectedChannel === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#0BA4DB]"
                        placeholder="0000 0000 0000 0000"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">💳</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Valid Thru</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#0BA4DB]"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#0BA4DB]"
                        placeholder="123"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0BA4DB]"
                      required
                    />
                  </div>
                </div>
              )}

              {selectedChannel === 'bank' && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500">
                    Authenticate directly through your Nigerian bank's secure portal or app.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Select Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0BA4DB]"
                    >
                      <option>GTBank Nigeria</option>
                      <option>Zenith Bank PLC</option>
                      <option>Access Bank Nigeria</option>
                      <option>First Bank of Nigeria</option>
                      <option>Kuda Microfinance Bank</option>
                      <option>Providus Bank</option>
                      <option>United Bank for Africa (UBA)</option>
                    </select>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 space-y-1">
                    <span className="font-semibold text-neutral-800 block">Authorization:</span>
                    <span>You will be prompted to enter your Internet Banking credentials or OTP to complete this ₦{dueAmount.toLocaleString()} payment.</span>
                  </div>
                </div>
              )}

              {selectedChannel === 'transfer' && (
                <div className="space-y-3">
                  <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-900">Paystack Dynamic Virtual Account</span>
                      <span className="text-[10px] bg-sky-200/60 text-sky-900 px-2 py-0.5 rounded-full font-mono">
                        Expires in {virtualAccount.expiresIn}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-600 space-y-1">
                      <div>Bank: <span className="font-bold text-neutral-900">{virtualAccount.bankName}</span></div>
                      <div className="flex items-center justify-between">
                        <span>Account Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-neutral-900">{virtualAccount.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(virtualAccount.accountNumber)}
                            className="p-1 text-neutral-500 hover:text-black"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>Beneficiary: <span className="font-semibold text-neutral-900">{virtualAccount.accountName}</span></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Make a bank transfer of exactly ₦{dueAmount.toLocaleString()} to this dedicated account. Paystack automatically verifies within seconds.
                  </p>
                </div>
              )}

              {selectedChannel === 'ussd' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Choose Bank for USSD</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'gtb', name: 'GTBank', code: '*737*50*Amount*104#' },
                        { id: 'zenith', name: 'Zenith Bank', code: '*966*00*Amount#' },
                        { id: 'access', name: 'Access Bank', code: '*901*00*Amount#' },
                        { id: 'uba', name: 'UBA', code: '*919*00*Amount#' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedUssdBank(b.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedUssdBank === b.id
                              ? 'border-[#0BA4DB] bg-sky-50/50 font-bold'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="text-neutral-900 font-semibold">{b.name}</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{b.code}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 font-mono text-center">
                    Dial code on your registered SIM to authorize payment.
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-[#0BA4DB] hover:bg-[#0993C5] text-white py-3.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing with Paystack...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay ₦{dueAmount.toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Level 1 Certified · 256-bit Encryption · Paystack</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
