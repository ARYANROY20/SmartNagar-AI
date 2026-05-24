import React from 'react';
import { Activity, ArrowLeft, ArrowRight, Camera, Landmark, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const heroImage = import.meta.env.VITE_INTRO_HERO_IMAGE;

export default function Intro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] antialiased overflow-x-hidden relative">
      <main className="min-h-screen flex flex-col items-center justify-start max-w-[420px] mx-auto bg-[var(--bg-card)] relative">
        <header className="relative w-full h-[397px] overflow-hidden">
          <div className="absolute inset-0 bg-[#004ac6]/10">
            {heroImage && (
              <img
                alt="SmartNagar city"
                className="w-full h-full object-cover mix-blend-overlay opacity-60"
                src={heroImage}
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="bg-[#004ac6] p-4 rounded-xl shadow-lg mb-4">
              <Landmark className="w-12 h-12 text-white" fill="currentColor" />
            </div>
            <h1 className="text-[30px] leading-[1.2] font-bold text-[var(--text-primary)] mb-1 tracking-tight">SmartNagar AI</h1>
            <p className="text-[14px] leading-[1.4] font-semibold text-[#004ac6] tracking-widest">EMPOWERING SMARTER CITIES THROUGH AI</p>
          </div>
        </header>

        <section className="w-full px-6 -mt-8 relative z-10">
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
            <p className="text-[16px] leading-relaxed text-[var(--text-secondary)] text-center">
              The unified platform connecting citizens and administrators to solve urban issues faster through intelligent automation and real-time data insights.
            </p>
          </div>
        </section>

        <section className="w-full px-6 mt-8 grid grid-cols-1 gap-4">
          <FeatureCard
            icon={<Camera className="w-7 h-7" />}
            iconClassName="bg-[#004ac6]/10 text-[#004ac6]"
            title="Easy Reporting"
            description="Capture and report civic issues in seconds."
          />
          <FeatureCard
            icon={<Sparkles className="w-7 h-7" />}
            iconClassName="bg-[#006e2d]/10 text-[#006e2d]"
            title="AI-Powered Insights"
            description="Intelligent categorization and priority routing."
          />
          <FeatureCard
            icon={<Activity className="w-7 h-7" />}
            iconClassName="bg-[#996100]/20 text-[#784b00]"
            title="Real-time Tracking"
            description="Live updates on every step of the resolution."
          />
        </section>

        <footer className="w-full p-6 mt-auto mb-8">
          <button
            onClick={() => navigate('/app')}
            className="w-full bg-[#2563eb] text-[#eeefff] h-14 rounded-xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#1d4ed8]"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-center text-[12px] leading-[1.4] text-[var(--text-secondary)]">
            By continuing, you agree to our <button onClick={() => navigate('/terms')} className="text-[#004ac6] font-medium underline underline-offset-4">Terms of Service</button>.
          </p>
        </footer>
      </main>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#004ac6]/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
    </div>
  );
}

export function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] antialiased overflow-x-hidden">
      <main className="min-h-screen max-w-[420px] mx-auto bg-[var(--bg-card)] px-6 py-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#004ac6] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6">
          <div className="w-12 h-12 bg-[#004ac6] text-white rounded-xl flex items-center justify-center shadow-lg mb-4">
            <Landmark className="w-7 h-7" />
          </div>
          <h1 className="text-[30px] leading-[1.2] font-bold tracking-tight">Terms of Service</h1>
          <p className="text-[14px] leading-[1.5] text-[var(--text-secondary)] mt-2">SmartNagar AI civic reporting platform</p>
        </div>

        <div className="space-y-4 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
          <TermsSection title="1. Purpose">
            SmartNagar AI helps citizens report civic issues and helps administrators review, assign, and monitor resolution work. The platform is intended for genuine civic reporting and public-service coordination.
          </TermsSection>
          <TermsSection title="2. Responsible Use">
            Users must submit accurate reports, avoid false or abusive complaints, and only upload images related to the reported civic issue. Reports may be reviewed, categorized, prioritized, assigned, or rejected by administrators.
          </TermsSection>
          <TermsSection title="3. Location and Image Data">
            When you submit a report, the app may use your selected or device-provided location and uploaded image to identify the issue and route it to the right department. You can edit the displayed place name before submission.
          </TermsSection>
          <TermsSection title="4. AI Assistance">
            AI may suggest an issue title, category, priority, and department. These suggestions are assistive and may be edited or corrected by users or administrators.
          </TermsSection>
          <TermsSection title="5. Account and Admin Access">
            Citizen accounts are used to verify submissions and send status updates. Admin access is restricted and requires authorization from the project owner or authorized civic authority.
          </TermsSection>
          <TermsSection title="6. Notifications">
            You may receive updates when your report is assigned, scheduled, in progress, resolved, or otherwise changed by administrators.
          </TermsSection>
          <TermsSection title="7. Limitations">
            SmartNagar AI does not guarantee immediate resolution of reported issues. Response time depends on administrator review, department capacity, and local civic processes.
          </TermsSection>
          <TermsSection title="8. Privacy and Safety">
            Do not upload sensitive personal information, private documents, or unrelated images. Uploaded report data is used for complaint handling, analytics, and service improvement.
          </TermsSection>
        </div>

        <button
          onClick={() => navigate('/app')}
          className="w-full mt-8 bg-[#2563eb] text-[#eeefff] h-14 rounded-xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#1d4ed8]"
        >
          I Agree, Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </main>
    </div>
  );
}

function TermsSection({ title, children }) {
  return (
    <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm p-4">
      <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">{title}</h2>
      <p>{children}</p>
    </section>
  );
}

function FeatureCard({ icon, iconClassName, title, description }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <div className={`w-12 h-12 flex items-center justify-center rounded-lg shrink-0 ${iconClassName}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] text-[18px] leading-[1.3]">{title}</h3>
        <p className="text-[12px] leading-[1.4] text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}
