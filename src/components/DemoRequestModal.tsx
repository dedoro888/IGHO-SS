import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  GraduationCap,
  Sparkles,
  Check,
  Calendar,
  Clock,
  HeartPulse,
  User,
  Mail,
  Phone,
  Building,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface DemoRequestModalProps {
  onClose: () => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const DemoRequestModal: React.FC<DemoRequestModalProps> = ({ onClose, onNavigate }) => {
  // Steps: 1 = Complete Form, 2 = Review Information, 3 = Success Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Hotel & Hospitality');
  const [productInterested, setProductInterested] = useState<'stay' | 'classroom' | 'medbay'>('stay');
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('10:00');
  const [message, setMessage] = useState('');

  const productInfo = {
    stay: {
      name: 'IGHO Stay',
      desc: 'Hotel & Hospitality Management System (Live)',
      color: 'text-emerald-400 border-emerald-950/40 bg-emerald-950/20',
      icon: Building2,
    },
    classroom: {
      name: 'IGHO Classroom',
      desc: 'School Management System (Upcoming Q3 2027)',
      color: 'text-blue-400 border-blue-950/40 bg-blue-950/20',
      icon: GraduationCap,
    },
    medbay: {
      name: 'IGHO MedBay',
      desc: 'Hospital Management System (Upcoming Q1 2028)',
      color: 'text-rose-400 border-rose-950/40 bg-rose-950/20',
      icon: HeartPulse,
    },
  };

  const handleGoToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !orgName || !demoDate) {
      alert('Please fill in all required fields.');
      return;
    }
    setStep(2);
  };

  const handleSubmitDemo = () => {
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto selection:bg-neutral-850 selection:text-white">
      <div className="w-full max-w-2xl bg-[#0c0d11] border border-[#1e2029] rounded-2xl p-6 sm:p-8 shadow-2xl relative text-neutral-200 text-left my-auto animate-in zoom-in-95 duration-150">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-24 bg-white/[0.01] blur-3xl pointer-events-none rounded-full"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-4 mb-4">
          <button
            onClick={() => {
              if (step === 2) setStep(1);
              else onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-semibold transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>{step === 2 ? 'Back to Form' : 'Cancel'}</span>
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span className="font-extrabold text-xs tracking-tight text-white uppercase font-mono">IGHO DEMO INTENSIVE</span>
          </div>
        </div>

        {/* STEP 1: COMPLETE FORM */}
        {step === 1 && (
          <form onSubmit={handleGoToReview} className="space-y-5 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full">
                Step 1 of 2 • Intake Form
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
                Request an Executive Demo
              </h2>
              <p className="text-neutral-400 text-[11px] sm:text-xs">
                Fill out the specifications below to schedule a personalized live session with our cloud product architects.
              </p>
            </div>

            {/* Product Selection Row - Clearly displays all three IGHO Products */}
            <div className="space-y-2">
              <label className="block font-bold text-neutral-300">Select IGHO Product of Interest *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.keys(productInfo) as Array<keyof typeof productInfo>).map((prodId) => {
                  const isSelected = productInterested === prodId;
                  const item = productInfo[prodId];
                  const Icon = item.icon;
                  return (
                    <div
                      key={prodId}
                      onClick={() => setProductInterested(prodId)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-28 hover:scale-[1.01] ${
                        isSelected
                          ? 'border-white bg-[#111218] text-white shadow-md'
                          : 'border-[#1e2029] bg-[#07080b]/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          isSelected ? 'bg-white/10 border-white/20' : 'bg-neutral-900 border-neutral-800'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-white bg-white text-black' : 'border-neutral-700 bg-neutral-950'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-[11px] text-white">{item.name}</h4>
                        <p className="text-[9px] text-neutral-500 leading-tight truncate">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Full Name *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chinedu Obi"
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Official Email *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. c.obi@yourcompany.com"
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 812 345 6789"
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Organization Name */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Organization Name *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Building className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Royal Heights Hotel"
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Organization Type */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Organization Type *</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full h-11 px-4 rounded-full bg-black border border-neutral-800 hover:border-neutral-700 text-white font-semibold focus:outline-none focus:border-white transition-all cursor-pointer"
                >
                  <option value="Hotel & Hospitality">Hotel & Hospitality</option>
                  <option value="School / Educational Institution">School / Educational Institution</option>
                  <option value="Hospital / Healthcare Clinic">Hospital / Healthcare Clinic</option>
                  <option value="Real Estate / Properties">Real Estate / Properties</option>
                  <option value="Other Industry">Other Industry</option>
                </select>
              </div>

              {/* Date Selection */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-300">Preferred Date *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 text-white focus:outline-none focus:border-white transition-colors cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block font-bold text-neutral-300">Preferred Time *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={demoTime}
                    onChange={(e) => setDemoTime(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 hover:border-neutral-700 text-white font-semibold focus:outline-none focus:border-white transition-all cursor-pointer"
                  >
                    <option value="09:00">Morning Slot • 09:00 AM WAT</option>
                    <option value="11:00">Morning Slot • 11:00 AM WAT</option>
                    <option value="14:00">Afternoon Slot • 02:00 PM WAT</option>
                    <option value="16:00">Afternoon Slot • 04:00 PM WAT</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Message / Additional Information */}
            <div className="space-y-1">
              <label className="block font-bold text-neutral-300">Message / Additional Information</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share any specific features or technical requirements you would like us to highlight during the walkthrough..."
                className="w-full p-4 rounded-2xl bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors resize-none text-xs"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 border-t border-neutral-800 flex justify-end">
              <button
                type="submit"
                className="bg-white hover:bg-neutral-200 text-black px-8 py-3 rounded-full font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg"
              >
                <span>Continue to Review</span>
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: REVIEW INFORMATION */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full">
                Step 2 of 2 • Review & Confirm
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Review Your Demonstration Request
              </h2>
              <p className="text-neutral-400">
                Please verify that your contact and scheduling parameters are correct before submitting to our pilot architect desk.
              </p>
            </div>

            {/* Neat Information Grid Panel */}
            <div className="bg-[#12131a] rounded-xl border border-neutral-800 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-neutral-300">
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Contact Person</span>
                  <span className="text-white text-xs font-semibold">{fullName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Official Email</span>
                  <span className="text-white text-xs font-semibold">{email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Phone Number</span>
                  <span className="text-white text-xs font-semibold">{phone}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Organization Name</span>
                  <span className="text-white text-xs font-semibold">{orgName} ({orgType})</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Demo Product Focus</span>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                      productInterested === 'stay' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                      productInterested === 'classroom' ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                      'bg-rose-950 text-rose-400 border border-rose-900'
                    }`}>
                      {productInfo[productInterested]?.name}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Schedule Preference</span>
                  <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" /> {demoDate} at {demoTime} WAT
                  </span>
                </div>
              </div>

              {message && (
                <div className="border-t border-neutral-800/80 pt-3 space-y-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider block text-[9px]">Additional Context & Instructions</span>
                  <p className="text-neutral-300 italic text-[11px] leading-relaxed bg-black/40 p-3 rounded-lg border border-neutral-800/40">
                    "{message}"
                  </p>
                </div>
              )}
            </div>

            {/* Review Step Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto text-xs font-semibold text-neutral-400 hover:text-white transition-colors py-2 flex items-center gap-1"
              >
                ← Edit Form Details
              </button>

              <button
                onClick={handleSubmitDemo}
                className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black px-8 py-3.5 rounded-full font-extrabold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Submit Request</span>
                <CheckCircle2 className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">Demo request received.</h1>
              <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                Thank you for your interest in IGHO Software Systems. We'll be in touch to arrange your demo.
              </p>
            </div>

            {/* Structured specifications confirmation receipt */}
            <div className="bg-[#12131a] rounded-xl border border-neutral-800 p-4 max-w-md mx-auto text-left text-xs space-y-3">
              <h4 className="font-bold text-white border-b border-neutral-800 pb-2 text-[11px] uppercase tracking-wider text-neutral-300">
                Reservation Receipt Code: <span className="font-mono text-white">IGHO-DEMO-{Math.floor(1000 + Math.random() * 9000)}</span>
              </h4>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] text-neutral-400">
                <span>Selected Focus:</span>
                <span className="text-white font-semibold text-right">{productInfo[productInterested]?.name}</span>

                <span>Date:</span>
                <span className="text-white font-semibold text-right">{demoDate}</span>

                <span>Time:</span>
                <span className="text-white font-semibold text-right">{demoTime} WAT</span>

                <span>Organization:</span>
                <span className="text-white font-semibold text-right truncate">{orgName}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={onClose}
                className="bg-white hover:bg-neutral-200 text-black px-8 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
