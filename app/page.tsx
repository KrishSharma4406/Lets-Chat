'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Shield, Zap, Lock, Smartphone, Github, Video } from 'lucide-react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden selection:text-white scroll-smooth" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', '--tw-selection-background-color': 'var(--brand-primary)' } as React.CSSProperties}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300" style={{ backgroundColor: 'rgba(var(--bg-surface-rgb, 255, 255, 255), 0.7)', borderColor: 'var(--border)' } as React.CSSProperties}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            
            <span className="font-bold text-xl tracking-tight">Let&apos;s Chat</span>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/chat"
                className="px-5 py-2 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
              >
                Go to Chat <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="hidden sm:block px-4 py-2 font-medium transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="px-5 py-2 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
                >
                  Get Started <ArrowRight size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[600px] pointer-events-none opacity-20 dark:opacity-10">
          <><div className="absolute top-0 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ background: 'var(--brand-primary)' }}></div><div className="absolute top-0 -left-4 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ background: 'var(--brand-secondary)' }}></div><div className="absolute -bottom-8 left-20 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" style={{ background: 'var(--brand-teal)' }}></div><style>{`
            @keyframes blob {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
              animation: blob 7s infinite;
            }
            .animation-delay-2000 {
              animation-delay: 2s;
            }
            .animation-delay-4000 {
              animation-delay: 4s;
            }
          `}</style></>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-8 border shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--brand-primary)', borderColor: 'var(--border)' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--brand-primary)' }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--brand-primary)' }}></span>
            </span>
            v1.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Connect seamlessly. <br />
            <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(135deg, var(--brand-primary), var(--brand-teal))', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
              Chat beautifully.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl mb-10" style={{ color: 'var(--text-secondary)' }}>
            Experience real-time messaging redefined. Secure, fast, and packed with features you need to stay connected with anyone, anywhere.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={session ? "/chat" : "/auth"}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              <MessageSquare size={22} />
              Start Chatting Now
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg transition-all border flex items-center justify-center gap-2 hover:bg-opacity-50"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Floating App Mockup (Visual only) */}
        <div className="max-w-5xl mx-auto mt-20 px-6 relative z-10 perspective-1000">
          <div 
            className="rounded-2xl overflow-hidden border shadow-2xl transition-transform duration-700 hover:scale-[1.02]"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg), 0 20px 40px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex h-12 items-center px-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
            </div>
            <div className="flex h-[400px] md:h-[600px] opacity-90 grayscale-[10%] select-none">
              <div className="w-1/3 border-r p-4 hidden md:block" style={{ borderColor: 'var(--border)' }}>
                <div className="h-4 w-1/2 rounded mb-6" style={{ background: 'var(--border)' }}></div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-4 mb-6 items-center">
                    <div className="w-12 h-12 rounded-full" style={{ background: 'var(--border)' }}></div>
                    <div className="flex-1">
                      <div className="h-3 w-1/3 rounded mb-2" style={{ background: 'var(--border)' }}></div>
                      <div className="h-2 w-3/4 rounded" style={{ background: 'var(--bg-base)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-1 flex flex-col justify-end p-6 relative" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundColor: 'var(--bg-chat)' }}>
                <div className="self-start max-w-[70%] p-4 rounded-2xl rounded-tl-none mb-4 shadow-sm" style={{ background: 'var(--bg-bubble-in)', color: 'var(--text-primary)' }}>
                  Hey! Are we still on for the meeting today?
                </div>
                <div className="self-end max-w-[70%] p-4 rounded-2xl rounded-tr-none mb-4 shadow-sm" style={{ background: 'var(--bg-bubble-out)', color: 'var(--text-primary)' }}>
                  Yes! I&apos;ll send you the video link in a minute.
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-12 flex-1 rounded-full opacity-50" style={{ background: 'var(--bg-input)' }}></div>
                  <div className="w-12 h-12 rounded-full opacity-80" style={{ background: 'var(--brand-primary)' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Designed to provide a fast, reliable, and secure communication experience for individuals and teams alike.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-amber-500" size={28} />}
              title="Real-time Speed"
              desc="Messages are delivered instantly. Typing indicators and read receipts keep the conversation flowing smoothly."
            />
            <FeatureCard 
              icon={<Lock className="text-blue-500" size={28} />}
              title="Secure & Private"
              desc="End-to-end encryption ensures that your personal messages and calls stay strictly between you."
            />
            <FeatureCard 
              icon={<Video className="text-purple-500" size={28} />}
              title="High-Def Calls"
              desc="Seamlessly switch from voice to high-definition video calls with just a single tap, completely free."
            />
            <FeatureCard 
              icon={<Shield className="text-green-500" size={28} />}
              title="Advanced Moderation"
              desc="Robust tools to manage groups, block unwanted users, and report suspicious activities instantly."
            />
            <FeatureCard 
              icon={<Smartphone className="text-rose-500" size={28} />}
              title="Cross-Platform"
              desc="Keep your chats synced across all your devices. Start on your phone and finish on your desktop."
            />
            <FeatureCard 
              icon={<MessageSquare className="text-indigo-500" size={28} />}
              title="Rich Media"
              desc="Send photos, documents, voice notes, and more. Express yourself completely without limits."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at center, var(--brand-primary) 0%, transparent 60%)' }}></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to jump in?</h2>
          <p className="text-xl mb-10" style={{ color: 'var(--text-secondary)' }}>
            Join users worldwide and upgrade your chatting experience today. It takes less than a minute to get started.
          </p>
          <Link
             href={session ? "/chat" : "/auth"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-teal))' }}
          >
            Create Your Free Account <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight">Let&apos;s Chat</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            © {new Date().getFullYear()} Let&apos;s Chat. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
              <Github size={20} />
            </a>
            <a href="#" className="text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>Privacy</a>
            <a href="#" className="text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div 
      className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--bg-base)' }}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">
        {desc}
      </p>
    </div>
  )
}
