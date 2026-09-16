import React from 'react';
import {
  ShieldCheck,
  Cloud,
  Headphones,
  Sparkles,
  Building2,
  GraduationCap,
  Cross,
  Zap,
  Lock,
  BarChart3,
  Smartphone,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Check,
} from 'lucide-react';
import { ActiveScreen, CustomerProfile } from '../types';
import { MacBookProDashboard } from './MacBookProDashboard';
import { HeaderNav } from './HeaderNav';

interface LandingPageProps {
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const partners = ['PALMVIEW', 'SOUTHSIDE', 'GRAND KUBA', 'ANGELIS', 'BAHAMAS', 'EAGLE EYE'];

  return (
    <div className="w-full bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Universal Top Navigation Header */}
      <HeaderNav
        onNavigate={onNavigate}
        activeScreen="landing"
        currentUserEmail={currentUserEmail}
        currentGuestProfile={currentGuestProfile}
        onSignOut={onSignOut}
        onEditProfile={onEditProfile}
      />

      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-8 sm:pt-14 pb-12 sm:pb-16 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-6 2xl:space-y-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-medium border border-neutral-200/70 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
              <span>All-in-One Management Software</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-extrabold tracking-tight text-black leading-[1.06]">
              Powerful Software.
              <br />
              Smarter Operations.
            </h1>

            <p className="text-neutral-600 text-base sm:text-lg 2xl:text-xl leading-relaxed max-w-lg 2xl:max-w-xl">
              IGHO builds modern, secure, and easy-to-use software that helps hotels, schools, and
              businesses streamline operations and grow with confidence.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('hotel_directory')}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>Explore Products</span>
              </button>

              <button
                onClick={() => onNavigate('demo_request')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 border border-neutral-200/80 cursor-pointer"
              >
                Book a Demo
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-100 text-xs 2xl:text-sm text-neutral-600 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Secure & Reliable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Cloud Based</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Easy to Use</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: MacBook Pro Mockup Displaying IGHO Stay */}
          <div className="lg:col-span-6 relative flex justify-center items-center w-full">
            <MacBookProDashboard onNavigate={onNavigate} />
          </div>
        </div>
      </section>

      {/* Trusted Organizations Logo Strip */}
      <section className="border-y border-neutral-100 bg-neutral-50/70 py-6 px-4">
        <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto text-center space-y-3">
          <p className="text-[11px] 2xl:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Trusted by forward-thinking organizations
          </p>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-4 sm:gap-10 xl:gap-14 max-w-3xl mx-auto">
            {partners.map((p) => (
              <span
                key={p}
                className="text-xs sm:text-sm 2xl:text-base font-black tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer text-center"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Our Products Section */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-black tracking-tight">Our Products</h2>
          <p className="text-neutral-500 text-sm sm:text-base 2xl:text-lg">Powerful solutions built for different industries.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
          {/* Card 1: IGHO Stay */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 xl:p-8 flex flex-col justify-between hover:shadow-lg transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] 2xl:text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
              <h3 className="text-xl 2xl:text-2xl font-bold text-black">IGHO Stay</h3>
              <p className="text-sm 2xl:text-base text-neutral-600 leading-relaxed">
                Complete hotel management solution for reservations, housekeeping, guests, folios, billing and your own public booking portal.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => onNavigate('hotel_directory')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white py-2.5 px-4 rounded-full text-xs 2xl:text-sm font-semibold hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <span>Find Hotels</span>
              </button>
              <button
                onClick={() => onNavigate('hotel_onboarding')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-100 text-neutral-800 border border-neutral-200 py-2.5 px-4 rounded-full text-xs 2xl:text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
              >
                <span>Join IGHO Stay</span>
              </button>
            </div>
          </div>

          {/* Card 2: IGHO Classroom */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 xl:p-8 flex flex-col justify-between hover:shadow-lg transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] 2xl:text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                  Launch: Q3 2027
                </span>
              </div>
              <div>
                <h3 className="text-xl 2xl:text-2xl font-bold text-black">IGHO Classroom</h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600">
                  Expected Launch: Q3 2027
                </span>
              </div>
              <p className="text-sm 2xl:text-base text-neutral-600 leading-relaxed">
                School management platform for student records, fees, attendance, examinations and communication.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                <span>Release Roadmap:</span>
                <span className="text-neutral-900 font-bold">Q3 2027</span>
              </div>
              <button
                onClick={() => onNavigate('classroom_waitlist')}
                className="w-full flex items-center justify-center gap-2 bg-white text-black border border-neutral-300 py-2.5 px-4 rounded-full text-xs 2xl:text-sm font-semibold hover:bg-neutral-50 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>Join Waitlist for Q3 2027</span>
              </button>
            </div>
          </div>

          {/* Card 3: IGHO MedBay */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 xl:p-8 flex flex-col justify-between hover:shadow-lg transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-sm">
                  <Cross className="w-6 h-6" />
                </div>
                <span className="text-[10px] 2xl:text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                  Launch: Q1 2028
                </span>
              </div>
              <div>
                <h3 className="text-xl 2xl:text-2xl font-bold text-black">IGHO MedBay</h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-rose-600">
                  Expected Launch: Q1 2028
                </span>
              </div>
              <p className="text-sm 2xl:text-base text-neutral-600 leading-relaxed">
                Hospital management system for patient records, admissions, wards, appointments, billing and reporting.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                <span>Release Roadmap:</span>
                <span className="text-neutral-900 font-bold">Q1 2028</span>
              </div>
              <button
                onClick={() => onNavigate('medbay_waitlist')}
                className="w-full flex items-center justify-center gap-2 bg-white text-black border border-neutral-300 py-2.5 px-4 rounded-full text-xs 2xl:text-sm font-semibold hover:bg-neutral-50 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>Join Waitlist for Q1 2028</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose IGHO? Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-neutral-50 border-t border-neutral-200/80">
        <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-black tracking-tight">Why Choose IGHO?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 xl:gap-6">
            <div className="bg-white p-5 sm:p-6 2xl:p-8 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base 2xl:text-lg text-black">Fast Deployment</h4>
              <p className="text-xs sm:text-sm 2xl:text-base text-neutral-600">
                Get started in days, not weeks. We make onboarding easy.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 2xl:p-8 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base 2xl:text-lg text-black">Secure & Compliant</h4>
              <p className="text-xs sm:text-sm 2xl:text-base text-neutral-600">
                Your data is protected with enterprise-grade security.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 2xl:p-8 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base 2xl:text-lg text-black">Powerful Analytics</h4>
              <p className="text-xs sm:text-sm 2xl:text-base text-neutral-600">
                Make smarter decisions with real-time insights and reports.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 2xl:p-8 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base 2xl:text-lg text-black">Access Anywhere</h4>
              <p className="text-xs sm:text-sm 2xl:text-base text-neutral-600">
                Stay updated on any desktop, tablet, or mobile device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DEDICATED HOTEL REGISTRATION SECTION: Join IGHO Stay (Requirement 6) */}
      <section id="join-igho-stay" className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-10 2xl:p-12 border border-neutral-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 2xl:gap-12 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-700">
              <Building2 className="w-3.5 h-3.5 text-white" />
              <span>For Hotel Owners & Operators</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Join IGHO Stay. Put your hotel on the modern hospitality map.
            </h3>

            <p className="text-xs sm:text-sm 2xl:text-base text-neutral-300 leading-relaxed max-w-xl 2xl:max-w-2xl">
              From front desk room reservations and guest deposits to housekeeping rosters, staff permissions, and direct public bookings — IGHO Stay replaces outdated paper logs and disjointed software.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs 2xl:text-sm text-neutral-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dedicated hotel booking URL & profile</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Staff roles & granular permission overrides</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-branch hotel operations support</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct customer bookings with zero commission</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('hotel_onboarding')}
                className="bg-white text-black px-7 py-3 rounded-full text-xs sm:text-sm font-bold hover:bg-neutral-200 transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Register Your Hotel (Join IGHO Stay)</span>
              </button>
              <button
                onClick={() => onNavigate('demo_request')}
                className="bg-neutral-800 text-neutral-200 border border-neutral-700 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold hover:bg-neutral-700 transition-all cursor-pointer"
              >
                Schedule Walkthrough
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-black/60 rounded-2xl border border-neutral-800 p-5 sm:p-6 2xl:p-8 space-y-4">
            <div className="text-xs 2xl:text-sm font-bold text-neutral-400 uppercase tracking-wider">
              Hotel Onboarding Process
            </div>

            <div className="space-y-3 text-xs 2xl:text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <div className="font-bold text-white">Create IGHO Account</div>
                  <div className="text-neutral-400 text-[11px] 2xl:text-xs">Global identity for your hotel ownership.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <div className="font-bold text-white">Submit Hotel Credentials</div>
                  <div className="text-neutral-400 text-[11px] 2xl:text-xs">CAC, address, rooms, and contact details.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <div className="font-bold text-white">IGHO Trust & Safety Vetting</div>
                  <div className="text-neutral-400 text-[11px] 2xl:text-xs">Approved hotels activate instant discovery & booking.</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 text-[11px] 2xl:text-xs text-neutral-400">
              Approved hotels become immediately discoverable across the IGHO hotel directory.
            </div>
          </div>
        </div>
      </section>

      {/* Dark Traction Banner */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="bg-black text-white rounded-2xl p-6 sm:p-10 2xl:p-12 relative overflow-hidden shadow-2xl space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <span>🔗 Join the IGHO network</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Join hundreds of hotels and schools already enjoying IGHO
            </h3>
            <p className="text-neutral-400 text-xs sm:text-sm 2xl:text-base max-w-lg mx-auto">
              Set up your organisation in minutes — get your own dashboard, your team, your rooms and your public page,
              all managed in one place.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => onNavigate('setup_selector')}
                className="bg-white text-black px-6 py-3 rounded-full text-xs font-bold hover:bg-neutral-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Join IGHO</span>
              </button>
              <button
                onClick={() => onNavigate('demo_request')}
                className="bg-neutral-900 text-neutral-200 border border-neutral-700 px-6 py-3 rounded-full text-xs font-semibold hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer"
              >
                Talk to us first
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-neutral-800 text-center">
            <div>
              <div className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white">300+</div>
              <div className="text-[11px] 2xl:text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">
                Hotels & Schools Onboarded
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white">120K+</div>
              <div className="text-[11px] 2xl:text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">
                Guests & Students Managed
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-white">99.9%</div>
              <div className="text-[11px] 2xl:text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">
                Uptime Across Our Platform
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Banner */}
      <section className="px-4 sm:px-6 py-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="bg-neutral-50 rounded-2xl p-6 sm:p-8 2xl:p-10 border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] 2xl:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              LET'S WORK TOGETHER
            </span>
            <h4 className="text-lg sm:text-xl 2xl:text-2xl font-bold text-black">Ready to modernize your operations?</h4>
            <p className="text-xs sm:text-sm 2xl:text-base text-neutral-600">
              Talk to our team and see how IGHO can transform your business.
            </p>
          </div>
          <button
            onClick={() => onNavigate('demo_request')}
            className="shrink-0 bg-black text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Request a Free Demo</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-neutral-400 text-xs pt-12 pb-8 px-4 sm:px-6 border-t border-neutral-800">
        <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-800">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white text-black font-black rounded flex items-center justify-center text-xs">
                I
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">IGHO</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Building smart software that helps organisations operate better and grow faster.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-xs">Products</div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('hotel_directory')} className="hover:text-white">
                  IGHO Stay
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('classroom_waitlist')} className="hover:text-white">
                  IGHO Classroom
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('medbay_waitlist')} className="hover:text-white">
                  IGHO MedBay
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-xs">Company</div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('demo_request')} className="hover:text-white">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('demo_request')} className="hover:text-white">
                  Book a Demo
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('demo_request')} className="hover:text-white">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-xs">Contact</div>
            <ul className="space-y-1.5 text-[11px] text-neutral-400">
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                <span>hello@igho.software</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                <span>+234 (0) 803 000 0000</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                <span>Asaba, Delta State, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <div>© {new Date().getFullYear()} IGHO Software Systems. All rights reserved.</div>
          <div className="flex flex-wrap gap-4 items-center">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Enterprise Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
