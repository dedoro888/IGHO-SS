import React, { useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  User,
  MapPin,
  School,
  Building2,
  ArrowRight,
  Check,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface WaitlistViewProps {
  type: 'classroom' | 'medbay';
  onNavigate: (screen: ActiveScreen) => void;
}

export const WaitlistView: React.FC<WaitlistViewProps> = ({ type: initialType, onNavigate }) => {
  // Waitlist Steps: 1 = Select Product, 2 = Complete Form, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProduct, setSelectedProduct] = useState<'classroom' | 'medbay'>(initialType);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');

  // Handle product select card click
  const selectProductAndContinue = (prod: 'classroom' | 'medbay') => {
    setSelectedProduct(prod);
    // Reset institution type when product changes so default is correct
    if (prod === 'classroom') {
      setInstitutionType('Primary and Secondary school');
    } else {
      setInstitutionType('Hospital');
    }
    setStep(2);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !orgName || !institutionType || !city || !stateName) {
      alert('Please fill out all required fields.');
      return;
    }
    const newEntry = {
      id: `wl-${Date.now()}`,
      fullName,
      email,
      phone,
      orgName,
      institutionType,
      city,
      stateName,
      additionalComments,
      product: selectedProduct,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    try {
      const currentList = JSON.parse(localStorage.getItem('igho_waitlists') || '[]');
      currentList.push(newEntry);
      localStorage.setItem('igho_waitlists', JSON.stringify(currentList));
    } catch (err) {
      console.error(err);
    }
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-neutral-200 px-4 sm:px-6 py-8 flex flex-col justify-between selection:bg-neutral-800 selection:text-white">
      {/* Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-neutral-800/60">
        <button
          onClick={() => {
            if (step === 2) setStep(1);
            else onNavigate('landing');
          }}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white font-semibold transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{step === 2 ? 'Back to Selection' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-6 h-6 bg-white text-black font-black rounded-lg flex items-center justify-center text-xs shadow-sm">
            I
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">IGHO</span>
        </div>

        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full">
          Pre-Release Registry
        </span>
      </header>

      {/* Steps Visual Progress Tracker */}
      <div className="max-w-md mx-auto w-full pt-8 pb-2 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            step >= 1 ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
          }`}>
            1
          </div>
          <span className={step >= 1 ? 'text-white font-semibold' : 'text-neutral-500'}>Product</span>
        </div>
        <div className="w-8 h-[1px] bg-neutral-800"></div>
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            step >= 2 ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
          }`}>
            2
          </div>
          <span className={step >= 2 ? 'text-white font-semibold' : 'text-neutral-500'}>Form Details</span>
        </div>
        <div className="w-8 h-[1px] bg-neutral-800"></div>
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            step >= 3 ? 'bg-emerald-500 text-black' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
          }`}>
            ✓
          </div>
          <span className={step >= 3 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>Done</span>
        </div>
      </div>

      {/* Content Canvas */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10">
        <div className="w-full max-w-2xl bg-[#0c0d11] border border-[#1e2029] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-32 bg-white/[0.015] blur-3xl pointer-events-none rounded-full"></div>

          {/* STEP 1: PRODUCT SELECTION */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exclusive Early Access Pilot Registration</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Select Upcoming Product
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  These IGHO suite solutions are currently under closed development. Join our priority waitlist to secure early deployment slots, system training, and pre-release pricing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* IGHO Classroom Card */}
                <div
                  onClick={() => selectProductAndContinue('classroom')}
                  className={`group relative rounded-2xl border p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] hover:shadow-[0_12px_30px_-10px_rgba(30,144,255,0.15)] ${
                    selectedProduct === 'classroom'
                      ? 'border-blue-500/50 bg-[#0e121d] text-white'
                      : 'border-[#1e2029] bg-[#090a0d] hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/50 text-blue-400 flex items-center justify-center shadow-inner">
                        <GraduationCap className="w-5 h-5 stroke-[2]" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-900/50 px-2 py-0.5 rounded-full">
                        Upcoming Q3 2027
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                        <span>IGHO Classroom</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-400" />
                      </h3>
                      <p className="text-[11px] font-medium text-blue-400/80">School Management System</p>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Complete educational enterprise planning: student databases, fee collection, gradebooks, timetables, and unified parent-teacher portals.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800/40 flex items-center justify-between text-[11px] font-semibold text-neutral-500 group-hover:text-white transition-colors">
                    <span>Configure Waitlist Form</span>
                    <span className="text-blue-400 font-extrabold">Join Classroom →</span>
                  </div>
                </div>

                {/* IGHO MedBay Card */}
                <div
                  onClick={() => selectProductAndContinue('medbay')}
                  className={`group relative rounded-2xl border p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] hover:shadow-[0_12px_30px_-10px_rgba(244,63,94,0.15)] ${
                    selectedProduct === 'medbay'
                      ? 'border-rose-500/50 bg-[#160f13] text-white'
                      : 'border-[#1e2029] bg-[#090a0d] hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/50 text-rose-400 flex items-center justify-center shadow-inner">
                        <HeartPulse className="w-5 h-5 stroke-[2]" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-900/50 px-2 py-0.5 rounded-full">
                        Upcoming Q1 2028
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                        <span>IGHO MedBay</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-rose-400" />
                      </h3>
                      <p className="text-[11px] font-medium text-rose-400/80">Hospital Management System</p>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Smarter clinical care workflows: inpatient ward bed planning, outpatient consult portals, pharmacy stock logs, electronic records, and claims billing.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800/40 flex items-center justify-between text-[11px] font-semibold text-neutral-500 group-hover:text-white transition-colors">
                    <span>Configure Waitlist Form</span>
                    <span className="text-rose-400 font-extrabold">Join MedBay →</span>
                  </div>
                </div>
              </div>

              {/* Highlighting general unavailability */}
              <div className="bg-[#12131a] rounded-xl p-4 border border-[#1e2029] text-center text-xs text-neutral-400">
                <span className="font-semibold text-neutral-200">Please note:</span> Both systems are currently in pre-release stage. Demonstration sandboxes and early client registry slots are strictly limited on a first-come, first-served basis.
              </div>
            </div>
          )}

          {/* STEP 2: WAITLIST FORM */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[#1e2029] pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Registry Intake • Step 2 of 2
                  </span>
                  <h2 className="text-xl font-black text-white">
                    {selectedProduct === 'classroom' ? 'IGHO Classroom Details' : 'IGHO MedBay Details'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
                  {selectedProduct === 'classroom' ? (
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                  ) : (
                    <HeartPulse className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-xs font-bold text-white">
                    {selectedProduct === 'classroom' ? 'Classroom (Q3 2027)' : 'MedBay (Q1 2028)'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* Product Select Field (Hidden verification & option to swap) */}
                <div className="space-y-1">
                  <label className="block font-bold text-neutral-300">Waitlist Product *</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => {
                      const val = e.target.value as 'classroom' | 'medbay';
                      setSelectedProduct(val);
                      setInstitutionType(val === 'classroom' ? 'Primary and Secondary school' : 'Hospital');
                    }}
                    className="w-full h-11 px-4 rounded-full bg-black border border-neutral-800 hover:border-neutral-700 text-white font-semibold focus:outline-none focus:border-white transition-all cursor-pointer"
                  >
                    <option value="classroom">IGHO Classroom (School Management System — Q3 2027)</option>
                    <option value="medbay">IGHO MedBay (Hospital Management System — Q1 2028)</option>
                  </select>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="e.g. Kolawole Davies"
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
                        placeholder="e.g. k.davies@institution.org"
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
                        placeholder="e.g. +234 803 456 7890"
                        className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Organization/Institution Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-neutral-300">
                      {selectedProduct === 'classroom' ? 'Institution Name *' : 'Organization Name *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        <School className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder={selectedProduct === 'classroom' ? 'e.g. Royal Academy Lagos' : 'e.g. City General Hospital'}
                        className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Institution/Organization Type */}
                  <div className="space-y-1">
                    <label className="block font-bold text-neutral-300">
                      {selectedProduct === 'classroom' ? 'Institution Type *' : 'Organization Type *'}
                    </label>
                    <select
                      value={institutionType}
                      onChange={(e) => setInstitutionType(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-black border border-neutral-800 hover:border-neutral-700 text-white font-semibold focus:outline-none focus:border-white transition-all cursor-pointer"
                    >
                      {selectedProduct === 'classroom' ? (
                        <>
                          <option value="Primary and Secondary school">Primary and Secondary school</option>
                          <option value="Tertiary institution">Tertiary institution</option>
                          <option value="Other">Other</option>
                        </>
                      ) : (
                        <>
                          <option value="Hospital">Hospital</option>
                          <option value="Clinic">Clinic</option>
                          <option value="Medical Centre">Medical Centre</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* City */}
                  <div className="space-y-1">
                    <label className="block font-bold text-neutral-300">City *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Ikeja"
                        className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block font-bold text-neutral-300">State *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Lagos State"
                        className="w-full h-11 pl-10 pr-4 rounded-full bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional notes / requirements */}
                <div className="space-y-1 pt-2">
                  <label className="block font-bold text-neutral-300">Message / Key Requirements</label>
                  <textarea
                    rows={2}
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    placeholder="e.g. Specific regional integrations, local currency processing, grade structures, HMO modules..."
                    className="w-full p-4 rounded-2xl bg-black border border-neutral-800 placeholder:text-neutral-600 text-white focus:outline-none focus:border-white transition-colors resize-none text-xs"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-800/60">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto text-xs font-semibold text-neutral-400 hover:text-white transition-colors py-2"
                  >
                    ← Select Product
                  </button>

                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black px-8 py-3.5 rounded-full font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Request Early Access</span>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 3 && (
            <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">You're on the list.</h1>
                <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                  We'll notify you when this IGHO product becomes available.
                </p>
              </div>

              {/* Submitted Details Review panel */}
              <div className="bg-[#12131a] rounded-xl border border-neutral-800 p-4 max-w-md mx-auto text-left text-xs space-y-3">
                <h4 className="font-bold text-white border-b border-neutral-800 pb-2 text-[11px] uppercase tracking-wider text-neutral-300">
                  Registry Summary
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                  <span className="text-neutral-500">Contact Name:</span>
                  <span className="text-neutral-200 font-semibold text-right">{fullName}</span>

                  <span className="text-neutral-500">Product:</span>
                  <span className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                      selectedProduct === 'classroom' ? 'bg-blue-950/50 text-blue-300 border border-blue-900/50' : 'bg-rose-950/50 text-rose-300 border border-rose-900/50'
                    }`}>
                      {selectedProduct === 'classroom' ? 'IGHO Classroom' : 'IGHO MedBay'}
                    </span>
                  </span>

                  <span className="text-neutral-500">Institution:</span>
                  <span className="text-neutral-200 font-semibold text-right truncate">{orgName}</span>

                  <span className="text-neutral-500">Type:</span>
                  <span className="text-neutral-200 font-semibold text-right">{institutionType}</span>

                  <span className="text-neutral-500">Location:</span>
                  <span className="text-neutral-200 font-semibold text-right">{city}, {stateName}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => onNavigate('landing')}
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Return to IGHO Home
                </button>
                <button
                  onClick={() => onNavigate('hotel_directory')}
                  className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 px-6 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                >
                  Explore Live IGHO Stay
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full text-center text-[10px] text-neutral-600 py-4 border-t border-neutral-900">
        © {new Date().getFullYear()} IGHO Software Systems. One Platform, Multiple Possibilities. Powered by secure SaaS frameworks.
      </footer>
    </div>
  );
};
